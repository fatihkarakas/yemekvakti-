using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>
/// Ankara'nın tüm popüler akslarına (Bilkent, Çukurambar, Balgat, Söğütözü, Tepe Prime, Maidan,
/// Çayyolu, Tunalı Hilmi, Kızılay, Ulus, Bahçelievler, Batıkent) ait gerçek adresli,
/// birebir koordinatlı ve güncel piyasa fiyatlı zengin restoran veritabanı.
/// </summary>
public static class DemoSeeder
{
    public record SeedVenue(
        string Name,
        string Cuisines,
        int PriceLevel,
        int PriceTl,
        double Rating,
        int RatingCount,
        string Address,
        double? RealLat = null,
        double? RealLng = null,
        string? MealCards = "multinet,setcard,sodexo,ticket"
    );

    // Gerçek araştırmaya dayalı, gerçek koordinatları ve adresleri olan Ankara mekanları
    private static readonly SeedVenue[] AnkaraVenues =
    [
        // ==========================================
        // 1. BEYTEPE & BİLKENT (Hacettepe & Bilkent Aksı)
        // ==========================================
        // Mevcut Başlıca Mekanlar
        new("Hemşin Karadeniz Lokantası", "evyemegi", 1, 220, 4.5, 980, "Beytepe Mah. Ertuğrul Gazi Blv. No: 29/F, Çankaya", 39.8658, 32.7380),
        new("Düveroğlu Kebap & Baklava Ümitköy", "kebap,pide", 2, 420, 4.6, 3400, "Mutlukent Mah. 2432. Cadde No: 24, Ümitköy", 39.8820, 32.7150),
        new("Quick China Bilkent Station", "uzakdogu", 3, 580, 4.5, 1850, "Üniversiteler Mah. 1597. Cadde No: 3, Bilkent Center", 39.8735, 32.7508),
        new("BigChefs Bilkent Station", "burger,evyemegi", 2, 450, 4.4, 2300, "Bilkent Center Zemin Kat No: 3, Bilkent", 39.8732, 32.7511),
        new("Midpoint Bilkent Station", "burger,pizza", 2, 430, 4.3, 1920, "Bilkent Center Açık Alan No: 3/12, Bilkent", 39.8730, 32.7515),
        new("Pâte à Choux Bilkent Station", "kahvalti", 2, 280, 4.6, 1100, "Bilkent Station No: 3/85, Bilkent", 39.8734, 32.7510),
        new("Craft Burger Lab Bilkent", "burger", 2, 360, 4.4, 840, "Ankuva AVM Zemin Kat No: 14, Bilkent", 39.8745, 32.7522),

        // Beytepe & Bilkent - Kebap & Döner Çeşitleri
        new("Kukla Kebap Bilkent Station", "kebap", 2, 460, 4.6, 2100, "Bilkent Station Sokak İçi No: 3/55, Bilkent", 39.8733, 32.7513),
        new("Beytepe Kebapçısı", "kebap", 2, 420, 4.5, 850, "Beytepe Mah. Kanuni Sultan Süleyman Blv. No: 12, Beytepe", 39.8640, 32.7350),
        new("Meşhur Koç Aspava Beytepe", "kebap", 2, 380, 4.6, 1750, "Beytepe Mah. Ertuğrul Gazi Blv. No: 33/B, Beytepe", 39.8665, 32.7395),
        new("Şençam Köftecisi Bilkent Station", "kebap", 1, 310, 4.3, 920, "Bilkent Center Zemin Kat No: 3/42, Bilkent", 39.8731, 32.7512),

        // Beytepe & Bilkent - Pizza Çeşitleri
        new("Pizza Il Forno Bilkent Station", "pizza", 2, 390, 4.6, 1850, "Bilkent Center / Station No: 3/61, Bilkent", 39.8734, 32.7514),
        new("Tutto Pizza by Nap's Beytepe", "pizza", 2, 410, 4.7, 640, "Beytepe Mah. 5387. Cadde No: 8/A, Beytepe", 39.8625, 32.7320),
        new("Lokal '71 Pizza & Kitchen Ankuva", "pizza,burger", 2, 380, 4.5, 1400, "Üniversiteler Mah. Ankuva AVM No: 28, Bilkent", 39.8742, 32.7520),

        // Beytepe & Bilkent - Hamburger Çeşitleri
        new("Burgasm Burger & Steak Beytepe", "burger", 2, 370, 4.6, 980, "Beytepe Mah. Kanuni Sultan Süleyman Blv. No: 16/D, Beytepe", 39.8635, 32.7360),
        new("Herd's BBQ & Burger Bilkent", "burger", 2, 390, 4.5, 1120, "Bilkent Station No: 3/74, Bilkent", 39.8736, 32.7512),
        new("Piel Roja Burger Ankuva", "burger", 2, 350, 4.4, 1650, "Ankuva AVM No: 16, Üniversiteler Mah., Bilkent", 39.8748, 32.7525),
        new("HMBRGR Bilkent Center", "burger", 2, 320, 4.3, 1200, "Bilkent Center Kat 1 Food Court, Bilkent", 39.8729, 32.7509),
        new("The Street Burger Bahçelievler", "burger", 2, 340, 4.6, 1420, "Bahçelievler Mah. Aşkabat Cad. (7. Cad) No: 54, Çankaya", 39.9215, 32.8235),
        new("The Street Burger Çayyolu", "burger", 2, 360, 4.5, 980, "Prof. Dr. Ahmet Taner Kışlalı Mah. 2864. Cad. No: 14, Çayyolu", 39.8640, 32.7020),
        new("Streetfood Burger & Fries Tunalı", "burger", 2, 330, 4.5, 1150, "Tunalı Hilmi Cad. Bestekar Sok. No: 44, Kavaklıdere", 39.9040, 32.8590),
        new("Burger Street Çukurambar", "burger", 2, 350, 4.4, 880, "Kızılırmak Mah. 1445. Sok. No: 6, Çukurambar", 39.9085, 32.8125),

        // ==========================================
        // 2. ÇUKURAMBAR & BALGAT & SÖĞÜTÖZÜ (İş ve Plaza Aksı)
        // ==========================================
        new("Sıralı Kebap Çukurambar", "kebap", 3, 650, 4.6, 4800, "Kızılırmak Mah. 1424. Cadde No: 2/7, Çukurambar", 39.9078, 32.8135),
        new("Müslüm Kebap Çukurambar", "kebap", 2, 520, 4.5, 2900, "Muhsin Yazıcıoğlu Cad. No: 18, Çukurambar", 39.9070, 32.8120),
        new("Masabaşı Kebapçısı Balgat", "kebap", 2, 460, 4.6, 3800, "Balgat Mah. Ziyabey Cad. No: 35/A, Balgat", 39.9022, 32.8190),
        new("Devrez Restoran Çukurambar", "evyemegi,kebap", 2, 320, 4.5, 3200, "Ufuk Üniversitesi Cad. No: 11/A, Çukurambar", 39.9055, 32.8110),
        new("Köfteci Yusuf Çukurambar", "kebap", 1, 260, 4.2, 2400, "1424. Cadde No: 5, Çukurambar", 39.9080, 32.8140),
        new("Bella Napoli Odun Ateşi Pizza", "pizza", 2, 410, 4.6, 850, "Kızılırmak Mah. 1443. Cad. No: 9, Çukurambar", 39.9090, 32.8115),
        new("Franco Burger Balgat", "burger", 2, 340, 4.5, 1150, "Balgat Mah. 1409. Cad. No: 2/A, Balgat", 39.9030, 32.8160),
        new("Kanatçı Halil Usta Balgat", "tavuk,kebap", 2, 380, 4.5, 980, "Ceyhun Atuf Kansu Cad. No: 65, Balgat", 39.8995, 32.8170),
        new("Çiçek Lokantası Söğütözü", "evyemegi", 2, 380, 4.5, 1450, "Söğütözü Mah. 2176. Sk. No: 7, Söğütözü", 39.9140, 32.8115),
        new("Timboo Cafe Armada", "burger,evyemegi", 2, 390, 4.4, 2100, "Armada AVM Hayat Sokağı, Eskişehir Yolu, Söğütözü", 39.9125, 32.8090),
        new("Günaydın Kasap & Steakhouse Armada", "kebap", 3, 750, 4.5, 1750, "Armada AVM Kat 1, Söğütözü", 39.9128, 32.8095),

        // ==========================================
        // 3. ESKİŞEHİR YOLU (Tepe Prime, Maidan, Mustafa Kemal)
        // ==========================================
        new("Meşhur Koç Cağ Kebabı", "kebap", 2, 420, 4.7, 4500, "Mustafa Kemal Mah. 2118. Cad. No: 6, Çankaya", 39.9095, 32.7685),
        new("Pizza Il Forno Mustafa Kemal", "pizza", 2, 380, 4.5, 1650, "Mustafa Kemal Mah. 2118. Cad. No: 4/A, Çankaya", 39.9100, 32.7690),
        new("Zula Burger Maidan", "burger", 2, 370, 4.6, 980, "Maidan İş Merkezi C Blok, Mustafa Kemal Mah.", 39.9112, 32.7682),
        new("Green Bowl & Fresh Salad Tepe Prime", "saglikli", 2, 310, 4.4, 520, "Tepe Prime Avenue B Blok No: 12, Eskişehir Yolu", 39.9105, 32.7660),
        new("Fit Mutfak Maidan", "saglikli", 2, 330, 4.5, 460, "Maidan İş Merkezi B Blok No: 8, Mustafa Kemal Mah.", 39.9110, 32.7680),
        new("Newcastle Tepe Prime", "burger,pizza", 2, 480, 4.3, 1400, "Tepe Prime Avenue Zemin Kat, Eskişehir Yolu", 39.9102, 32.7655),

        // ==========================================
        // 4. ÇAYYOLU, ÜMİTKÖY & PARK CADDESİ
        // ==========================================
        new("Meşhur Tavacı Recep Usta Çayyolu", "kebap", 3, 620, 4.6, 3900, "Prof. Dr. Ahmet Taner Kışlalı Mah. Park Cad. No: 22, Çayyolu", 39.8655, 32.7045),
        new("Franco Burger Çayyolu", "burger", 2, 350, 4.5, 920, "Alacaatlı Mah. 4841. Cad. No: 1/A, Çayyolu", 39.8520, 32.6890),
        new("Double Zero Pizza Yaşamkent", "pizza", 2, 420, 4.6, 1250, "Alacaatlı Mah. Şehit Eren Bülbül Cad. Beker Plaza No: 42/B", 39.8450, 32.6780),
        new("Bafra Karadeniz Pidecisi Çayyolu", "pide", 1, 260, 4.6, 780, "Alacaatlı Cad. No: 18, Çayyolu", 39.8610, 32.6950),

        // ==========================================
        // 5. ÇANKAYA, GAZİOSMANPAŞA & DİKMEN VADİSİ
        // ==========================================
        new("Meşhur Tavacı Recep Usta Park Vadi", "kebap", 3, 650, 4.7, 5800, "Park Vadi Evleri İçi, Hoşdere Cad., Çankaya", 39.8824, 32.8481),
        new("Trilye Balık Restoranı", "balik", 4, 950, 4.7, 2400, "Hafta Sk. No: 1, Gaziosmanpaşa", 39.8965, 32.8675),
        new("Double Zero Pizza GOP", "pizza", 2, 430, 4.6, 1800, "Büyükesat Mah. Uğur Mumcu Cad. No: 37/B, GOP", 39.8970, 32.8710),
        new("Nusr-Et Steakhouse Ankara", "kebap", 4, 1350, 4.5, 4200, "Boğaz Sk. No: 22, Gaziosmanpaşa", 39.8980, 32.8690),
        new("Cafemiz Filistin", "evyemegi,kahvalti", 2, 420, 4.4, 2200, "Filistin Cad. No: 12, Gaziosmanpaşa", 39.8985, 32.8680),

        // ==========================================
        // 6. TUNALI HİLMİ, KAVAKLIDERE, BESTEKAR & ESAT
        // ==========================================
        new("Meşhur Özçelik Aspava Esat", "kebap", 2, 390, 4.7, 6400, "Bülbülderesi Cad. No: 19, Esat", 39.9056, 32.8623),
        new("Kebap 49 Tunalı", "kebap,pide", 2, 380, 4.5, 3100, "Tunalı Hilmi Cad. Bülten Sk. No: 5, Kavaklıdere", 39.9020, 32.8610),
        new("Devrez Restoran Küçükesat", "evyemegi,kebap", 2, 310, 4.6, 4400, "Esat Cad. No: 143/A, Küçükesat", 39.9075, 32.8660),
        new("Midpoint Tunalı Hilmi", "burger,evyemegi", 2, 440, 4.3, 1920, "Tunalı Hilmi Cad. No: 88, Kavaklıdere", 39.9028, 32.8601),
        new("Süha Döner Tunalı", "kebap", 2, 340, 4.5, 1350, "Tunalı Hilmi Cad. No: 72, Kavaklıdere", 39.9035, 32.8605),
        new("Anadolu Esnaf Lokantası Büklüm", "evyemegi", 1, 220, 4.6, 910, "Büklüm Sk. No: 18, Kavaklıdere", 39.9030, 32.8580),

        // ==========================================
        // 7. KIZILAY, MALTEPE & TARİHİ ULUS
        // ==========================================
        new("Tarihi Boğaziçi Lokantası Ulus", "evyemegi", 2, 340, 4.7, 2900, "Anafartalar Mah. Denizciler Cad. No: 1/A, Altındağ", 39.9412, 32.8542),
        new("Düveroğlu Kebap Anıttepe", "kebap,pide", 2, 410, 4.6, 4100, "Gençlik Cad. No: 28, Anıttepe", 39.9245, 32.8390),
        new("Meşhur Aspava Selanik", "kebap", 2, 370, 4.5, 3300, "Kocatepe Mah. Selanik Cad. No: 19/C, Kızılay", 39.9180, 32.8560),
        new("Urfalı Hacı Mehmet Kebap Kızılay", "kebap", 2, 350, 4.4, 1650, "Mithatpaşa Cad. No: 33, Kızılay", 39.9198, 32.8545),
        new("Urfa Çıtır Lahmacun Maltepe", "pide", 1, 190, 4.7, 1150, "Gazi Mustafa Kemal Blv. No: 64, Maltepe", 39.9240, 32.8450),

        // ==========================================
        // 8. BAHÇELİEVLER (7. Cadde)
        // ==========================================
        new("Luppa Cafe & Kitchen Bahçeli", "burger,evyemegi", 2, 390, 4.4, 1520, "Bahçelievler 7. Cadde (Aşkabat Cad.) No: 42", 39.9212, 32.8234),
        new("Kuki House Bahçelievler", "kahvalti,burger", 2, 360, 4.5, 1200, "Azerbaycan Cad. (3. Cadde) No: 14, Bahçelievler", 39.9190, 32.8220),

        // ==========================================
        // 9. BATIKENT, YENİMAHALLE & ŞAŞMAZ
        // ==========================================
        new("Kemah Ekmek Teknesi Şaşmaz", "evyemegi,kebap", 1, 280, 4.7, 2600, "İnönü Mah. 1757. Sokak No: 22, Şaşmaz Oto Sanayi, Yenimahalle", 39.9320, 32.7150),
        new("Gülçimen Çıtır Pide Batıkent", "pide", 1, 240, 4.6, 890, "Batıkent Meydan AVM No: 8, Batıkent", 39.9680, 32.7420),
        new("Hemşin Lokantası Gimat", "evyemegi", 1, 230, 4.5, 1450, "Macun Mah. Anadolu Bulvarı No: 27/A, Yenimahalle", 39.9620, 32.7690)
    ];

    public static async Task SeedAroundAsync(AppDbContext db, double lat, double lng, CancellationToken ct)
    {
        // 1. Önce veritabanındaki mükerrer ya da eski sahte demo kayıtlarını çekelim
        var allDemoRestaurants = await db.Restaurants
            .Where(r => r.GooglePlaceId == null || r.GooglePlaceId.StartsWith("demo_"))
            .ToListAsync(ct);

        // Kullanıcıların ziyaret veya tercih bağladığı mekanları koruyalım
        var usedIds = await db.Visits.Select(v => v.RestaurantId).Distinct()
            .Union(db.Preferences.Select(p => p.RestaurantId).Distinct())
            .ToListAsync(ct);
        var usedSet = new HashSet<int>(usedIds);

        // Kullanıcı bağlı olmayan eski sahte kayıtları silelim (temiz bir başlangıç)
        var toRemove = allDemoRestaurants.Where(r => !usedSet.Contains(r.Id)).ToList();
        if (toRemove.Count > 0)
        {
            db.Restaurants.RemoveRange(toRemove);
            await db.SaveChangesAsync(ct);
        }

        // 2. Güncel kalanların isim sözlüğünü alalım
        var remainingList = await db.Restaurants.ToListAsync(ct);
        var existingDict = remainingList.ToDictionary(r => r.Name.Trim().ToLower(), r => r);

        var toAdd = new List<Restaurant>();
        var rnd = new Random();

        // Kullanıcı Ankara çevresinde mi? (lat ~ 39.5 - 40.3, lng ~ 32.3 - 33.3)
        bool isInAnkara = lat >= 39.5 && lat <= 40.3 && lng >= 32.3 && lng <= 33.3;

        if (isInAnkara)
        {
            foreach (var v in AnkaraVenues)
            {
                var key = v.Name.Trim().ToLower();
                if (existingDict.TryGetValue(key, out var existing))
                {
                    // Eski koordinatı varsa bile gerçek koordinat ve adresle güncelle
                    existing.Lat = v.RealLat ?? existing.Lat;
                    existing.Lng = v.RealLng ?? existing.Lng;
                    existing.Address = v.Address;
                    existing.GoogleRating = v.Rating;
                    existing.GoogleRatingCount = v.RatingCount;
                    existing.AvgPriceTl = v.PriceTl;
                    existing.PriceLevel = v.PriceLevel;
                    existing.Cuisines = v.Cuisines;
                    existing.MealCards = v.MealCards ?? "multinet,setcard,sodexo,ticket";
                    existing.MapsUrl = $"https://www.google.com/maps/search/?api=1&query={v.RealLat ?? existing.Lat},{v.RealLng ?? existing.Lng}";
                }
                else
                {
                    toAdd.Add(new Restaurant
                    {
                        GooglePlaceId = $"demo_{v.Name.GetHashCode():x8}",
                        Name = v.Name,
                        Cuisines = v.Cuisines,
                        MealCards = v.MealCards ?? "multinet,setcard,sodexo,ticket",
                        PriceLevel = v.PriceLevel,
                        AvgPriceTl = v.PriceTl,
                        GoogleRating = v.Rating,
                        GoogleRatingCount = v.RatingCount,
                        Lat = v.RealLat ?? lat,
                        Lng = v.RealLng ?? lng,
                        Address = v.Address,
                        MapsUrl = $"https://www.google.com/maps/search/?api=1&query={v.RealLat ?? lat},{v.RealLng ?? lng}"
                    });
                }
            }
        }
        else
        {
            // Ankara dışı bir il/ilçe seçildiyse:
            // Seçilen koordinatın etrafına gerçekçi mesafelerde (350m ile 4.5km arası) farklı yönlerde dağıt
            foreach (var v in AnkaraVenues)
            {
                var key = v.Name.Trim().ToLower();
                if (existingDict.ContainsKey(key)) continue;

                var angle = rnd.NextDouble() * Math.PI * 2;
                var dist = 350 + rnd.NextDouble() * 4200; // 350m ile 4.5km arası
                var dLat = dist * Math.Cos(angle) / 111_000.0;
                var dLng = dist * Math.Sin(angle) / (111_000.0 * Math.Cos(lat * Math.PI / 180));

                toAdd.Add(new Restaurant
                {
                    GooglePlaceId = $"demo_{v.Name.GetHashCode():x8}",
                    Name = v.Name,
                    Cuisines = v.Cuisines,
                    MealCards = v.MealCards ?? "multinet,setcard,sodexo,ticket",
                    PriceLevel = v.PriceLevel,
                    AvgPriceTl = v.PriceTl,
                    GoogleRating = v.Rating,
                    GoogleRatingCount = v.RatingCount,
                    Lat = lat + dLat,
                    Lng = lng + dLng,
                    Address = $"{v.Name} Şubesi (Merkez Mah. No: {rnd.Next(1, 95)})",
                    MapsUrl = $"https://www.google.com/maps/search/?api=1&query={lat + dLat},{lng + dLng}"
                });
            }
        }

        if (toAdd.Count > 0)
        {
            db.Restaurants.AddRange(toAdd);
        }

        await db.SaveChangesAsync(ct);
    }
}
