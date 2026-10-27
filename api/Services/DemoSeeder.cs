using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>
/// Sadece Development ortamında ve Places API anahtarı yokken, uygulamayı denemek için
/// kullanıcının konumu etrafına örnek restoranlar ekler.
/// </summary>
public static class DemoSeeder
{
    private static readonly (string Name, string Cuisines, int Price, double Rating)[] Samples =
    [
        ("Hacı Usta Döner", "kebap", 1, 4.4),
        ("Anadolu Esnaf Lokantası", "evyemegi", 1, 4.5),
        ("Burger Lab", "burger", 2, 4.2),
        ("Karadeniz Pide Salonu", "pide", 1, 4.3),
        ("Green Bowl", "saglikli", 2, 4.1),
        ("Wok & Roll", "uzakdogu", 2, 4.0),
        ("Napoli Pizzeria", "pizza", 2, 4.3),
        ("Mavi Balık Evi", "balik", 3, 4.6),
        ("Tost Durağı", "kahvalti", 1, 4.0),
        ("Ciğerci Mehmet", "kebap", 2, 4.7),
        ("Tavuk Dünyası", "tavuk", 2, 3.9),
        ("Ev Lezzetleri Mutfağı", "evyemegi", 1, 4.2),
    ];

    public static async Task SeedAroundAsync(AppDbContext db, double lat, double lng, CancellationToken ct)
    {
        var rnd = new Random(42);
        foreach (var s in Samples)
        {
            var angle = rnd.NextDouble() * Math.PI * 2;
            var dist = 150 + rnd.NextDouble() * 1100; // metre
            db.Restaurants.Add(new Restaurant
            {
                Name = s.Name,
                Cuisines = s.Cuisines,
                PriceLevel = s.Price,
                GoogleRating = s.Rating,
                GoogleRatingCount = rnd.Next(40, 900),
                Lat = lat + dist * Math.Cos(angle) / 111_000.0,
                Lng = lng + dist * Math.Sin(angle) / (111_000.0 * Math.Cos(lat * Math.PI / 180)),
                Address = "Demo restoran"
            });
        }
        await db.SaveChangesAsync(ct);
    }
}
