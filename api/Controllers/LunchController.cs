using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;
using YemekVakti.Api.Services;

namespace YemekVakti.Api.Controllers;

[ApiController]
[Authorize]
[Route("api")]
public class LunchController(AppDbContext db, RecommendationService rec) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("cuisines")]
    public IEnumerable<CuisineDto> Cuisines() => CuisineCatalog.All.Select(c => new CuisineDto(c.Code, c.Label, c.Emoji));

    [AllowAnonymous]
    [HttpGet("meal-cards")]
    public IEnumerable<MealCardDto> MealCards() =>
        MealCardCatalog.All.Select(m => new MealCardDto(m.Code, m.Label, m.Color, m.Emoji));

    /// <summary>Çark için aday restoranlar.</summary>
    [HttpPost("candidates")]
    public Task<List<CandidateDto>> Candidates(CandidateQuery q, CancellationToken ct) =>
        rec.GetCandidatesAsync(User.UserId(), q, ct);

    /// <summary>Tek akıllı öneri (Gemini veya yerel skor).</summary>
    [HttpPost("suggest")]
    public Task<SuggestionResponse> Suggest(CandidateQuery q, CancellationToken ct) =>
        rec.SuggestAsync(User.UserId(), User.UserName(), q, ct);

    /// <summary>Kullanıcının elle restoran eklemesi (Places'te olmayan esnaf lokantaları vb.).</summary>
    [HttpPost("restaurants")]
    public async Task<ActionResult<int>> AddRestaurant(CreateRestaurantRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest("Ad zorunlu.");
        var r = new Restaurant
        {
            Name = req.Name.Trim(),
            Lat = req.Lat,
            Lng = req.Lng,
            Address = req.Address,
            PriceLevel = req.PriceLevel is >= 1 and <= 4 ? req.PriceLevel : null,
            AvgPriceTl = req.PriceTl,
            Cuisines = string.Join(',', (req.Cuisines ?? []).Where(CuisineCatalog.Codes.Contains)),
            MealCards = string.Join(',', (req.MealCards ?? []).Where(MealCardCatalog.Codes.Contains)),
            CreatedByUserId = User.UserId(),
            GoogleRating = 4.6,
            GoogleRatingCount = 10,
            MapsUrl = $"https://www.google.com/maps/search/?api=1&query={req.Lat},{req.Lng}"
        };
        db.Restaurants.Add(r);
        await db.SaveChangesAsync();
        return r.Id;
    }

    // ---------- Geçmiş ----------

    [HttpPost("visits")]
    public async Task<ActionResult<VisitDto>> CreateVisit(CreateVisitRequest req)
    {
        var userId = User.UserId();
        var r = await db.Restaurants.FindAsync(req.RestaurantId);
        if (r is null) return NotFound("Restoran bulunamadı.");

        var visit = new Visit
        {
            UserId = userId,
            RestaurantId = r.Id,
            Source = req.Source is "wheel" or "manual" ? req.Source : "suggestion",
            VisitedAt = req.VisitedAt?.ToUniversalTime() ?? DateTime.UtcNow
        };
        db.Visits.Add(visit);

        if (req.SuggestionLogId is int logId)
        {
            var log = await db.SuggestionLogs.FirstOrDefaultAsync(l => l.Id == logId && l.UserId == userId);
            if (log is not null) log.Accepted = true;
        }
        else
        {
            db.SuggestionLogs.Add(new SuggestionLog { UserId = userId, RestaurantId = r.Id, Source = visit.Source, Accepted = true });
        }

        await db.SaveChangesAsync();
        visit.Restaurant = r;
        return ToDto(visit);
    }

    [HttpGet("visits")]
    public async Task<List<VisitDto>> GetVisits([FromQuery] int take = 100)
    {
        var userId = User.UserId();
        var list = await db.Visits.Include(v => v.Restaurant)
            .Where(v => v.UserId == userId)
            .OrderByDescending(v => v.VisitedAt)
            .Take(Math.Clamp(take, 1, 500))
            .ToListAsync();
        return list.Select(ToDto).ToList();
    }

    [HttpGet("visits/stats")]
    public async Task<HistoryStatsDto> Stats()
    {
        var userId = User.UserId();
        var visits = await db.Visits.Include(v => v.Restaurant).Where(v => v.UserId == userId).ToListAsync();
        var top = visits.GroupBy(v => v.Restaurant!.Name).OrderByDescending(g => g.Count()).FirstOrDefault();
        var rated = visits.Where(v => v.Stars.HasValue).ToList();
        return new HistoryStatsDto(visits.Count, visits.Count - rated.Count,
            rated.Count > 0 ? Math.Round(rated.Average(v => v.Stars!.Value), 1) : null,
            top?.Key, top?.Count() ?? 0);
    }

    /// <summary>Geçmişteki bir ziyarete puan ve not ver / güncelle.</summary>
    [HttpPut("visits/{id:int}")]
    public async Task<ActionResult<VisitDto>> Rate(int id, RateVisitRequest req)
    {
        var visit = await db.Visits.Include(v => v.Restaurant).FirstOrDefaultAsync(v => v.Id == id && v.UserId == User.UserId());
        if (visit is null) return NotFound();
        if (req.Stars is < 1 or > 5) return BadRequest("Puan 1-5 arası olmalı.");

        visit.Stars = req.Stars;
        visit.Note = string.IsNullOrWhiteSpace(req.Note) ? null : req.Note.Trim()[..Math.Min(req.Note.Trim().Length, 1000)];
        visit.RatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(visit);
    }

    [HttpDelete("visits/{id:int}")]
    public async Task<IActionResult> DeleteVisit(int id)
    {
        var visit = await db.Visits.FirstOrDefaultAsync(v => v.Id == id && v.UserId == User.UserId());
        if (visit is null) return NotFound();
        db.Visits.Remove(visit);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ---------- Favori / Kara liste ----------

    [HttpGet("preferences")]
    public async Task<List<PreferenceDto>> GetPreferences()
    {
        var userId = User.UserId();
        var list = await db.Preferences.Include(p => p.Restaurant)
            .Where(p => p.UserId == userId && p.Restaurant != null)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return list.Select(p => new PreferenceDto(
            p.RestaurantId,
            p.Restaurant!.Name,
            p.Type,
            p.Weight <= 0 ? 1 : p.Weight,
            p.Restaurant.Address,
            CuisineCatalog.Labels(p.Restaurant.Cuisines),
            CuisineCatalog.Split(p.Restaurant.Cuisines),
            MealCardCatalog.Split(p.Restaurant.MealCards),
            MealCardCatalog.Labels(p.Restaurant.MealCards),
            p.Restaurant.GoogleRating,
            p.Restaurant.AvgPriceTl,
            p.Restaurant.Lat,
            p.Restaurant.Lng,
            p.CreatedAt
        )).ToList();
    }

    [HttpPost("preferences")]
    public async Task<IActionResult> SetPreference(SetPreferenceRequest req)
    {
        var userId = User.UserId();
        var p = await db.Preferences.FirstOrDefaultAsync(x => x.UserId == userId && x.RestaurantId == req.RestaurantId);
        var weight = req.Weight.HasValue && req.Weight.Value > 0 ? req.Weight.Value : 1;
        if (p is null)
        {
            db.Preferences.Add(new Preference
            {
                UserId = userId,
                RestaurantId = req.RestaurantId,
                Type = req.Type,
                Weight = weight
            });
        }
        else
        {
            p.Type = req.Type;
            if (req.Weight.HasValue) p.Weight = weight;
        }
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("preferences/{restaurantId:int}/weight")]
    public async Task<IActionResult> UpdatePreferenceWeight(int restaurantId, [FromBody] UpdatePreferenceWeightRequest req)
    {
        var userId = User.UserId();
        var p = await db.Preferences.FirstOrDefaultAsync(x => x.UserId == userId && x.RestaurantId == restaurantId);
        if (p is null) return NotFound("Tercih bulunamadı.");
        p.Weight = Math.Clamp(req.Weight, 1, 100);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("preferences/{restaurantId:int}")]
    public async Task<IActionResult> RemovePreference(int restaurantId)
    {
        var userId = User.UserId();
        var p = await db.Preferences.FirstOrDefaultAsync(x => x.UserId == userId && x.RestaurantId == restaurantId);
        if (p is not null) { db.Preferences.Remove(p); await db.SaveChangesAsync(); }
        return NoContent();
    }

    private static VisitDto ToDto(Visit v) => new(v.Id, DateTime.SpecifyKind(v.VisitedAt, DateTimeKind.Utc), v.Source, v.Stars, v.Note,
        v.RatedAt is null ? null : DateTime.SpecifyKind(v.RatedAt.Value, DateTimeKind.Utc),
        v.RestaurantId, v.Restaurant?.Name ?? "", v.Restaurant?.Address, CuisineCatalog.Labels(v.Restaurant?.Cuisines),
        v.Restaurant?.MapsUrl ?? (v.Restaurant is null ? null : $"https://www.google.com/maps/search/?api=1&query={v.Restaurant.Lat},{v.Restaurant.Lng}"));
}
