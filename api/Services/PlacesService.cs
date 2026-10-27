using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>Google Places API (New) - Nearby Search. Sonuçlar DB'ye önbelleğe alınır.</summary>
public class PlacesService(HttpClient http, IConfiguration config, AppDbContext db, ILogger<PlacesService> log)
{
    private string? ApiKey => config["Google:PlacesApiKey"];
    public bool Enabled => !string.IsNullOrWhiteSpace(ApiKey);

    public async Task<List<Restaurant>> GetNearbyAsync(double lat, double lng, int radius, CancellationToken ct)
    {
        if (Enabled)
        {
            try
            {
                await FetchAndCacheAsync(lat, lng, radius, ct);
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "Places API çağrısı başarısız, DB önbelleği kullanılacak");
            }
        }

        // Basit bounding box + Haversine (shared host'ta spatial index gerektirmez)
        var dLat = radius / 111_000.0;
        var dLng = radius / (111_000.0 * Math.Cos(lat * Math.PI / 180));
        var list = await db.Restaurants
            .Where(r => r.Lat >= lat - dLat && r.Lat <= lat + dLat && r.Lng >= lng - dLng && r.Lng <= lng + dLng)
            .ToListAsync(ct);
        return list.Where(r => Geo.DistanceMeters(lat, lng, r.Lat, r.Lng) <= radius).ToList();
    }

    private async Task FetchAndCacheAsync(double lat, double lng, int radius, CancellationToken ct)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, "https://places.googleapis.com/v1/places:searchNearby");
        req.Headers.Add("X-Goog-Api-Key", ApiKey);
        req.Headers.Add("X-Goog-FieldMask",
            "places.id,places.displayName,places.formattedAddress,places.location,places.rating," +
            "places.userRatingCount,places.priceLevel,places.types,places.googleMapsUri");
        req.Content = JsonContent.Create(new
        {
            includedTypes = new[] { "restaurant", "meal_takeaway" },
            maxResultCount = 20,
            rankPreference = "DISTANCE",
            languageCode = "tr",
            locationRestriction = new { circle = new { center = new { latitude = lat, longitude = lng }, radius = (double)radius } }
        });

        using var res = await http.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            log.LogWarning("Places API {Status}: {Body}", res.StatusCode, await res.Content.ReadAsStringAsync(ct));
            return;
        }

        var body = await res.Content.ReadFromJsonAsync<PlacesResponse>(JsonOpts, ct);
        if (body?.Places is null) return;

        var ids = body.Places.Select(p => p.Id).ToList();
        var existing = await db.Restaurants.Where(r => r.GooglePlaceId != null && ids.Contains(r.GooglePlaceId)).ToDictionaryAsync(r => r.GooglePlaceId!, ct);

        foreach (var p in body.Places)
        {
            if (!existing.TryGetValue(p.Id, out var r))
            {
                r = new Restaurant { GooglePlaceId = p.Id };
                db.Restaurants.Add(r);
            }
            r.Name = p.DisplayName?.Text ?? r.Name;
            r.Address = p.FormattedAddress;
            r.Lat = p.Location?.Latitude ?? r.Lat;
            r.Lng = p.Location?.Longitude ?? r.Lng;
            r.GoogleRating = p.Rating;
            r.GoogleRatingCount = p.UserRatingCount;
            r.PriceLevel = MapPrice(p.PriceLevel) ?? r.PriceLevel;
            r.MapsUrl = p.GoogleMapsUri;
            r.Cuisines = CuisineCatalog.Detect(r.Name, p.Types);
            r.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<Restaurant>> SearchTextAndCacheAsync(string query, double lat, double lng, CancellationToken ct)
    {
        if (!Enabled) return [];

        try
        {
            var req = new HttpRequestMessage(HttpMethod.Post, "https://places.googleapis.com/v1/places:searchText");
            req.Headers.Add("X-Goog-Api-Key", ApiKey);
            req.Headers.Add("X-Goog-FieldMask",
                "places.id,places.displayName,places.formattedAddress,places.location,places.rating," +
                "places.userRatingCount,places.priceLevel,places.types,places.googleMapsUri");
            req.Content = JsonContent.Create(new
            {
                textQuery = query,
                languageCode = "tr",
                includedType = "restaurant",
                locationBias = new
                {
                    circle = new
                    {
                        center = new { latitude = lat, longitude = lng },
                        radius = 25000.0
                    }
                }
            });

            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                log.LogWarning("Places TextSearch {Status}: {Body}", res.StatusCode, await res.Content.ReadAsStringAsync(ct));
                return [];
            }

            var body = await res.Content.ReadFromJsonAsync<PlacesResponse>(JsonOpts, ct);
            if (body?.Places is null || body.Places.Count == 0) return [];

            var ids = body.Places.Select(p => p.Id).ToList();
            var existing = await db.Restaurants.Where(r => r.GooglePlaceId != null && ids.Contains(r.GooglePlaceId)).ToDictionaryAsync(r => r.GooglePlaceId!, ct);
            var results = new List<Restaurant>();

            foreach (var p in body.Places)
            {
                if (string.IsNullOrWhiteSpace(p.DisplayName?.Text) || p.Location is null) continue;

                if (!existing.TryGetValue(p.Id, out var r))
                {
                    r = new Restaurant { GooglePlaceId = p.Id };
                    db.Restaurants.Add(r);
                }
                r.Name = p.DisplayName.Text;
                r.Address = p.FormattedAddress;
                r.Lat = p.Location.Latitude;
                r.Lng = p.Location.Longitude;
                r.GoogleRating = p.Rating;
                r.GoogleRatingCount = p.UserRatingCount;
                r.PriceLevel = MapPrice(p.PriceLevel) ?? r.PriceLevel;
                r.MapsUrl = p.GoogleMapsUri ?? $"https://www.google.com/maps/search/?api=1&query={r.Lat},{r.Lng}";
                r.Cuisines = CuisineCatalog.Detect(r.Name, p.Types);
                r.UpdatedAt = DateTime.UtcNow;
                if (!results.Contains(r)) results.Add(r);
            }
            await db.SaveChangesAsync(ct);
            return results;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Places TextSearch error");
            return [];
        }
    }

    private static int? MapPrice(string? p) => p switch
    {
        "PRICE_LEVEL_FREE" or "PRICE_LEVEL_INEXPENSIVE" => 1,
        "PRICE_LEVEL_MODERATE" => 2,
        "PRICE_LEVEL_EXPENSIVE" => 3,
        "PRICE_LEVEL_VERY_EXPENSIVE" => 4,
        _ => null
    };

    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    private record PlacesResponse(List<Place>? Places);
    private record Place(
        string Id,
        LocalizedText? DisplayName,
        string? FormattedAddress,
        LatLng? Location,
        double? Rating,
        int? UserRatingCount,
        string? PriceLevel,
        List<string>? Types,
        string? GoogleMapsUri);
    private record LocalizedText(string? Text);
    private record LatLng(double Latitude, double Longitude);
}
