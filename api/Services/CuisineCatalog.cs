namespace YemekVakti.Api.Services;

public record CuisineDef(string Code, string Label, string Emoji, string[] PlaceTypes, string[] Keywords);

/// <summary>Uygulamadaki yemek tarzları ve Google Places tiplerine eşlemesi.</summary>
public static class CuisineCatalog
{
    public static readonly CuisineDef[] All =
    [
        new("kebap", "Döner / Kebap", "🥙", ["kebab_shop", "turkish_restaurant", "middle_eastern_restaurant"], ["döner", "doner", "kebap", "kebab", "dürüm", "iskender", "ocakbaşı", "köfte"]),
        new("evyemegi", "Ev Yemeği / Esnaf", "🍲", ["turkish_restaurant"], ["lokanta", "ev yemek", "esnaf", "sulu yemek", "tencere", "çorba"]),
        new("burger", "Burger / Fast Food", "🍔", ["hamburger_restaurant", "fast_food_restaurant"], ["burger", "mcdonald", "kfc", "popeyes", "wendy"]),
        new("pide", "Pide / Lahmacun", "🫓", [], ["pide", "lahmacun", "karadeniz", "fırın"]),
        new("saglikli", "Salata / Sağlıklı", "🥗", ["vegan_restaurant", "vegetarian_restaurant", "salad_shop", "health_food_restaurant"], ["salata", "salad", "bowl", "vegan", "fit"]),
        new("uzakdogu", "Uzak Doğu", "🍜", ["asian_restaurant", "chinese_restaurant", "japanese_restaurant", "sushi_restaurant", "thai_restaurant", "korean_restaurant", "ramen_restaurant", "vietnamese_restaurant"], ["sushi", "noodle", "wok", "çin", "japon", "ramen", "asya"]),
        new("pizza", "Pizza / İtalyan", "🍕", ["pizza_restaurant", "italian_restaurant"], ["pizza", "pasta", "makarna", "italian"]),
        new("balik", "Balık", "🐟", ["seafood_restaurant"], ["balık", "balik", "fish", "midye"]),
        new("kahvalti", "Kahvaltı / Tost / Kafe", "🥪", ["breakfast_restaurant", "brunch_restaurant", "cafe", "sandwich_shop", "bakery", "coffee_shop"], ["kahvaltı", "tost", "sandviç", "kafe", "cafe", "börek", "simit"]),
        new("tavuk", "Tavuk / Izgara", "🍗", ["barbecue_restaurant", "steak_house"], ["tavuk", "piliç", "chicken", "ızgara", "et", "steak"]),
        new("sanayi", "Sanayi Lezzetleri", "🔧", ["turkish_restaurant"], ["sanayi", "kavurma", "tostçu", "sanayi tostu", "sanayi köfte", "esnaf", "ostim", "şaşmaz", "sasmaz", "ivedik", "siteler", "gersan"]),
    ];

    public static readonly HashSet<string> Codes = All.Select(c => c.Code).ToHashSet();

    public static string Detect(string name, IEnumerable<string>? placeTypes)
    {
        var types = placeTypes?.ToHashSet() ?? [];
        var lower = name.ToLower(new System.Globalization.CultureInfo("tr-TR"));
        var codes = All
            .Where(c => c.Keywords.Any(lower.Contains) || c.PlaceTypes.Any(types.Contains))
            .Select(c => c.Code)
            .ToList();
        // "turkish_restaurant" hem kebap hem ev yemeği eşleşir; anahtar kelime yoksa ikisini de bırak
        return string.Join(',', codes.Distinct());
    }

    public static string[] Split(string? cuisines) =>
        string.IsNullOrWhiteSpace(cuisines) ? [] : cuisines.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static string Labels(string? cuisines) =>
        string.Join(", ", Split(cuisines).Select(c => All.FirstOrDefault(x => x.Code == c)?.Label ?? c));
}

public static class Geo
{
    public static double DistanceMeters(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371000;
        double dLat = ToRad(lat2 - lat1), dLng = ToRad(lng2 - lng1);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return R * 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
    }

    private static double ToRad(double d) => d * Math.PI / 180;
}
