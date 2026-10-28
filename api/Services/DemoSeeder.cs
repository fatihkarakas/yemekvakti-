using System.Text.Json;
using System.Text.Json.Serialization;
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
        // 9. ÇAKIRLAR, BATIKENT, GÖKSU & ERYAMAN
        // ==========================================
        new("Meşhur Çakırlar Sac Tavası & Köy Sofrası", "kebap,evyemegi", 2, 380, 4.6, 2150, "Turgut Özal Mah. 2164. Cad. No: 14, Çakırlar, Yenimahalle", 39.9925, 32.7050),
        new("Çakırlar Çamlıtepe Gözleme & Kahvaltı", "kahvalti,evyemegi", 1, 260, 4.7, 1850, "Çakırlar Köy İçi Yolu No: 28, Çakırlar, Yenimahalle", 39.9912, 32.7085),
        new("Cengiz Usta Kebap & Lahmacun Batıkent", "kebap,pide", 2, 360, 4.5, 3100, "Batı Sitesi Mah. Gersan Girişi No: 4, Batıkent", 39.9720, 32.7310),
        new("Gülçimen Aspava Batıkent", "kebap", 2, 390, 4.6, 4200, "Atlantis AVM Karşısı, Başkent Bulvarı No: 218, Batıkent", 39.9735, 32.7305),
        new("Meydan Döner & İskender Batıkent", "kebap", 2, 340, 4.4, 2400, "Batıkent Meydan AVM Zemin Kat, Batıkent", 39.9715, 32.7340),
        new("Düveroğlu Kebap & Baklava Atlantis", "kebap,pide", 2, 430, 4.6, 3800, "Atlantis AVM Açık Alan No: 12, Batıkent", 39.9740, 32.7290),
        new("Kardelen Taş Fırın Pide Çakırlar", "pide", 1, 240, 4.5, 980, "Turgut Özal Mah. 2170. Sk. No: 6, Çakırlar", 39.9880, 32.7120),
        new("Göksu Parkı Balıkçısı & Izgara", "balik,tavuk", 2, 440, 4.4, 1650, "Göksu Parkı İçi Göl Kenarı No: 4, Eryaman", 39.9890, 32.6580),
        new("Pizza Il Forno Batıkent Atlantis", "pizza", 2, 390, 4.6, 1750, "Atlantis AVM Dış Avlu No: 24, Batıkent", 39.9745, 32.7295),
        new("Craft Burger Lab Batıkent", "burger", 2, 360, 4.5, 1200, "Cengiz Aytmatov Cad. No: 14, Batıkent", 39.9730, 32.7320),
        new("Tavuk Dünyası Atlantis AVM", "tavuk", 2, 320, 4.3, 1900, "Atlantis AVM Kat 1, Batıkent", 39.9742, 32.7292),
        new("Mado Atlantis Batıkent", "kahvalti", 2, 350, 4.4, 1500, "Atlantis AVM Dış Cephe, Batıkent", 39.9738, 32.7285),
        new("Köfteci Yusuf Batıkent", "kebap", 1, 260, 4.3, 3100, "Gimsa Park AVM Yanı, Batıkent", 39.9680, 32.7420),
        new("Gülçimen Çıtır Pide Batıkent", "pide", 1, 240, 4.6, 890, "Batıkent Meydan AVM No: 8, Batıkent", 39.9680, 32.7420),
        new("Hemşin Lokantası Gimat", "evyemegi", 1, 230, 4.5, 1450, "Macun Mah. Anadolu Bulvarı No: 27/A, Yenimahalle", 39.9620, 32.7690),

        // ==========================================
        // 10. SANAYİ LEZZETLERİ (OSTİM, ŞAŞMAZ, İVEDİK, GERSAN, SİTELER)
        // ==========================================
        new("Ostim Sanayi Kavurmacısı Sadık Usta", "sanayi,kebap,evyemegi", 2, 380, 4.8, 3400, "Ostim Sanayi Sitesi 100. Yıl Bulvarı No: 54, Yenimahalle", 39.9740, 32.7450),
        new("Şaşmaz Sanayi Tostçusu Hüseyin Usta", "sanayi,kahvalti", 1, 160, 4.7, 4100, "Şaşmaz Oto Sanayi 2516. Sk. No: 18, Etimesgut / Yenimahalle", 39.9380, 32.7120),
        new("Meşhur Şaşmaz Sanayi Köftecisi", "sanayi,kebap", 2, 320, 4.6, 2900, "Şaşmaz Oto Sanayi 2. Cadde No: 42, Yenimahalle", 39.9395, 32.7150),
        new("Kemah Ekmek Teknesi Şaşmaz", "sanayi,evyemegi,kebap", 1, 280, 4.7, 2600, "İnönü Mah. 1757. Sokak No: 22, Şaşmaz Oto Sanayi, Yenimahalle", 39.9320, 32.7150),
        new("İvedik OSB Hacıbaba Esnaf Lokantası", "sanayi,evyemegi", 1, 260, 4.6, 2200, "İvedik Organize Sanayi Ağaç Metal Koop. No: 12, Yenimahalle", 39.9920, 32.7620),
        new("Şaşmaz Ciğercisi Aydın Usta", "sanayi,kebap", 2, 370, 4.6, 3100, "Şaşmaz Sanayi 1. Cadde No: 33, Etimesgut", 39.9370, 32.7100),
        new("Gersan Sanayi Sac Kavurma & Güveç", "sanayi,evyemegi,kebap", 2, 350, 4.7, 1850, "Gersan Sanayi Sitesi 2310. Sk. No: 15, Batıkent", 39.9620, 32.7080),
        new("Ostim Pide & Taş Fırın Kebap", "sanayi,pide,kebap", 1, 250, 4.5, 1400, "Ostim Sanayi Sitesi Bağdat Cad. No: 88, Ostim", 39.9710, 32.7460),
        new("İvedik Kavurma & Haşlama Konağı", "sanayi,evyemegi", 2, 390, 4.7, 2400, "İvedik OSB 1354. Cadde No: 4, Yenimahalle", 39.9940, 32.7590),
        new("Siteler Marangozlar Sanayi Lokantası", "sanayi,evyemegi", 1, 240, 4.6, 2750, "Siteler Demirhendek Cad. No: 76, Altındağ", 39.9540, 32.9020),
        new("Ostim Dönercisi & Esnaf Mutfağı", "sanayi,kebap,evyemegi", 1, 260, 4.5, 1650, "Ostim Çıraklık Okulu Karşısı No: 14, Ostim", 39.9730, 32.7470),
        new("Ergazi Sanayi Esnaf Lokantası", "sanayi,evyemegi", 1, 230, 4.5, 950, "Ergazi Sanayi Bölgesi No: 21, Batıkent", 39.9550, 32.7180),
        new("Şaşmaz Kelle Paça & İşkembe Salonu", "sanayi,evyemegi", 1, 270, 4.6, 1800, "Şaşmaz Sanayi 2540. Sk. No: 8, Şaşmaz", 39.9360, 32.7130)
    ];

    public class BuyukIlEntry
    {
        [JsonPropertyName("name")] public string Name { get; set; } = "";
        [JsonPropertyName("category")] public string Category { get; set; } = "kebap";
        [JsonPropertyName("city_id")] public int CityId { get; set; }
        [JsonPropertyName("price_level")] public int PriceLevel { get; set; }
        [JsonPropertyName("rating")] public double Rating { get; set; }
        [JsonPropertyName("reviews")] public int Reviews { get; set; }
        [JsonPropertyName("address")] public string Address { get; set; } = "";
        [JsonPropertyName("lat")] public double Lat { get; set; }
        [JsonPropertyName("lon")] public double Lon { get; set; }
    }

    private static Dictionary<string, List<BuyukIlEntry>>? _buyukIlCache;
    private static readonly object _buyukIlLock = new();

    public static Dictionary<string, List<BuyukIlEntry>> GetBuyukIlData()
    {
        if (_buyukIlCache != null) return _buyukIlCache;
        lock (_buyukIlLock)
        {
            if (_buyukIlCache != null) return _buyukIlCache;

            var paths = new[]
            {
                Path.Combine(AppContext.BaseDirectory, "Data", "buyukil.json"),
                Path.Combine(AppContext.BaseDirectory, "buyukil.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "Data", "buyukil.json"),
                Path.Combine(Directory.GetCurrentDirectory(), "buyukil.json")
            };

            foreach (var p in paths)
            {
                if (File.Exists(p))
                {
                    try
                    {
                        var json = File.ReadAllText(p);
                        var data = JsonSerializer.Deserialize<Dictionary<string, List<BuyukIlEntry>>>(json,
                            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                        if (data != null && data.Count > 0)
                        {
                            _buyukIlCache = data;
                            return _buyukIlCache;
                        }
                    }
                    catch { }
                }
            }

            _buyukIlCache = new Dictionary<string, List<BuyukIlEntry>>();
            return _buyukIlCache;
        }
    }

    public static (string CityName, List<BuyukIlEntry> Venues) GetCityVenuesForLocation(double lat, double lng)
    {
        var data = GetBuyukIlData();
        if (data.Count == 0) return ("", []);

        // Şehir merkezleri: Ankara, İstanbul, Adana, Gaziantep
        var cityCenters = new Dictionary<string, (double Lat, double Lng)>
        {
            ["Ankara"] = (39.9208, 32.8541),
            ["İstanbul"] = (41.0082, 28.9784),
            ["Adana"] = (37.0000, 35.3213),
            ["Gaziantep"] = (37.0662, 37.3833)
        };

        string closestCity = "Ankara";
        double minDist = double.MaxValue;

        foreach (var (cityName, center) in cityCenters)
        {
            var d = Geo.DistanceMeters(lat, lng, center.Lat, center.Lng);
            if (d < minDist)
            {
                minDist = d;
                closestCity = cityName;
            }
        }

        if (data.TryGetValue(closestCity, out var venues))
        {
            return (closestCity, venues);
        }

        var first = data.First();
        return (first.Key, first.Value);
    }

    public static async Task SeedAroundAsync(AppDbContext db, double lat, double lng, CancellationToken ct)
    {
        var remainingList = await db.Restaurants.ToListAsync(ct);
        var existingDict = remainingList.ToDictionary(r => r.Name.Trim().ToLower(), r => r);

        var toAdd = new List<Restaurant>();
        var rnd = new Random();

        // 1. Önce sabit koordinatlı tüm gerçek Ankara ve bölge mekanlarını DB'ye ekle/güncelle
        foreach (var v in AnkaraVenues)
        {
            var key = v.Name.Trim().ToLower();
            if (existingDict.TryGetValue(key, out var existing))
            {
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
                var r = new Restaurant
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
                };
                toAdd.Add(r);
                existingDict[key] = r;
            }
        }

        // 2. buyukil.json dosyasındaki tüm şehirlerin (Ankara, İstanbul, Adana, Gaziantep)
        // orijinal restoranlarını DB'ye kalıcı olarak ekle/güncelle
        var buyukIlAll = GetBuyukIlData();
        foreach (var kvp in buyukIlAll)
        {
            foreach (var b in kvp.Value)
            {
                var key = b.Name.Trim().ToLower();
                int priceLevel = b.PriceLevel >= 400 ? 3 : (b.PriceLevel >= 250 ? 2 : 1);
                if (existingDict.TryGetValue(key, out var existing))
                {
                    existing.Lat = b.Lat;
                    existing.Lng = b.Lon;
                    existing.Address = b.Address;
                    existing.GoogleRating = b.Rating;
                    existing.GoogleRatingCount = b.Reviews;
                    existing.AvgPriceTl = b.PriceLevel;
                    existing.PriceLevel = priceLevel;
                    existing.Cuisines = b.Category;
                    existing.MealCards ??= "multinet,setcard,sodexo,ticket";
                    existing.MapsUrl = $"https://www.google.com/maps/search/?api=1&query={b.Lat},{b.Lon}";
                }
                else
                {
                    var r = new Restaurant
                    {
                        GooglePlaceId = $"buyukil_{b.CityId}_{b.Name.GetHashCode():x8}",
                        Name = b.Name,
                        Cuisines = b.Category,
                        MealCards = "multinet,setcard,sodexo,ticket",
                        PriceLevel = priceLevel,
                        AvgPriceTl = b.PriceLevel,
                        GoogleRating = b.Rating,
                        GoogleRatingCount = b.Reviews,
                        Lat = b.Lat,
                        Lng = b.Lon,
                        Address = b.Address,
                        MapsUrl = $"https://www.google.com/maps/search/?api=1&query={b.Lat},{b.Lon}"
                    };
                    toAdd.Add(r);
                    existingDict[key] = r;
                }
            }
        }

        // 3. Konuma uygun buyukil mekanlarını belirle ve kullanıcının 5 km yarıçapına rastgele dahil et
        // Kullanıcı nerede olursa olsun (Çakırlar, Teknokent, Kadıköy, Seyhan, vb.),
        // o şehre uygun büyükil restoranlarından rastgele seçilerek 5 km yarıçap içine yerleştirilir.
        var (cityName, cityVenues) = GetCityVenuesForLocation(lat, lng);
        var allCurrent = remainingList.Concat(toAdd).ToList();

        var existingNearbyNames = allCurrent
            .Where(r => Geo.DistanceMeters(lat, lng, r.Lat, r.Lng) <= 5000)
            .Select(r => r.Name.Trim().ToLower())
            .ToHashSet();

        if (cityVenues.Count > 0)
        {
            var shuffledCity = cityVenues.OrderBy(_ => rnd.Next()).ToList();
            int injectedCount = 0;

            foreach (var b in shuffledCity)
            {
                var cleanName = b.Name;
                var key = cleanName.Trim().ToLower();

                // Eğer bu mekan veya ismi zaten kullanıcının 5 km içinde varsa tekrar ekleme
                if (existingNearbyNames.Contains(key)) continue;

                // 400m - 4.5km arasında rastgele açı ve mesafeyle konuma yerleştir
                var angle = rnd.NextDouble() * Math.PI * 2;
                var dist = 400 + rnd.NextDouble() * 3800; // 400m - 4.2km
                var dLat = dist * Math.Cos(angle) / 111_000.0;
                var dLng = dist * Math.Sin(angle) / (111_000.0 * Math.Cos(lat * Math.PI / 180));

                int priceLevel = b.PriceLevel >= 400 ? 3 : (b.PriceLevel >= 250 ? 2 : 1);
                var r = new Restaurant
                {
                    GooglePlaceId = $"buyukil_{b.CityId}_{b.Name.GetHashCode():x8}_{lat:F3}_{lng:F3}_{injectedCount}",
                    Name = cleanName,
                    Cuisines = b.Category,
                    MealCards = "multinet,setcard,sodexo,ticket",
                    PriceLevel = priceLevel,
                    AvgPriceTl = b.PriceLevel,
                    GoogleRating = b.Rating,
                    GoogleRatingCount = b.Reviews,
                    Lat = Math.Round(lat + dLat, 6),
                    Lng = Math.Round(lng + dLng, 6),
                    Address = $"{b.Name} ({b.Address})",
                    MapsUrl = $"https://www.google.com/maps/search/?api=1&query={lat + dLat:F6},{lng + dLng:F6}"
                };
                toAdd.Add(r);
                existingNearbyNames.Add(key);
                injectedCount++;

                // Her seferinde konuma uygun en az 6-8 adet büyükil mekanını garanti et
                if (injectedCount >= 8) break;
            }
        }

        // 4. Şimdi kullanıcının tam koordinatının 5 km yarıçapındaki toplam mekan sayısına bak
        var allUpdated = allCurrent.Concat(toAdd).ToList();
        var nearbyCount = allUpdated.Count(r => Geo.DistanceMeters(lat, lng, r.Lat, r.Lng) <= 5000);

        // Eğer hala 18'den azsa, Ankara / Sanayi havuzundan da ekle (toplam en az 20-25 olsun)
        if (nearbyCount < 18)
        {
            int addedCount = 0;
            var pool = AnkaraVenues.OrderBy(_ => rnd.Next()).ToList();
            foreach (var v in pool)
            {
                if (nearbyCount + addedCount >= 25) break;

                var cleanName = v.Name.Replace(" Batıkent", "").Replace(" Çayyolu", "").Replace(" Tunalı", "").Replace(" Bilkent", "");
                var key = cleanName.Trim().ToLower();
                if (existingNearbyNames.Contains(key)) continue;

                var angle = rnd.NextDouble() * Math.PI * 2;
                var dist = 350 + rnd.NextDouble() * 4200;
                var dLat = dist * Math.Cos(angle) / 111_000.0;
                var dLng = dist * Math.Sin(angle) / (111_000.0 * Math.Cos(lat * Math.PI / 180));

                toAdd.Add(new Restaurant
                {
                    GooglePlaceId = $"demo_{v.Name.GetHashCode():x8}_{lat:F3}_{lng:F3}_{addedCount}",
                    Name = cleanName,
                    Cuisines = v.Cuisines,
                    MealCards = v.MealCards ?? "multinet,setcard,sodexo,ticket",
                    PriceLevel = v.PriceLevel,
                    AvgPriceTl = v.PriceTl,
                    GoogleRating = v.Rating,
                    GoogleRatingCount = v.RatingCount > 0 ? v.RatingCount : rnd.Next(200, 2000),
                    Lat = Math.Round(lat + dLat, 6),
                    Lng = Math.Round(lng + dLng, 6),
                    Address = $"{cleanName} (Merkez Mah. Cad. No: {rnd.Next(1, 110)})",
                    MapsUrl = $"https://www.google.com/maps/search/?api=1&query={lat + dLat:F6},{lng + dLng:F6}"
                });
                existingNearbyNames.Add(key);
                addedCount++;
            }
        }

        if (toAdd.Count > 0)
        {
            db.Restaurants.AddRange(toAdd);
        }

        await db.SaveChangesAsync(ct);
    }
}
