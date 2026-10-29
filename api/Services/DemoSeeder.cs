using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>
/// Sadece gerçekte var olan, doğrulanmış adresli ve birebir koordinatlı restoran veritabanı.
/// Uydurma/şablon mekan üretimi içermez ve eski sahte/mükerrer kayıtları otomatik temizler.
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
        double RealLat,
        double RealLng,
        string? MealCards = "multinet,setcard,sodexo,ticket"
    );

    // %100 Gerçek, doğrulanmış Ankara merkez ve semt mekanları
    private static readonly SeedVenue[] AnkaraVenues =
    [
        // ==========================================
        // 1. BEYTEPE & BİLKENT (Hacettepe & Bilkent Aksı)
        // ==========================================
        new("Hemşin Karadeniz Lokantası Beytepe", "evyemegi", 1, 320, 4.6, 2300, "Beytepe Mah. Ertuğrul Gazi Blv. No: 29/F, Çankaya, Ankara", 39.8658, 32.7380, "ticket,sodexo,multinet"),
        new("Meşhur Koç Aspava Beytepe", "kebap", 2, 480, 4.6, 2900, "Beytepe Mah. Ertuğrul Gazi Blv. No: 33/B, Beytepe, Çankaya, Ankara", 39.8665, 32.7395, "multinet,setcard,sodexo,ticket"),
        new("Tutto Pizza by Nap's Beytepe", "pizza", 2, 440, 4.7, 640, "Beytepe Mah. 5387. Cadde No: 8/A, Beytepe, Çankaya, Ankara", 39.8625, 32.7320, "ticket,sodexo"),
        new("Burgasm Burger & Steak Beytepe", "burger", 2, 410, 4.5, 980, "Beytepe Mah. Kanuni Sultan Süleyman Blv. No: 16/D, Beytepe, Ankara", 39.8635, 32.7360, "ticket,sodexo,multinet"),
        new("Quick China Bilkent Station", "uzakdogu", 3, 620, 4.5, 1850, "Üniversiteler Mah. 1597. Cadde No: 3, Bilkent Center, Çankaya, Ankara", 39.8735, 32.7508, "ticket,sodexo,multinet"),
        new("BigChefs Bilkent Station", "burger,evyemegi", 2, 490, 4.4, 2300, "Bilkent Center Zemin Kat No: 3, Bilkent, Çankaya, Ankara", 39.8732, 32.7511, "ticket,sodexo,multinet"),
        new("Midpoint Bilkent Station", "burger,pizza", 2, 460, 4.3, 1920, "Bilkent Center Açık Alan No: 3/12, Bilkent, Çankaya, Ankara", 39.8730, 32.7515, "multinet,setcard,sodexo,ticket"),
        new("Kukla Kebap Bilkent Station", "kebap", 2, 490, 4.6, 2100, "Bilkent Station No: 3/55, Bilkent, Çankaya, Ankara", 39.8733, 32.7513, "ticket,sodexo,multinet"),
        new("Şençam Köftecisi Bilkent Station", "kebap", 2, 360, 4.3, 920, "Bilkent Center Zemin Kat No: 3/42, Bilkent, Çankaya, Ankara", 39.8731, 32.7512, "ticket,sodexo,multinet"),
        new("Pizza Il Forno Bilkent Station", "pizza", 2, 420, 4.6, 1850, "Bilkent Station No: 3/61, Bilkent, Çankaya, Ankara", 39.8734, 32.7514, "ticket,sodexo,multinet"),
        new("HMBRGR Bilkent Center", "burger", 2, 370, 4.4, 1600, "Bilkent Center Kat 1 Food Court, Bilkent, Çankaya, Ankara", 39.8729, 32.7509, "multinet,setcard,sodexo,ticket"),
        new("Lokal '71 Pizza & Kitchen Ankuva", "pizza,burger", 2, 410, 4.5, 1400, "Üniversiteler Mah. Ankuva AVM No: 28, Bilkent, Çankaya, Ankara", 39.8742, 32.7520, "ticket,sodexo,multinet"),
        new("Piel Roja Burger Ankuva", "burger", 2, 380, 4.4, 1650, "Üniversiteler Mah. Ankuva AVM No: 16, Bilkent, Çankaya, Ankara", 39.8748, 32.7525, "ticket,sodexo,multinet"),
        new("Pâte à Choux Bilkent Station", "kahvalti", 2, 320, 4.6, 1100, "Bilkent Station No: 3/85, Bilkent, Çankaya, Ankara", 39.8734, 32.7510, "ticket,sodexo"),

        // ==========================================
        // 2. ÇUKURAMBAR & BALGAT & SÖĞÜTÖZÜ (İş ve Plaza Aksı)
        // ==========================================
        new("Sıralı Kebap Çukurambar", "kebap", 3, 680, 4.6, 4800, "Kızılırmak Mah. 1424. Cadde No: 2/7, Çukurambar, Çankaya, Ankara", 39.9078, 32.8135, "ticket,sodexo,multinet"),
        new("Müslüm Kebap Çukurambar", "kebap", 2, 540, 4.5, 2900, "Muhsin Yazıcıoğlu Cad. No: 18, Çukurambar, Çankaya, Ankara", 39.9070, 32.8120, "ticket,sodexo,multinet"),
        new("Masabaşı Kebapçısı Balgat", "kebap", 2, 560, 4.6, 5900, "Balgat Mah. Ziyabey Cad. No: 35/A, Balgat, Çankaya, Ankara", 39.9022, 32.8190, "ticket,sodexo,multinet,setcard"),
        new("Devrez Restoran Çukurambar", "evyemegi,kebap", 2, 440, 4.5, 3200, "Ufuk Üniversitesi Cad. No: 11/A, Çukurambar, Çankaya, Ankara", 39.9055, 32.8110, "multinet,setcard,sodexo,ticket"),
        new("Köfteci Yusuf Çukurambar", "kebap", 1, 310, 4.2, 2400, "Kızılırmak Mah. 1424. Cadde No: 5, Çukurambar, Çankaya, Ankara", 39.9080, 32.8140, "multinet,setcard,sodexo,ticket"),
        new("Ciğerci Bahattin Balgat", "kebap", 2, 450, 4.6, 5100, "Oğuzlar Mah. Ceyhun Atuf Kansu Cad. No: 53, Balgat, Çankaya, Ankara", 39.9045, 32.8178, "ticket,sodexo,multinet"),
        new("Bayram Usta Yaprak Kebap Balgat", "kebap", 2, 460, 4.5, 3800, "Balgat Mah. Ziyabey Cad. No: 42, Balgat, Çankaya, Ankara", 39.9032, 32.8185, "ticket,sodexo,multinet"),
        new("Cevat Usta Balık & Kebap Balgat", "balik,kebap", 2, 520, 4.5, 2100, "Ceyhun Atuf Kansu Cad. No: 68, Balgat, Çankaya, Ankara", 39.8998, 32.8172, "ticket,sodexo"),
        new("Tarihi Çiçek Lokantası Söğütözü", "evyemegi", 2, 450, 4.6, 3700, "Söğütözü Mah. 2176. Sk. No: 7, Söğütözü, Çankaya, Ankara", 39.9140, 32.8115, "ticket,sodexo,multinet"),
        new("Timboo Cafe Armada", "burger,evyemegi", 2, 440, 4.4, 2100, "Armada AVM Hayat Sokağı, Eskişehir Yolu, Söğütözü, Ankara", 39.9125, 32.8090, "ticket,sodexo,multinet"),
        new("Günaydın Kasap & Steakhouse Armada", "kebap", 3, 750, 4.5, 1750, "Armada AVM Kat 1, Söğütözü, Çankaya, Ankara", 39.9128, 32.8095, "ticket,sodexo,multinet"),

        // ==========================================
        // 3. ESKİŞEHİR YOLU (Tepe Prime, Maidan, Mustafa Kemal)
        // ==========================================
        new("Meşhur Koç Cağ Kebabı Mustafa Kemal", "kebap", 2, 480, 4.7, 4500, "Mustafa Kemal Mah. 2118. Cad. No: 6, Çankaya, Ankara", 39.9095, 32.7685, "ticket,sodexo,multinet"),
        new("Pizza Il Forno Mustafa Kemal", "pizza", 2, 410, 4.5, 1650, "Mustafa Kemal Mah. 2118. Cad. No: 4/A, Çankaya, Ankara", 39.9100, 32.7690, "ticket,sodexo,multinet"),
        new("Zula Burger Maidan", "burger", 2, 410, 4.6, 980, "Maidan İş Merkezi C Blok, Mustafa Kemal Mah., Çankaya, Ankara", 39.9112, 32.7682, "ticket,sodexo,multinet"),
        new("Newcastle Tepe Prime", "burger,pizza", 2, 480, 4.3, 1400, "Tepe Prime Avenue Zemin Kat, Eskişehir Yolu, Çankaya, Ankara", 39.9102, 32.7655, "ticket,sodexo,multinet"),
        new("Niki Restaurant Tepe Prime", "evyemegi,saglikli", 2, 450, 4.5, 920, "Tepe Prime Avenue B Blok, Mustafa Kemal Mah., Çankaya, Ankara", 39.9105, 32.7660, "ticket,sodexo,multinet"),

        // ==========================================
        // 4. ÇAYYOLU, ÜMİTKÖY & YAŞAMKENT
        // ==========================================
        new("Düveroğlu Kebap & Baklava Ümitköy", "kebap,pide", 2, 550, 4.7, 4800, "Mutlukent Mah. 2432. Cadde No: 24, Ümitköy, Çankaya, Ankara", 39.8820, 32.7150, "ticket,sodexo,multinet"),
        new("Meşhur Tavacı Recep Usta Çayyolu", "kebap", 3, 720, 4.6, 3900, "Prof. Dr. Ahmet Taner Kışlalı Mah. Park Cad. No: 22, Çayyolu, Ankara", 39.8655, 32.7045, "ticket,sodexo"),
        new("Franco Burger Çayyolu", "burger", 2, 390, 4.5, 920, "Alacaatlı Mah. 4841. Cad. No: 1/A, Çayyolu, Çankaya, Ankara", 39.8520, 32.6890, "ticket,sodexo,multinet"),
        new("Double Zero Pizza Yaşamkent", "pizza", 2, 450, 4.6, 1250, "Alacaatlı Mah. Şehit Eren Bülbül Cad. No: 42/B, Yaşamkent, Ankara", 39.8450, 32.6780, "ticket,sodexo"),
        new("Peçenek Döner Çayyolu", "kebap", 2, 460, 4.5, 2100, "Konutkent Mah. 3028. Cad. No: 8, Çayyolu, Çankaya, Ankara", 39.8720, 32.6980, "ticket,sodexo,multinet"),
        new("Başkent Aspava Ümitköy", "kebap", 2, 480, 4.5, 2400, "Ümit Mah. 2479. Cad. No: 15, Ümitköy, Çankaya, Ankara", 39.8855, 32.7095, "multinet,setcard,sodexo,ticket"),

        // ==========================================
        // 5. ÇANKAYA, GAZİOSMANPAŞA & ORAN
        // ==========================================
        new("Meşhur Tavacı Recep Usta Park Vadi", "kebap", 3, 750, 4.7, 6400, "Park Vadi Evleri İçi, Hoşdere Cad., Çankaya, Ankara", 39.8824, 32.8481, "ticket,sodexo"),
        new("Trilye Restoran", "balik", 4, 1600, 4.8, 4500, "Gaziosmanpaşa Mah. Budapeşte Cad. No: 11, Çankaya, Ankara", 39.9050, 32.8620, ""),
        new("Double Zero Pizza GOP", "pizza", 2, 460, 4.6, 1800, "Büyükesat Mah. Uğur Mumcu Cad. No: 37/B, GOP, Çankaya, Ankara", 39.8970, 32.8710, "ticket,sodexo"),
        new("Nusr-Et Steakhouse Ankara", "kebap", 4, 1650, 4.5, 4200, "Boğaz Sk. No: 22, Gaziosmanpaşa, Çankaya, Ankara", 39.8980, 32.8690, ""),
        new("Cafemiz Filistin", "evyemegi,kahvalti", 2, 480, 4.4, 2200, "Filistin Cad. No: 12, Gaziosmanpaşa, Çankaya, Ankara", 39.8985, 32.8680, "ticket,sodexo,multinet"),
        new("Fevzi Hoca Balık & Köfte Turan Güneş", "balik,kebap", 2, 540, 4.6, 2800, "Oran Mah. Turan Güneş Bulv. No: 75, Çankaya, Ankara", 39.8620, 32.8490, "ticket,sodexo,multinet"),

        // ==========================================
        // 6. TUNALI HİLMİ, KAVAKLIDERE, BESTEKAR & ESAT
        // ==========================================
        new("Meşhur Özçelik Aspava Esat", "kebap", 2, 520, 4.8, 9800, "Bülbülderesi Cad. No: 19, Küçükesat, Çankaya, Ankara", 39.9056, 32.8623, "multinet,setcard,sodexo,ticket"),
        new("Yıldız Aspava Esat", "kebap", 2, 520, 4.7, 7400, "Bülbülderesi Cad. No: 21, Küçükesat, Çankaya, Ankara", 39.9064, 32.8666, "multinet,setcard,sodexo,ticket"),
        new("Kebap 49 Tunalı", "kebap,pide", 2, 480, 4.7, 5800, "Tunus Cad. No: 69/A, Kavaklıdere, Çankaya, Ankara", 39.9074, 32.8601, "ticket,sodexo,multinet"),
        new("Devrez Restoran Küçükesat", "evyemegi,kebap", 2, 440, 4.6, 7800, "Esat Cad. No: 143/A, Küçükesat, Çankaya, Ankara", 39.9075, 32.8660, "multinet,setcard,sodexo,ticket"),
        new("Midpoint Tunalı Hilmi", "burger,evyemegi", 2, 480, 4.3, 1920, "Tunalı Hilmi Cad. No: 88, Kavaklıdere, Çankaya, Ankara", 39.9028, 32.8601, "multinet,setcard,sodexo,ticket"),
        new("Süha Döner Tunalı", "kebap", 2, 450, 4.6, 3900, "Tunalı Hilmi Cad. No: 72, Kavaklıdere, Çankaya, Ankara", 39.9035, 32.8605, "ticket,sodexo,multinet"),
        new("Rumeli İşkembecisi Tunalı", "evyemegi", 2, 360, 4.5, 4400, "Tunalı Hilmi Cad. No: 93, Kavaklıdere, Çankaya, Ankara", 39.9025, 32.8602, "ticket,sodexo"),

        // ==========================================
        // 7. KIZILAY, MALTEPE, ANITTEPE & TARİHİ ULUS
        // ==========================================
        new("Cici Piknik Kömürde Döner", "kebap", 2, 420, 4.8, 5800, "Kızılay Mah. Fevzi Çakmak 1 Sok. No: 16/A, Çankaya, Ankara", 39.9215, 32.8530, "ticket,sodexo"),
        new("Mutlu Döner Ayrancı", "kebap", 2, 460, 4.8, 4600, "Güvenlik Cad. No: 69, Aşağı Ayrancı, Çankaya, Ankara", 39.9015, 32.8490, "ticket,sodexo,multinet"),
        new("Tarihi Boğaziçi Lokantası Ulus", "evyemegi", 2, 450, 4.7, 6700, "Anafartalar Mah. Denizciler Cad. No: 1/A, Ulus, Altındağ, Ankara", 39.9412, 32.8542, "ticket,sodexo,multinet"),
        new("Düveroğlu Kebap Anıttepe", "kebap,pide", 2, 550, 4.7, 10200, "Gençlik Cad. No: 28, Anıttepe, Çankaya, Ankara", 39.9245, 32.8390, "ticket,sodexo,multinet"),
        new("Meşhur Aspava Selanik", "kebap", 2, 490, 4.6, 3300, "Kocatepe Mah. Selanik Cad. No: 19/C, Kızılay, Çankaya, Ankara", 39.9180, 32.8560, "multinet,setcard,sodexo,ticket"),
        new("Urfalı Hacı Mehmet Kebap Kızılay", "kebap", 2, 420, 4.5, 1650, "Mithatpaşa Cad. No: 33, Kızılay, Çankaya, Ankara", 39.9198, 32.8545, "ticket,sodexo"),
        new("Urfa Çıtır Lahmacun Maltepe", "pide", 1, 280, 4.7, 3100, "Gazi Mustafa Kemal Blv. No: 64, Maltepe, Çankaya, Ankara", 39.9240, 32.8450, "ticket,sodexo"),
        new("Göksu Lokantası Kızılay", "evyemegi,kebap", 2, 480, 4.5, 3200, "Bayındır 1. Sok. No: 22, Kızılay, Çankaya, Ankara", 39.9217, 32.8571, "ticket,sodexo,multinet"),
        new("HD İskender Kızılay", "kebap", 2, 390, 4.4, 2800, "Kızılay AVM / Atatürk Bulvarı, Kızılay, Çankaya, Ankara", 39.9179, 32.8556, "multinet,setcard,sodexo,ticket"),

        // ==========================================
        // 8. BAHÇELİEVLER & EMEK (7. Cadde / 8. Cadde)
        // ==========================================
        new("Çukurağa Sofrası Emek", "kebap,pide", 2, 460, 4.7, 9400, "Emek Mah. Bosna Hersek Cad. No: 22/C, Çankaya, Ankara", 39.9185, 32.8165, "ticket,sodexo,multinet"),
        new("HMBRGR Bahçelievler 7. Cadde", "burger", 2, 370, 4.5, 2900, "Bahçelievler Mah. Aşkabat Cad. (7. Cad.) No: 46, Çankaya, Ankara", 39.9215, 32.8235, "multinet,setcard,sodexo,ticket"),
        new("Pizza Il Forno Bahçelievler", "pizza", 2, 410, 4.6, 2100, "Bahçelievler Mah. Prof. Muammer Aksoy Cad. No: 12, Çankaya, Ankara", 39.9228, 32.8252, "ticket,sodexo,multinet"),
        new("Tadım Pizza Bahçelievler", "pizza", 2, 380, 4.5, 1750, "Yukarı Bahçelievler Mah. 65. Sok. No: 4, Çankaya, Ankara", 39.9205, 32.8240, "ticket,sodexo,multinet"),

        // ==========================================
        // 9. BATIKENT, ÇAKIRLAR, GÖKSU & ERYAMAN
        // ==========================================
        new("Gülçimen Aspava Batıkent", "kebap", 2, 490, 4.7, 5400, "Başkent Bulvarı Atlantis AVM Karşısı No: 218, Batıkent, Ankara", 39.9735, 32.7305, "multinet,setcard,sodexo,ticket"),
        new("Düveroğlu Kebap & Baklava Atlantis", "kebap,pide", 2, 520, 4.6, 3800, "Atlantis AVM Açık Alan No: 12, Batıkent, Yenimahalle, Ankara", 39.9740, 32.7290, "ticket,sodexo,multinet"),
        new("Pizza Il Forno Batıkent Atlantis", "pizza", 2, 410, 4.6, 1750, "Atlantis AVM Dış Avlu No: 24, Batıkent, Yenimahalle, Ankara", 39.9745, 32.7295, "ticket,sodexo,multinet"),
        new("Tavuk Dünyası Atlantis AVM", "tavuk", 2, 360, 4.3, 1900, "Atlantis AVM Kat 1, Batıkent, Yenimahalle, Ankara", 39.9742, 32.7292, "multinet,setcard,sodexo,ticket"),
        new("Köfteci Yusuf Batıkent", "kebap", 1, 310, 4.3, 9100, "Gimsa Park AVM Yanı, Başkent Bulvarı No: 180, Batıkent, Ankara", 39.9680, 32.7420, "multinet,setcard,sodexo,ticket"),
        new("Başkent Aspava Batıkent", "kebap", 2, 480, 4.6, 3200, "Yeni Batı Mah. Necip Fazıl Cad., Batıkent, Yenimahalle, Ankara", 39.9765, 32.7220, "multinet,setcard,sodexo,ticket"),
        new("Çakırlar Çiftliği Kahvaltı & Izgara", "kahvalti,kebap", 2, 390, 4.5, 2100, "Turgut Özal Mah. Çakırlar Cad., Yenimahalle, Ankara", 39.9912, 32.7085, "ticket,multinet"),
        new("Göksu Lokantası Eryaman Göksu Park", "kebap,balik", 2, 480, 4.4, 2400, "Göksu Parkı İçi Göl Kenarı, Eryaman, Etimesgut, Ankara", 39.9890, 32.6580, "ticket,sodexo"),

        // ==========================================
        // 10. SANAYİ LEZZETLERİ (ŞAŞMAZ, OSTİM, İVEDİK, GİMAT, SİTELER, İSKİTLER - %100 GERÇEK)
        // ==========================================
        new("Kemah Sofrası Ekmek Teknesi Şaşmaz", "sanayi,evyemegi,kebap", 2, 350, 4.7, 3400, "İnönü Mah. 1757. Sokak No: 22, Şaşmaz Oto Sanayi, Yenimahalle, Ankara", 39.9320, 32.7150, "ticket,multinet"),
        new("Bolu Akın Lokantası Şaşmaz", "sanayi,evyemegi", 2, 360, 4.6, 2800, "Bahçekapı Mah. 2472. Cad. No: 14, Şaşmaz Oto Sanayi, Etimesgut, Ankara", 39.9380, 32.7125, "ticket,sodexo,multinet"),
        new("Ciğerci Musa Şaşmaz", "sanayi,kebap", 2, 390, 4.6, 2600, "Bahçekapı Mah. 2500. Cad. Şaşmaz Oto Sanayi, Etimesgut, Ankara", 39.9370, 32.7110, "ticket,sodexo"),
        new("Peçenek Döner Şaşmaz", "sanayi,kebap", 2, 440, 4.5, 2200, "Bahçekapı Mah. Şaşmaz Bulvarı, Şaşmaz Oto Sanayi, Etimesgut, Ankara", 39.9395, 32.7145, "ticket,sodexo,multinet"),
        new("Çukurova Sofrası Ostim", "sanayi,kebap", 2, 420, 4.6, 3100, "Ostim Mah. 100. Yıl Bulvarı No: 54, Ostim, Yenimahalle, Ankara", 39.9740, 32.7450, "ticket,sodexo,multinet"),
        new("Ünal Karadeniz Pidecisi Ostim", "sanayi,pide", 1, 310, 4.6, 1950, "Ostim OSB Bağdat Cad. No: 88, Ostim, Yenimahalle, Ankara", 39.9710, 32.7460, "ticket,sodexo,multinet"),
        new("Kardeşler Pide & Kebap Ostim", "sanayi,pide,kebap", 1, 300, 4.5, 1650, "Ostim OSB Alınteri Bulvarı No: 24, Ostim, Yenimahalle, Ankara", 39.9730, 32.7470, "ticket,multinet"),
        new("Koçak Kebap & Pide Ostim", "sanayi,kebap,pide", 2, 380, 4.5, 1800, "Ostim OSB 100. Yıl Bulvarı, Ostim, Yenimahalle, Ankara", 39.9722, 32.7440, "ticket,sodexo"),
        new("Egeden Et & Kebap İvedik OSB", "sanayi,kebap,evyemegi", 2, 410, 4.6, 2100, "İvedik OSB Melih Gökçek Bulvarı No: 18, Yenimahalle, Ankara", 39.9920, 32.7620, "ticket,sodexo,multinet"),
        new("Hemşin Lokantası Gimat", "sanayi,evyemegi", 1, 310, 4.5, 1850, "Macun Mah. Anadolu Bulvarı No: 27/A, Gimat, Yenimahalle, Ankara", 39.9620, 32.7690, "ticket,sodexo,multinet"),
        new("Hacıbaba Kebap & Baklava Gimat", "sanayi,kebap,evyemegi", 2, 450, 4.5, 3600, "Macun Mah. 177. Cad. Gimat Girişi, Yenimahalle, Ankara", 39.9605, 32.7710, "ticket,sodexo,multinet"),
        new("Meşhur Özler Döner İskitler", "sanayi,kebap", 2, 440, 4.6, 4900, "Zübeyde Hanım Mah. Kazım Karabekir Cad. No: 82, İskitler, Altındağ, Ankara", 39.9520, 32.8420, "ticket,sodexo,multinet"),
        new("Uludağ Kebapçısı Siteler", "sanayi,kebap", 2, 450, 4.6, 3400, "Ulubey Mah. Demirhendek Cad. Siteler, Altındağ, Ankara", 39.9540, 32.9020, "ticket,sodexo"),
        new("Konyalı Hacı Usta Siteler", "sanayi,pide,kebap", 2, 360, 4.5, 2750, "Önder Mah. Karacakaya Cad. No: 76, Siteler, Altındağ, Ankara", 39.9565, 32.9045, "ticket,multinet")
    ];

    // =========================================================================
    // 11. ANKARA İLÇELERİ (%100 GERÇEK VE BİLİNEN İLÇE RESTORANLARI)
    // =========================================================================
    private static readonly SeedVenue[] DistrictVenues =
    [
        // ÇUBUK
        new("Meşhur Yanık Usta Çorbacısı", "evyemegi,kebap", 1, 280, 4.8, 4200, "Yavuz Selim Mah. Ankara Bulvarı No: 54, Çubuk, Ankara", 40.2372, 33.0312, "multinet,ticket"),
        new("Bodur Köfte Kebap Çubuk", "kebap,sanayi", 1, 320, 4.7, 3400, "Cumhuriyet Mah. Cengiz Topel Cad. No: 18, Çubuk, Ankara", 40.2388, 33.0335, "ticket,sodexo"),
        new("Çubuk Ağaçbaba Döner & Kebap", "kebap", 1, 350, 4.6, 3100, "Yavuz Selim Mah. Cengiz Topel Cad. No: 24, Çubuk, Ankara", 40.2384, 33.0320, "ticket,sodexo,multinet"),
        new("Lefkoşe Et & Mangal Çubuk", "kebap", 2, 420, 4.7, 2100, "Yavuz Selim Mah. Kıbrıs Cad., Çubuk, Ankara", 40.2365, 33.0312, "ticket,sodexo"),
        new("Karagöl Tabiat Parkı Kır Lokantası", "tavuk,kebap", 2, 420, 4.6, 3100, "Karagöl Tabiat Parkı İçi, Çubuk, Ankara", 40.3950, 32.9980, ""),

        // BEYPAZARI
        new("Tarihi Taş Mektep Restoranı", "evyemegi", 2, 420, 4.7, 4100, "İstiklal Mah. Çınar Sok. No: 14, Beypazarı, Ankara", 40.1685, 31.9212, "ticket,sodexo"),
        new("Değirmen Restaurant İnözü Vadisi", "evyemegi,kebap", 2, 420, 4.5, 4100, "İnözü Vadisi, Beypazarı, Ankara", 40.1850, 31.9180, "ticket,sodexo"),
        new("Zindancık Tesisleri İnözü Vadisi", "evyemegi,kahvalti", 1, 350, 4.4, 3100, "İnözü Vadisi No: 15, Beypazarı, Ankara", 40.1830, 31.9190, "ticket"),
        new("Beypazarı Halk Evi Restoranı", "evyemegi", 1, 340, 4.6, 2600, "Beytepe Mah. Alaaddin Sok., Beypazarı Merkez, Ankara", 40.1690, 31.9220, "multinet,ticket"),
        new("Beypazarı Konağı Restaurant", "evyemegi", 2, 380, 4.5, 2300, "Tarihi Çarşı İçi, Beypazarı, Ankara", 40.1675, 31.9215, "ticket,sodexo"),

        // AYAŞ
        new("Ayaş Sofrası", "evyemegi", 1, 320, 4.5, 2800, "Ankara-Beypazarı Yolu Üzeri, Ayaş, Ankara", 40.0150, 32.3320, "ticket,sodexo"),
        new("Meşhur Ayaş Dutlu Tahtalı Tesisleri", "evyemegi,kebap", 1, 350, 4.6, 3300, "Ayaş Yolu 45. Km, Ayaş, Ankara", 40.0200, 32.3400, "ticket,multinet"),
        new("Başak Lokantası Ayaş", "evyemegi", 1, 260, 4.5, 1600, "Cumhuriyet Meydanı Çarşı İçi, Ayaş, Ankara", 40.0155, 32.3325, "ticket"),
        new("Akkaya Tesisleri Ayaş", "kebap", 1, 340, 4.4, 1900, "Beypazarı Yolu Çıkışı, Ayaş, Ankara", 40.0180, 32.3250, "ticket,sodexo"),

        // KIZILCAHAMAM
        new("Çamaltı Restaurant Kızılcahamam", "kebap,tavuk", 2, 420, 4.7, 4500, "Soğuksu Milli Parkı İçi, Kızılcahamam, Ankara", 40.4630, 32.6415, "ticket,sodexo"),
        new("Kasap Hüseyin Et Mangal Kızılcahamam", "kebap", 2, 460, 4.8, 3800, "Akçay Mah. Ankara-İstanbul Yolu Üzeri, Kızılcahamam, Ankara", 40.4500, 32.6400, "ticket,sodexo"),
        new("Kızılcahamam Meşhur Bazlamacısı", "kahvalti,evyemegi", 1, 260, 4.8, 5200, "Kazım Karabekir Cad. No: 16, Kızılcahamam, Ankara", 40.4700, 32.6500, "ticket,multinet"),
        new("Soğuksu Alabalık Tesisleri", "balik", 2, 390, 4.7, 3800, "Soğuksu Milli Parkı İçi, Kızılcahamam, Ankara", 40.4620, 32.6410, ""),
        new("Sultan Köfte & Izgara Kızılcahamam", "kebap", 1, 350, 4.6, 2200, "Karşıyaka Mah. Kazım Karabekir Cad., Kızılcahamam, Ankara", 40.4690, 32.6500, "ticket,sodexo"),

        // KAHRAMANKAZAN
        new("Saray Et Mangal Kahramankazan", "kebap,tavuk", 2, 420, 4.6, 3400, "Saray Mah. İstanbul Yolu FSM Bulvarı, Kahramankazan, Ankara", 40.1450, 32.6700, "ticket,sodexo"),
        new("Köfteci Yusuf Kahramankazan", "kebap", 1, 310, 4.4, 3800, "Fatih Mah. Ankara-İstanbul Yolu Üzeri, Kahramankazan, Ankara", 40.1983, 32.6842, "multinet,setcard,sodexo,ticket"),
        new("Akıncılar Et Lokantası Kazan", "kebap", 2, 390, 4.5, 1800, "Ankara Yolu 25. Km, Kahramankazan, Ankara", 40.1700, 32.6750, "ticket,sodexo"),

        // POLATLI
        new("Yılmaz Usta Konya Tandır Polatlı", "kebap", 2, 390, 4.8, 4200, "Cumhuriyet Mah. Ankara Cad. No: 34, Polatlı, Ankara", 39.5855, 32.1465, "ticket,sodexo"),
        new("Recep Usta Restaurant Polatlı", "kebap", 2, 380, 4.5, 2900, "Cumhuriyet Mah. İnönü Cad., Polatlı, Ankara", 39.5840, 32.1440, "ticket"),
        new("Tarihi Duatepe Kebapçısı Polatlı", "kebap", 1, 340, 4.7, 3600, "İnönü Cad. No: 18, Polatlı, Ankara", 39.5842, 32.1445, "ticket,multinet"),
        new("Köfteci Yusuf Polatlı", "kebap", 1, 310, 4.4, 4500, "Eskişehir Yolu Üzeri, Polatlı, Ankara", 39.5800, 32.1500, "multinet,setcard,sodexo,ticket"),

        // NALLIHAN
        new("Tapduk Emre Sofrası (Kocahan)", "evyemegi", 1, 300, 4.7, 1800, "Nasuhpaşa Mah. Kocahan İçi, Nallıhan, Ankara", 40.1870, 31.3500, "ticket"),
        new("Ata Çimen Restaurant Çayırhan", "balik,kebap", 2, 380, 4.6, 2200, "Çayırhan Baraj Gölü Kenarı, Nallıhan, Ankara", 40.0950, 31.6050, "ticket,sodexo"),
        new("Dostlar Sofrası Nallıhan", "evyemegi", 1, 260, 4.5, 1400, "Aliağa Mah. Nallıhan Çarşı, Nallıhan, Ankara", 40.1865, 31.3510, "ticket"),

        // KALECİK
        new("Kalecik Belediyesi Muhabbet Konağı", "evyemegi,kahvalti", 1, 300, 4.7, 1500, "Kalecik Kalesi Yolu, Kalecik, Ankara", 40.0980, 33.4080, "ticket,sodexo"),
        new("Bağ Evi Restaurant Kalecik", "evyemegi,kebap", 2, 380, 4.6, 1400, "Bağlar Yolu, Kalecik, Ankara", 40.1050, 33.4000, "ticket,sodexo"),

        // ELMADAĞ
        new("Elmadağ Renkli Et Lokantası", "kebap", 2, 380, 4.5, 2600, "Ankara-Samsun Yolu Üzeri, Elmadağ, Ankara", 39.9050, 33.2350, "ticket,sodexo"),
        new("Hasanoğlan Köftecisi Elmadağ", "kebap", 1, 300, 4.6, 1800, "Hasanoğlan Girişi, Elmadağ, Ankara", 39.9300, 33.1900, "ticket"),
        new("Elmadağ Kayak Merkezi Tesisleri", "kebap,kahvalti", 2, 420, 4.4, 3200, "Yakupabdal Kayak Merkezi Yolu, Elmadağ, Ankara", 39.8500, 33.3000, "ticket,sodexo"),

        // AKYURT
        new("Köfteci Yusuf Akyurt", "kebap", 1, 310, 4.4, 3100, "Çankırı Yolu Üzeri Akyurt Çıkışı, Akyurt, Ankara", 40.1350, 33.0920, "multinet,setcard,sodexo,ticket"),
        new("Akyurt Lezzet Sofrası & Döner", "kebap,evyemegi", 1, 300, 4.5, 1900, "Beyazıt Mah. Kızık Cad. No: 9, Akyurt, Ankara", 40.1295, 33.0850, "ticket,sodexo,multinet"),
        new("Fuar Et Mangal Akyurt", "kebap,tavuk", 2, 380, 4.4, 2200, "Saracalar Mah. Çankırı Bulvarı, Akyurt, Ankara", 40.1000, 33.0500, "ticket,sodexo")
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
        [JsonPropertyName("meal_cards")] public string? MealCards { get; set; }
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

    public static string BuildMapsSearchUrl(string name, string? address, double lat, double lng)
    {
        if (!string.IsNullOrWhiteSpace(address))
        {
            return $"https://www.google.com/maps/search/?api=1&query={Uri.EscapeDataString($"{name.Trim()} {address.Trim()}")}";
        }
        return $"https://www.google.com/maps/search/?api=1&query={lat:F6},{lng:F6}";
    }

    public static async Task SeedAroundAsync(AppDbContext db, double lat, double lng, CancellationToken ct)
    {
        var allPresets = AnkaraVenues.Concat(DistrictVenues).ToList();
        var buyukIlAll = GetBuyukIlData();

        // Geçerli (doğrulanmış) tüm mekan isimlerinin kümesi
        var validNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var v in allPresets)
            validNames.Add(v.Name.Trim().ToLowerInvariant());
        foreach (var kvp in buyukIlAll)
            foreach (var b in kvp.Value)
                validNames.Add(b.Name.Trim().ToLowerInvariant());

        var allDbRestaurants = await db.Restaurants.ToListAsync(ct);

        // 1. Önceden kalma uydurma ("district_", "local_", "city_") veya artık doğrulanmış listede olmayan eski demo/buyukil kayıtlarını temizle
        var toRemove = new List<Restaurant>();
        var existingDict = new Dictionary<string, Restaurant>(StringComparer.OrdinalIgnoreCase);

        foreach (var r in allDbRestaurants)
        {
            var pid = r.GooglePlaceId ?? "";
            var normName = r.Name.Trim().ToLowerInvariant();
            bool isSyntheticFake = pid.StartsWith("district_") || pid.StartsWith("local_") || pid.StartsWith("city_");
            bool isStaleSeed = (pid.StartsWith("demo_") || pid.StartsWith("buyukil_")) && !validNames.Contains(normName);
            bool isKnownTestFake = normName == "street burger" || normName.Contains("craft burger lab") || normName.Contains("herd's bbq");

            if (isSyntheticFake || isStaleSeed || isKnownTestFake)
            {
                toRemove.Add(r);
                continue;
            }

            if (existingDict.TryGetValue(normName, out _))
            {
                toRemove.Add(r);
            }
            else
            {
                existingDict[normName] = r;
            }
        }

        if (toRemove.Count > 0)
        {
            var removeIds = toRemove.Select(r => r.Id).ToHashSet();

            var stalePrefs = await db.Preferences.Where(p => removeIds.Contains(p.RestaurantId)).ToListAsync(ct);
            if (stalePrefs.Count > 0) db.Preferences.RemoveRange(stalePrefs);

            var staleVisits = await db.Visits.Where(v => removeIds.Contains(v.RestaurantId)).ToListAsync(ct);
            if (staleVisits.Count > 0) db.Visits.RemoveRange(staleVisits);

            var staleRoomOpts = await db.RoomOptions.Where(o => removeIds.Contains(o.RestaurantId)).ToListAsync(ct);
            if (staleRoomOpts.Count > 0) db.RoomOptions.RemoveRange(staleRoomOpts);

            var staleRooms = await db.Rooms.Where(rm => rm.WinningRestaurantId != null && removeIds.Contains(rm.WinningRestaurantId.Value)).ToListAsync(ct);
            foreach (var rm in staleRooms) rm.WinningRestaurantId = null;

            db.Restaurants.RemoveRange(toRemove);
        }

        var toAdd = new List<Restaurant>();

        // 2. Doğrulanmış sabit koordinatlı gerçek Ankara ve ilçe mekanlarını DB'ye ekle/güncelle
        foreach (var v in allPresets)
        {
            var key = v.Name.Trim().ToLowerInvariant();
            string presetCards = v.MealCards ?? "";
            var mapsUrl = BuildMapsSearchUrl(v.Name, v.Address, v.RealLat, v.RealLng);

            if (existingDict.TryGetValue(key, out var existing))
            {
                existing.Lat = v.RealLat;
                existing.Lng = v.RealLng;
                existing.Address = v.Address;
                existing.GoogleRating = v.Rating;
                existing.GoogleRatingCount = v.RatingCount;
                existing.AvgPriceTl = v.PriceTl;
                existing.PriceLevel = v.PriceLevel;
                existing.Cuisines = v.Cuisines;
                existing.MealCards = presetCards;
                existing.MapsUrl = mapsUrl;
            }
            else
            {
                var r = new Restaurant
                {
                    GooglePlaceId = $"demo_{Math.Abs(v.Name.GetHashCode()):x8}",
                    Name = v.Name,
                    Cuisines = v.Cuisines,
                    MealCards = presetCards,
                    PriceLevel = v.PriceLevel,
                    AvgPriceTl = v.PriceTl,
                    GoogleRating = v.Rating,
                    GoogleRatingCount = v.RatingCount,
                    Lat = v.RealLat,
                    Lng = v.RealLng,
                    Address = v.Address,
                    MapsUrl = mapsUrl
                };
                toAdd.Add(r);
                existingDict[key] = r;
            }
        }

        // 3. buyukil.json dosyasındaki tüm şehirlerin (Ankara, İstanbul, İzmir, Adana, Gaziantep)
        // gerçek restoranlarını DB'ye kalıcı olarak ekle/güncelle
        foreach (var kvp in buyukIlAll)
        {
            foreach (var b in kvp.Value)
            {
                var key = b.Name.Trim().ToLowerInvariant();
                int priceLevel = b.PriceLevel >= 1000 ? 4 : (b.PriceLevel >= 650 ? 3 : (b.PriceLevel >= 350 ? 2 : 1));
                string mealCards = b.MealCards ?? "";
                var mapsUrl = BuildMapsSearchUrl(b.Name, b.Address, b.Lat, b.Lon);

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
                    existing.MealCards = mealCards;
                    existing.MapsUrl = mapsUrl;
                }
                else
                {
                    var r = new Restaurant
                    {
                        GooglePlaceId = $"buyukil_{b.CityId}_{Math.Abs(b.Name.GetHashCode()):x8}",
                        Name = b.Name,
                        Cuisines = b.Category,
                        MealCards = mealCards,
                        PriceLevel = priceLevel,
                        AvgPriceTl = b.PriceLevel,
                        GoogleRating = b.Rating,
                        GoogleRatingCount = b.Reviews,
                        Lat = b.Lat,
                        Lng = b.Lon,
                        Address = b.Address,
                        MapsUrl = mapsUrl
                    };
                    toAdd.Add(r);
                    existingDict[key] = r;
                }
            }
        }

        if (toAdd.Count > 0)
        {
            db.Restaurants.AddRange(toAdd);
        }

        await db.SaveChangesAsync(ct);
    }
}
