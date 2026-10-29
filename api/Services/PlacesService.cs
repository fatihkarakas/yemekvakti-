using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>Google Places API (New) + Ücretsiz OpenStreetMap (Nominatim) gerçek mekan arama ve önbellekleme servisi.</summary>
public class PlacesService(HttpClient http, IConfiguration config, AppDbContext db, ILogger<PlacesService> log)
{
    private string? ApiKey => config["Google:PlacesApiKey"];
    public bool Enabled => !string.IsNullOrWhiteSpace(ApiKey);

    private static readonly string[] ExcludedNameKeywords =
    [
        "yemekhane", "kantin", "öğrenci", "ogrenci", "personel", "askeri", "orduevi", "polisevi",
        "kıraathane", "kiraathane", "kahvehane", "nargile", "tekel", "birahane", "meyhane", "gece kulübü", "night club"
    ];

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

        var list = await QueryDbNearbyAsync(lat, lng, radius, ct);

        // Eğer çevrede 8'den az gerçek restoran varsa OpenStreetMap üzerinden gerçek kayıtlı restoranları çek
        if (list.Count < 8)
        {
            try
            {
                await FetchOsmNearbyAndCacheAsync(lat, lng, Math.Max(radius, 5000), ct);
                list = await QueryDbNearbyAsync(lat, lng, radius, ct);
            }
            catch (Exception ex)
            {
                log.LogWarning(ex, "OSM Nominatim yakın mekan araması tamamlanamadı");
            }
        }

        return list;
    }

    private async Task<List<Restaurant>> QueryDbNearbyAsync(double lat, double lng, int radius, CancellationToken ct)
    {
        var dLat = radius / 111_000.0;
        var dLng = radius / (111_000.0 * Math.Cos(lat * Math.PI / 180));
        var list = await db.Restaurants
            .Where(r => r.Lat >= lat - dLat && r.Lat <= lat + dLat && r.Lng >= lng - dLng && r.Lng <= lng + dLng)
            .ToListAsync(ct);
        return list.Where(r => Geo.DistanceMeters(lat, lng, r.Lat, r.Lng) <= radius).ToList();
    }

    private async Task FetchOsmNearbyAndCacheAsync(double lat, double lng, int radius, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(4));

        var dLat = Math.Max(radius, 4000) / 111_000.0;
        var dLng = Math.Max(radius, 4000) / (111_000.0 * Math.Cos(lat * Math.PI / 180));

        var left = (lng - dLng).ToString("F5", CultureInfo.InvariantCulture);
        var top = (lat + dLat).ToString("F5", CultureInfo.InvariantCulture);
        var right = (lng + dLng).ToString("F5", CultureInfo.InvariantCulture);
        var bottom = (lat - dLat).ToString("F5", CultureInfo.InvariantCulture);

        var url = $"https://nominatim.openstreetmap.org/search?format=json&countrycodes=tr&addressdetails=1&limit=30&bounded=1&viewbox={left},{top},{right},{bottom}&q=restaurant";
        using var req = new HttpRequestMessage(HttpMethod.Get, url);
        req.Headers.TryAddWithoutValidation("User-Agent", "YemekVakti/1.0 (https://yemekvakti.net)");
        req.Headers.TryAddWithoutValidation("Accept-Language", "tr");

        using var res = await http.SendAsync(req, cts.Token);
        if (!res.IsSuccessStatusCode) return;

        var items = await res.Content.ReadFromJsonAsync<List<NominatimPlace>>(JsonOpts, cts.Token);
        if (items is null || items.Count == 0) return;

        await SaveOsmItemsAsync(items, ct);
    }

    private async Task<List<Restaurant>> SaveOsmItemsAsync(List<NominatimPlace> items, CancellationToken ct)
    {
        var allNames = await db.Restaurants.Select(r => r.Name.ToLower()).ToListAsync(ct);
        var existingNames = allNames.Select(n => n.Trim()).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var added = new List<Restaurant>();
        var trCulture = new CultureInfo("tr-TR");

        foreach (var item in items)
        {
            if (!double.TryParse(item.Lat, NumberStyles.Float, CultureInfo.InvariantCulture, out var pLat) ||
                !double.TryParse(item.Lon, NumberStyles.Float, CultureInfo.InvariantCulture, out var pLng))
                continue;

            var rawName = item.Name;
            if (string.IsNullOrWhiteSpace(rawName) && !string.IsNullOrWhiteSpace(item.DisplayName))
            {
                rawName = item.DisplayName.Split(',')[0].Trim();
            }
            if (string.IsNullOrWhiteSpace(rawName) || rawName.Trim().Length < 3) continue;

            var cleanName = rawName.Trim();
            var lowerName = cleanName.ToLower(trCulture);
            if (ExcludedNameKeywords.Any(k => lowerName.Contains(k))) continue;
            if (existingNames.Contains(lowerName)) continue;

            var addr = BuildCleanAddress(item.Address, item.DisplayName);
            var cuisines = CuisineCatalog.Detect(cleanName, item.Type is not null ? [item.Type] : null);
            var estPrice = EstimateInitialPrice(cuisines);
            var priceLevel = estPrice >= 650 ? 3 : (estPrice >= 350 ? 2 : 1);
            var placeId = $"osm_{item.OsmId ?? Math.Abs((cleanName + pLat.ToString("F4")).GetHashCode())}";

            if (await db.Restaurants.AnyAsync(r => r.GooglePlaceId == placeId, ct))
                continue;

            var rest = new Restaurant
            {
                GooglePlaceId = placeId,
                Name = cleanName,
                Address = addr,
                Lat = pLat,
                Lng = pLng,
                Cuisines = cuisines,
                MealCards = "ticket,sodexo,multinet",
                PriceLevel = priceLevel,
                AvgPriceTl = estPrice,
                GoogleRating = 4.4,
                GoogleRatingCount = 450,
                MapsUrl = DemoSeeder.BuildMapsSearchUrl(cleanName, addr, pLat, pLng),
                UpdatedAt = DateTime.UtcNow
            };

            db.Restaurants.Add(rest);
            existingNames.Add(lowerName);
            added.Add(rest);
        }

        if (added.Count > 0)
        {
            await db.SaveChangesAsync(ct);
        }

        return added;
    }

    private static string BuildCleanAddress(NominatimAddress? a, string? displayName)
    {
        if (a is not null)
        {
            var street = a.Road ?? a.Pedestrian ?? a.Street;
            var houseNo = !string.IsNullOrWhiteSpace(a.HouseNumber) ? $"No: {a.HouseNumber}" : null;
            var roadPart = string.Join(" ", new[] { street, houseNo }.Where(s => !string.IsNullOrWhiteSpace(s)));
            var neighborhood = a.Suburb ?? a.Neighbourhood ?? a.Quarter;
            var district = a.Town ?? a.CityDistrict ?? a.County ?? a.District;
            var city = a.Province ?? a.City;

            var parts = new[] { roadPart, neighborhood, district, city }
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();
            if (parts.Count > 0) return string.Join(", ", parts);
        }

        if (!string.IsNullOrWhiteSpace(displayName))
        {
            var split = displayName.Split(',').Select(s => s.Trim()).Skip(1).Take(3).ToList();
            if (split.Count > 0) return string.Join(", ", split);
        }

        return "";
    }

    private static int EstimateInitialPrice(string cuisines)
    {
        if (cuisines.Contains("balik")) return 600;
        if (cuisines.Contains("kahvalti")) return 280;
        if (cuisines.Contains("pide")) return 300;
        if (cuisines.Contains("evyemegi")) return 340;
        return 420;
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
            if (string.IsNullOrWhiteSpace(p.DisplayName?.Text)) continue;
            var lower = p.DisplayName.Text.ToLower(new CultureInfo("tr-TR"));
            if (ExcludedNameKeywords.Any(k => lower.Contains(k))) continue;

            if (!existing.TryGetValue(p.Id, out var r))
            {
                r = new Restaurant { GooglePlaceId = p.Id };
                db.Restaurants.Add(r);
            }
            r.Name = p.DisplayName.Text;
            r.Address = p.FormattedAddress;
            r.Lat = p.Location?.Latitude ?? r.Lat;
            r.Lng = p.Location?.Longitude ?? r.Lng;
            r.GoogleRating = p.Rating;
            r.GoogleRatingCount = p.UserRatingCount;
            r.PriceLevel = MapPrice(p.PriceLevel) ?? r.PriceLevel;
            r.MapsUrl = p.GoogleMapsUri ?? DemoSeeder.BuildMapsSearchUrl(r.Name, r.Address, r.Lat, r.Lng);
            r.Cuisines = CuisineCatalog.Detect(r.Name, p.Types);
            r.UpdatedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync(ct);
    }

    public async Task<List<Restaurant>> SearchTextAndCacheAsync(string query, double lat, double lng, CancellationToken ct)
    {
        if (!Enabled)
        {
            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(4));
                var d = 0.35;
                var left = (lng - d).ToString("F4", CultureInfo.InvariantCulture);
                var top = (lat + d).ToString("F4", CultureInfo.InvariantCulture);
                var right = (lng + d).ToString("F4", CultureInfo.InvariantCulture);
                var bottom = (lat - d).ToString("F4", CultureInfo.InvariantCulture);

                var url = $"https://nominatim.openstreetmap.org/search?format=json&countrycodes=tr&addressdetails=1&limit=10&viewbox={left},{top},{right},{bottom}&q={Uri.EscapeDataString(query)}";
                using var reqOsm = new HttpRequestMessage(HttpMethod.Get, url);
                reqOsm.Headers.TryAddWithoutValidation("User-Agent", "YemekVakti/1.0");
                reqOsm.Headers.TryAddWithoutValidation("Accept-Language", "tr");

                using var resOsm = await http.SendAsync(reqOsm, cts.Token);
                if (resOsm.IsSuccessStatusCode)
                {
                    var items = await resOsm.Content.ReadFromJsonAsync<List<NominatimPlace>>(JsonOpts, cts.Token);
                    if (items is not null && items.Count > 0)
                    {
                        var foodItems = items.Where(i => i.Class == "amenity" && (i.Type == "restaurant" || i.Type == "fast_food" || i.Type == "cafe")).ToList();
                        return await SaveOsmItemsAsync(foodItems, ct);
                    }
                }
            }
            catch { }
            return [];
        }

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
                r.MapsUrl = p.GoogleMapsUri ?? DemoSeeder.BuildMapsSearchUrl(r.Name, r.Address, r.Lat, r.Lng);
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

    private class NominatimPlace
    {
        [JsonPropertyName("osm_id")] public long? OsmId { get; set; }
        [JsonPropertyName("lat")] public string? Lat { get; set; }
        [JsonPropertyName("lon")] public string? Lon { get; set; }
        [JsonPropertyName("class")] public string? Class { get; set; }
        [JsonPropertyName("type")] public string? Type { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
        [JsonPropertyName("display_name")] public string? DisplayName { get; set; }
        [JsonPropertyName("address")] public NominatimAddress? Address { get; set; }
    }

    private class NominatimAddress
    {
        [JsonPropertyName("road")] public string? Road { get; set; }
        [JsonPropertyName("pedestrian")] public string? Pedestrian { get; set; }
        [JsonPropertyName("street")] public string? Street { get; set; }
        [JsonPropertyName("house_number")] public string? HouseNumber { get; set; }
        [JsonPropertyName("suburb")] public string? Suburb { get; set; }
        [JsonPropertyName("neighbourhood")] public string? Neighbourhood { get; set; }
        [JsonPropertyName("quarter")] public string? Quarter { get; set; }
        [JsonPropertyName("town")] public string? Town { get; set; }
        [JsonPropertyName("city_district")] public string? CityDistrict { get; set; }
        [JsonPropertyName("district")] public string? District { get; set; }
        [JsonPropertyName("county")] public string? County { get; set; }
        [JsonPropertyName("city")] public string? City { get; set; }
        [JsonPropertyName("province")] public string? Province { get; set; }
    }
}
