# 🍽️ YemekVakti

Öğle yemeğinde *"Nereye gidelim?"* sorusunu yapay zeka (Gemini), Google Places, dönen şans çarkı ve ekip oylaması ile çözen mobil öncelikli web uygulaması.

---

## 🚀 Özellikler

1. **✨ Akıllı Öneri (Gemini & Skorlama)**:
   - Kullanıcının mevcut konumuna ve seçtiği mesafeye göre yakındaki restoranları tarar.
   - Geçmiş ziyaretleri, verilen yıldız puanlarını, son günlerde gidilen yerleri ve kullanıcı favorilerini dikkate alır.
   - Gemini API ile tek bir restoran seçip kısa, samimi bir Türkçe gerekçe sunar.
2. **🎡 Karar Çarkı (Spin Wheel)**:
   - Kararsız kalındığında yakındaki mekanları renkli bir şans çarkına yerleştirir.
   - Tıklama sesi, ibre hareketi, gerçekçi ivmelenme ve kazanan anında konfeti patlamasıyla eğlenceli karar mekanizması.
3. **👥 Ekip / Masa Oylaması (Rooms)**:
   - Tek tıkla 5 haneli kodlu oylama odası oluşturma (`/room?code=...`).
   - WhatsApp / Slack için tek tuşla kopyalanabilir davet linki.
   - Ekip arkadaşları seçeneklere oy verebilir, oy veren kişilerin isimleri canlı görünür.
   - Ekip isterse odadaki adaylar arasında **çarkı çevirerek** kazananı belirleyebilir.
4. **📖 Geçmiş, Puanlama & Notlar**:
   - Gidilen tüm öğle yemeklerini tarihçede saklar.
   - Puanlanmamış ziyaretleri hatırlatır.
   - 1-5 yıldız ve detaylı kişisel notlar (hızlı chip'ler: *"Porsiyon küçüktü"*, *"Tekrar gelirim"*, vb.) eklenebilir.
   - Toplam yemek, ortalama puan ve en çok gidilen restoran istatistikleri.
5. **🎯 Çoktan Seçmeli Tarz Filtresi**:
   - Döner/Kebap, Ev Yemeği/Esnaf, Burger, Pide/Lahmacun, Salata/Sağlıklı, Uzak Doğu, Pizza, Balık, Kahvaltı/Kafe, Tavuk/Izgara.
   - Mesafe çubuğu (300m - 5km), Bütçe (₺/₺₺/₺₺₺) ve *"Son X günde gittiklerimi önerme"* ayarı.
6. **🔐 Kimlik Doğrulama**:
   - Google Sign-In (ID token backend'de güvenli doğrulanır) + 30 günlük JWT oturum.
   - Test için hızlı misafir/demo girişi.

---

## 🛠️ Teknoloji Yığını

- **Frontend**: Angular 18+ (Standalone Components, Signals, SCSS, Glassmorphism & Outfit Fontu)
- **Backend**: ASP.NET Core 8 Web API, Entity Framework Core 8
- **Veritabanı**: MSSQL Server (Production: `fatihka6_karakas` / Local: `localhost,3005`)
- **Entegrasyonlar**: Google Places API (New), Google Gemini API, Google Sign-In

---

## 💻 Yerel Geliştirme (Local Dev)

### 1. Backend'i Başlatma (.NET 8)
```powershell
cd d:\WEBS\yemekvakti\api
dotnet run
```
API `http://localhost:5058` adresinde çalışacaktır.
Local MSSQL bağlantınız (`localhost,3005` üzerindeki `YemekVakti` veritabanı) otomatik olarak migrate edilmiştir.

### 2. Frontend'i Başlatma (Angular)
```powershell
cd d:\WEBS\yemekvakti\web
npm start
```
`http://localhost:4200` adresinden açabilirsiniz. İstekler proxy üzerinden API'ye yönlendirilir.

---

## 🌐 Yayınlama (IIS / `yemekvakti.fatihkarakas.com.tr`)

Angular prod build'i otomatik olarak API projesinin `wwwroot` klasörüne derlenir:
```powershell
cd d:\WEBS\yemekvakti\web
npm run build
```
Ardından `api` projesini publish edip IIS'e yükleyebilirsiniz:
```powershell
cd d:\WEBS\yemekvakti\api
dotnet publish -c Release -o ../publish
```
`publish` klasöründeki dosyaları hosting'inize yüklemeniz yeterlidir. Veritabanı tabloları `db/schema.sql` dosyasında da mevcuttur.
