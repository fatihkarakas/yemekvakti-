using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>Aday listesi (çark için) ve akıllı öneri üretimi.</summary>
public class RecommendationService(AppDbContext db, PlacesService places, GeminiService gemini, IConfiguration config, IWebHostEnvironment env)
{
    public async Task<List<CandidateDto>> GetCandidatesAsync(int userId, CandidateQuery q, CancellationToken ct)
    {
        // Varsayılan 5 km (5000 metre) yarıçap
        q.Radius = q.Radius <= 0 ? 5000 : Math.Clamp(q.Radius, 500, 25000);
        var nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);

        // Sanayi lezzetleri özel filtresi
        if (q.SanayiOnly)
        {
            q.Radius = Math.Max(q.Radius, 8500);
            nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);
            if (nearby.Count(IsSanayiVenue) < 8)
            {
                await DemoSeeder.SeedAroundAsync(db, q.Lat, q.Lng, ct);
                nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);
            }
        }
        else
        {
            var hasBuyukIl = nearby.Any(r => r.GooglePlaceId != null && r.GooglePlaceId.StartsWith("buyukil_"));
            if (nearby.Count < 18 || !hasBuyukIl)
            {
                await DemoSeeder.SeedAroundAsync(db, q.Lat, q.Lng, ct);
                nearby = await places.GetNearbyAsync(q.Lat, q.Lng, Math.Max(q.Radius, 5000), ct);
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
            .Where(r => !q.SanayiOnly || IsSanayiVenue(r))
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
                var isSanayi = IsSanayiVenue(r);
                var isBuyukIl = r.GooglePlaceId != null && r.GooglePlaceId.StartsWith("buyukil_");

                // Yıldız kısıtlaması kaldırıldı; mesafe, büyük il ve tercihlere göre dengeli puanlama
                var baseScore = (r.GoogleRating ?? 4.0) / 5.0 * 2.2
                                + (my.HasValue ? (my.Value - 3) * 0.8 : 0)
                                + (fav ? 1.2 : 0)
                                + (isSanayi ? 0.6 : 0)
                                + (isBuyukIl ? 1.0 : 0)
                                + (rv.Count == 0 ? 0.5 : 0)
                                - dist / (q.Radius * 1.5);
                var randomBonus = rnd.NextDouble() * 2.0;
                var score = baseScore + randomBonus;

                var priceTl = EstimatePriceTl(r);

                return new CandidateDto(r.Id, r.Name, r.Address, r.Lat, r.Lng, (int)dist,
                    CuisineCatalog.Split(r.Cuisines), CuisineCatalog.Labels(r.Cuisines),
                    MealCardCatalog.Split(r.MealCards), MealCardCatalog.Labels(r.MealCards),
                    r.PriceLevel, priceTl,
                    r.GoogleRating, r.GoogleRatingCount, my, rv.Count, last?.VisitedAt,
                    rv.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v.Note))?.Note,
                    fav, r.MapsUrl ?? $"https://www.google.com/maps/search/?api=1&query={r.Lat},{r.Lng}",
                    Math.Round(score, 3),
                    isSanayi);
            })
            .OrderByDescending(c => c.Score)
            .Take(Math.Clamp(q.Limit, 10, 20))
            .ToList();

        return all;
    }

    public static bool IsSanayiVenue(Restaurant r)
    {
        var text = (r.Name + " " + (r.Address ?? "") + " " + (r.Cuisines ?? "")).ToLower(new System.Globalization.CultureInfo("tr-TR"));
        return text.Contains("sanayi") || text.Contains("ostim") || text.Contains("şaşmaz") || text.Contains("sasmaz") ||
               text.Contains("ivedik") || text.Contains("siteler") || text.Contains("gersan") || text.Contains("osb") ||
               text.Contains("tamirhane") || text.Contains("oto sanayi") || text.Contains("marangozlar") || text.Contains("demirhendek") ||
               text.Contains("gimat") || text.Contains("macun");
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

        // Toplam 10-15 restoran: 1 seçilen mekan + en iyi 14 alternatif
        return new SuggestionResponse(chosen, reason, pick is not null, log.Id, candidates.Where(c => c.Id != chosen.Id).Take(14).ToList());
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
