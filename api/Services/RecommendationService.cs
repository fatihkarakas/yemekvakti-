using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>Aday listesi (çark için) ve akıllı öneri üretimi.</summary>
public class RecommendationService(AppDbContext db, PlacesService places, GeminiService gemini, IConfiguration config, IWebHostEnvironment env)
{
    public async Task<List<CandidateDto>> GetCandidatesAsync(int userId, CandidateQuery q, CancellationToken ct)
    {
        q.Radius = Math.Clamp(q.Radius, 200, 5000);
        var nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);

        if (nearby.Count == 0 && !places.Enabled && env.IsDevelopment() && config.GetValue<bool>("SeedDemoRestaurants"))
        {
            await DemoSeeder.SeedAroundAsync(db, q.Lat, q.Lng, ct);
            nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);
        }

        var ids = nearby.Select(r => r.Id).ToList();
        var visits = await db.Visits.Where(v => v.UserId == userId && ids.Contains(v.RestaurantId))
            .Select(v => new { v.RestaurantId, v.VisitedAt, v.Stars, v.Note })
            .ToListAsync(ct);
        var prefs = await db.Preferences.Where(p => p.UserId == userId && ids.Contains(p.RestaurantId))
            .ToDictionaryAsync(p => p.RestaurantId, p => p.Type, ct);

        var wanted = (q.Cuisines ?? []).Where(CuisineCatalog.Codes.Contains).ToHashSet();
        var exclude = (q.ExcludeIds ?? []).ToHashSet();
        var avoidSince = DateTime.UtcNow.Date.AddDays(-q.AvoidDays);
        var rnd = Random.Shared;

        var all = nearby
            .Where(r => !exclude.Contains(r.Id))
            .Where(r => !prefs.TryGetValue(r.Id, out var t) || t != PreferenceType.Blacklist)
            .Where(r => wanted.Count == 0 || CuisineCatalog.Split(r.Cuisines).Any(wanted.Contains))
            .Where(r => q.MaxPrice is null || r.PriceLevel is null || r.PriceLevel <= q.MaxPrice)
            .Select(r =>
            {
                var rv = visits.Where(v => v.RestaurantId == r.Id).OrderByDescending(v => v.VisitedAt).ToList();
                var rated = rv.Where(v => v.Stars.HasValue).ToList();
                double? my = rated.Count > 0 ? Math.Round(rated.Average(v => v.Stars!.Value), 1) : null;
                var dist = Geo.DistanceMeters(q.Lat, q.Lng, r.Lat, r.Lng);
                var fav = prefs.TryGetValue(r.Id, out var pt) && pt == PreferenceType.Favorite;
                var last = rv.FirstOrDefault();
                var recent = last is not null && last.VisitedAt >= avoidSince;

                var score = (r.GoogleRating ?? 3.8) / 5.0 * 2.0
                            + (my.HasValue ? (my.Value - 3) * 0.6 : 0)
                            + (fav ? 0.8 : 0)
                            + (rv.Count == 0 ? 0.25 : 0)
                            - dist / q.Radius
                            - (recent ? 2.5 : 0)
                            + rnd.NextDouble() * 0.5;

                return new CandidateDto(r.Id, r.Name, r.Address, r.Lat, r.Lng, (int)dist,
                    CuisineCatalog.Split(r.Cuisines), CuisineCatalog.Labels(r.Cuisines), r.PriceLevel,
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
}
