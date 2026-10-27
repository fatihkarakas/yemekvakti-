using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>Aday listesi (çark için) ve akıllı öneri üretimi.</summary>
public class RecommendationService(AppDbContext db, PlacesService places, GeminiService gemini, IConfiguration config, IWebHostEnvironment env)
{
    public async Task<List<CandidateDto>> GetCandidatesAsync(int userId, CandidateQuery q, CancellationToken ct)
    {
        q.Radius = Math.Clamp(q.Radius, 200, 20000);
        var nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);

        if (!places.Enabled || config.GetValue<bool>("SeedDemoRestaurants", false))
        {
            var totalCount = await db.Restaurants.CountAsync(ct);
            var needsSeed = await db.Restaurants.AnyAsync(r => r.MealCards == null, ct);
            if (needsSeed || totalCount < 50 || nearby.Count < 6)
            {
                await DemoSeeder.SeedAroundAsync(db, q.Lat, q.Lng, ct);
                nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);
            }
        }

        var ids = nearby.Select(r => r.Id).ToList();
        var visits = await db.Visits.Where(v => v.UserId == userId && ids.Contains(v.RestaurantId))
            .Select(v => new { v.RestaurantId, v.VisitedAt, v.Stars, v.Note })
            .ToListAsync(ct);
        var prefs = await db.Preferences.Where(p => p.UserId == userId && ids.Contains(p.RestaurantId))
            .ToDictionaryAsync(p => p.RestaurantId, p => p.Type, ct);

        var wanted = (q.Cuisines ?? []).Where(CuisineCatalog.Codes.Contains).ToHashSet();
        var wantedCards = (q.MealCards ?? []).Where(MealCardCatalog.Codes.Contains).ToHashSet();
        var exclude = (q.ExcludeIds ?? []).ToHashSet();
        var avoidSince = DateTime.UtcNow.Date.AddDays(-q.AvoidDays);
        var rnd = Random.Shared;

        var all = nearby
            .GroupBy(r => r.Name.Trim().ToLowerInvariant())
            .Select(g => g.First())
            .Where(r => !exclude.Contains(r.Id))
            .Where(r => !prefs.TryGetValue(r.Id, out var t) || t != PreferenceType.Blacklist)
            .Where(r => wanted.Count == 0 || CuisineCatalog.Split(r.Cuisines).Any(wanted.Contains))
            .Where(r => wantedCards.Count == 0 || MealCardCatalog.Split(r.MealCards).Any(wantedCards.Contains))
            .Where(r =>
            {
                var est = EstimatePriceTl(r);
                if (q.MinPriceTl.HasValue && est < q.MinPriceTl.Value) return false;
                if (q.MaxPriceTl.HasValue && est > q.MaxPriceTl.Value) return false;
                if (q.MaxPrice.HasValue && r.PriceLevel.HasValue && r.PriceLevel > q.MaxPrice.Value) return false;
                return true;
            })
            .Select(r =>
            {
                var rv = visits.Where(v => v.RestaurantId == r.Id).OrderByDescending(v => v.VisitedAt).ToList();
                var rated = rv.Where(v => v.Stars.HasValue).ToList();
                double? my = rated.Count > 0 ? Math.Round(rated.Average(v => v.Stars!.Value), 1) : null;
                var dist = Geo.DistanceMeters(q.Lat, q.Lng, r.Lat, r.Lng);
                var fav = prefs.TryGetValue(r.Id, out var pt) && pt == PreferenceType.Favorite;
                var last = rv.FirstOrDefault();
                var recent = last is not null && last.VisitedAt >= avoidSince;

                // Çeşitlilik ve canlılık için rastgelelik katsayısı
                var score = (r.GoogleRating ?? 3.8) / 5.0 * 2.0
                            + (my.HasValue ? (my.Value - 3) * 0.6 : 0)
                            + (fav ? 0.8 : 0)
                            + (rv.Count == 0 ? 0.4 : 0)
                            - dist / (q.Radius * 1.5)
                            - (recent ? 3.0 : 0)
                            + rnd.NextDouble() * 1.8;

                var priceTl = EstimatePriceTl(r);

                return new CandidateDto(r.Id, r.Name, r.Address, r.Lat, r.Lng, (int)dist,
                    CuisineCatalog.Split(r.Cuisines), CuisineCatalog.Labels(r.Cuisines),
                    MealCardCatalog.Split(r.MealCards), MealCardCatalog.Labels(r.MealCards),
                    r.PriceLevel, priceTl,
                    r.GoogleRating, r.GoogleRatingCount, my, rv.Count, last?.VisitedAt,
                    rv.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v.Note))?.Note,
                    fav, r.MapsUrl ?? $"https://www.google.com/maps/search/?api=1&query={r.Lat},{r.Lng}",
                    Math.Round(score, 3));
            })
            .OrderByDescending(c => c.Score)
            .Take(Math.Clamp(q.Limit, 2, 30))
            .ToList();

        return all;
    }

    public async Task<SuggestionResponse> SuggestAsync(int userId, string userName, CandidateQuery q, CancellationToken ct)
    {
        var candidates = await GetCandidatesAsync(userId, q, ct);
        if (candidates.Count == 0)
            return new SuggestionResponse(null, "Bu kriterlere uyan yer bulamadım 😕 Mesafeyi artırmayı ya da başka bir tarz seçmeyi dene.", false, null, []);

        var top = candidates.Take(5).ToList();
        var aiCandidates = top.Select((c, i) => new AiCandidate(i, c.Name, c.CuisineLabels, c.DistanceM, c.GoogleRating, c.MyRating,
            c.LastVisitAt is null ? null : (int)(DateTime.UtcNow - c.LastVisitAt.Value).TotalDays, c.LastNote)).ToList();

        var wantedLabels = CuisineCatalog.Labels(string.Join(',', q.Cuisines ?? []));
        var pick = await gemini.PickAsync(userName, aiCandidates, wantedLabels, ct);

        CandidateDto chosen;
        string reason;
        if (pick is not null)
        {
            chosen = top[pick.Index];
            reason = pick.Reason;
        }
        else
        {
            // İlk 3 arasından skor ağırlıklı rastgele seçim
            var pool = top.Take(3).ToList();
            var min = pool.Min(c => c.Score);
            var weights = pool.Select(c => c.Score - min + 0.3).ToList();
            var roll = Random.Shared.NextDouble() * weights.Sum();
            var idx = 0;
            for (; idx < pool.Count - 1 && (roll -= weights[idx]) > 0; idx++) { }
            chosen = pool[idx];
            reason = LocalReason(chosen);
        }

        var log = new SuggestionLog
        {
            UserId = userId,
            RestaurantId = chosen.Id,
            Source = "suggestion",
            SelectedCuisines = q.Cuisines is { Length: > 0 } ? string.Join(',', q.Cuisines) : null,
            Reason = reason.Length > 500 ? reason[..500] : reason
        };
        db.SuggestionLogs.Add(log);
        await db.SaveChangesAsync(ct);

        return new SuggestionResponse(chosen, reason, pick is not null, log.Id, candidates.Where(c => c.Id != chosen.Id).Take(7).ToList());
    }

    private static string LocalReason(CandidateDto c)
    {
        if (c.MyRating >= 4) return $"Geçen sefer {c.MyRating:0.#}⭐ vermiştin, tekrar gitme vakti! 😋";
        if (c.MyVisitCount == 0 && c.GoogleRating >= 4.3) return $"Hiç gitmedin ve Google'da {c.GoogleRating:0.0}⭐ — denemeye değer ✨";
        if (c.IsFavorite) return "Favorilerinden biri, yanılmazsın 💛";
        if (c.DistanceM < 400) return $"Sadece {c.DistanceM} m uzakta, yürüyerek 5 dakika 🚶";
        if (c.MyVisitCount == 0) return "Daha önce hiç gitmedin, bugün yeni bir şey dene 🎲";
        return $"{c.CuisineLabels} için iyi bir seçenek, {c.DistanceM} m mesafede 👍";
    }

    public static int EstimatePriceTl(Restaurant r)
    {
        if (r.AvgPriceTl.HasValue && r.AvgPriceTl > 0) return r.AvgPriceTl.Value;
        if (r.PriceLevel == 1) return 200;
        if (r.PriceLevel == 2) return 400;
        if (r.PriceLevel == 3) return 800;
        if (r.PriceLevel == 4) return 1500;

        var c = (r.Cuisines ?? "").ToLowerInvariant();
        if (c.Contains("kahvalti") || c.Contains("esnaf") || c.Contains("tost")) return 180;
        if (c.Contains("pide") || c.Contains("corba")) return 230;
        if (c.Contains("kebap") || c.Contains("burger") || c.Contains("pizza") || c.Contains("tavuk")) return 350;
        if (c.Contains("uzakdogu") || c.Contains("balik")) return 750;
        return 300;
    }
}
