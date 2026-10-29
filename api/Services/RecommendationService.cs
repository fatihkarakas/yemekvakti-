using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Services;

/// <summary>Aday listesi (çark için) ve akıllı, bağlama duyarlı öğle yemeği öneri üretimi.</summary>
public class RecommendationService(AppDbContext db, PlacesService places, GeminiService gemini)
{
    private static bool _initialSeedDone;
    private static readonly SemaphoreSlim _seedLock = new(1, 1);

    private async Task EnsureCleanSeedAsync(double lat, double lng, CancellationToken ct)
    {
        if (_initialSeedDone) return;
        await _seedLock.WaitAsync(ct);
        try
        {
            if (_initialSeedDone) return;
            await DemoSeeder.SeedAroundAsync(db, lat, lng, ct);
            _initialSeedDone = true;
        }
        finally
        {
            _seedLock.Release();
        }
    }

    public async Task<List<CandidateDto>> GetCandidatesAsync(int userId, CandidateQuery q, CancellationToken ct)
    {
        await EnsureCleanSeedAsync(q.Lat, q.Lng, ct);

        // Varsayılan 5 km (5000 metre) yarıçap
        q.Radius = q.Radius <= 0 ? 5000 : Math.Clamp(q.Radius, 500, 25000);

        if (q.SanayiOnly)
        {
            q.Radius = Math.Max(q.Radius, 10000);
        }

        var nearby = await places.GetNearbyAsync(q.Lat, q.Lng, q.Radius, ct);

        // Eğer mevcut yarıçapta hiç mekan bulunamadıysa yarıçapı kademeli olarak 12 km'ye esnet
        if (nearby.Count < 3 && q.Radius < 12000)
        {
            nearby = await places.GetNearbyAsync(q.Lat, q.Lng, 12000, ct);
        }

        var ids = nearby.Select(r => r.Id).ToList();
        var visits = await db.Visits.Where(v => v.UserId == userId && ids.Contains(v.RestaurantId))
            .Select(v => new { v.RestaurantId, v.VisitedAt, v.Stars, v.Note })
            .ToListAsync(ct);
        var prefs = await db.Preferences.Where(p => p.UserId == userId && ids.Contains(p.RestaurantId))
            .ToDictionaryAsync(p => p.RestaurantId, p => (p.Type, p.Weight), ct);

        var wanted = (q.Cuisines ?? []).Where(CuisineCatalog.Codes.Contains).ToHashSet();
        var wantedCards = (q.MealCards ?? []).Where(MealCardCatalog.Codes.Contains).ToHashSet();
        var exclude = (q.ExcludeIds ?? []).ToHashSet();
        var avoidSince = q.AvoidDays > 0 ? DateTime.UtcNow.Date.AddDays(-q.AvoidDays) : DateTime.MaxValue;
        var rnd = Random.Shared;

        var userIntent = ParseIntent(q.UserPrompt);
        var friendIntent = ParseIntent(q.FriendPrompt);
        var mood = (q.Mood ?? "").Trim().ToLowerInvariant();

        foreach (var mc in userIntent.MealCards.Concat(friendIntent.MealCards))
        {
            wantedCards.Add(mc);
        }

        bool hasExplicitPriceFilter = q.MinPriceTl.HasValue || q.MaxPriceTl.HasValue || q.MaxPrice.HasValue;
        bool wantsBalik = wanted.Contains("balik") || userIntent.Cuisines.Contains("balik") || friendIntent.Cuisines.Contains("balik");
        bool wantsKahvalti = wanted.Contains("kahvalti") || userIntent.Cuisines.Contains("kahvalti") || friendIntent.Cuisines.Contains("kahvalti");

        var filtered = nearby
            .GroupBy(r => r.Name.Trim().ToLowerInvariant())
            .Select(g => g.OrderByDescending(x => x.GoogleRatingCount ?? 0).First())
            .Where(r => !exclude.Contains(r.Id))
            .Where(r => !prefs.TryGetValue(r.Id, out var pref) || pref.Type != PreferenceType.Blacklist)
            .Where(r => !q.SanayiOnly || IsSanayiVenue(r))
            .Where(r => wanted.Count == 0 || CuisineCatalog.Split(r.Cuisines).Any(wanted.Contains))
            .Where(r => wantedCards.Count == 0 || MealCardCatalog.Split(r.MealCards).Any(wantedCards.Contains))
            .Where(r =>
            {
                var est = EstimatePriceTl(r);
                if (q.MinPriceTl.HasValue && est < q.MinPriceTl.Value) return false;
                if (q.MaxPriceTl.HasValue && est > q.MaxPriceTl.Value) return false;
                if (q.MaxPrice.HasValue && r.PriceLevel.HasValue && r.PriceLevel > q.MaxPrice.Value) return false;
                return true;
            })
            .ToList();

        // Eğer son X günde gidilmeyen yeterli alternatif varsa, son gidilenleri doğrudan ele
        if (q.AvoidDays > 0)
        {
            var recentIds = visits
                .Where(v => v.VisitedAt >= avoidSince)
                .Select(v => v.RestaurantId)
                .ToHashSet();

            var nonRecent = filtered.Where(r => !recentIds.Contains(r.Id)).ToList();
            if (nonRecent.Count >= 3)
            {
                filtered = nonRecent;
            }
        }

        var candidates = filtered
            .Select(r =>
            {
                var rv = visits.Where(v => v.RestaurantId == r.Id).OrderByDescending(v => v.VisitedAt).ToList();
                var rated = rv.Where(v => v.Stars.HasValue).ToList();
                double? my = rated.Count > 0 ? Math.Round(rated.Average(v => v.Stars!.Value), 1) : null;
                var dist = Geo.DistanceMeters(q.Lat, q.Lng, r.Lat, r.Lng);
                var hasPref = prefs.TryGetValue(r.Id, out var prefInfo);
                var fav = hasPref && prefInfo.Type == PreferenceType.Favorite;
                var favWeight = hasPref ? Math.Max(1, prefInfo.Weight) : 1;
                var last = rv.FirstOrDefault();
                var recent = q.AvoidDays > 0 && last is not null && last.VisitedAt >= avoidSince;
                var isSanayi = IsSanayiVenue(r);
                var priceTl = EstimatePriceTl(r);
                var splitCuisines = CuisineCatalog.Split(r.Cuisines);

                // 1. Kalite ve güvenilirlik puanı (Google puanı + yorum sayısı)
                var ratingScore = ((r.GoogleRating ?? 4.3) - 3.5) * 1.6;
                var reviewTrustBonus = Math.Min(0.75, Math.Log10(Math.Max(15, r.GoogleRatingCount ?? 150)) * 0.18);

                // 2. Mesafe etkisi: Yakındaki mekanları güçlü şekilde ödüllendir, uzaktakileri cezalandır
                var proximityBonus = dist <= 750 ? 0.85 : (dist <= 1600 ? 0.45 : (dist <= 2800 ? 0.15 : 0.0));
                var distancePenalty = (dist / Math.Max(1500.0, q.Radius)) * 1.65;

                // 3. Öğle yemeği bağlam uyumu (ultra lüks akşam yemeği veya sadece pastane/kahvaltı kontrolü)
                var contextAdjustment = 0.0;
                if (!hasExplicitPriceFilter && !wantsBalik)
                {
                    if (priceTl >= 1000) contextAdjustment -= 3.2;       // Trilye, Nusr-Et, Beyti vb. özel seçilmedikçe öğlen #1 çıkmasın
                    else if (priceTl >= 700) contextAdjustment -= 0.85;  // Ağır lüks restoranlar
                    else if (priceTl <= 480) contextAdjustment += 0.35;  // İdeal öğle yemeği fiyat-performans bandı
                }

                // Kullanıcı özellikle kahvaltı/kafe seçmediyse, sadece kahvaltı/pastane olan yerleri öğle yemeğinde geri plana al
                if (!wantsKahvalti && splitCuisines.Length == 1 && splitCuisines[0] == "kahvalti")
                {
                    contextAdjustment -= 1.4;
                }

                // Sanayi modu kapalıysa ve kullanıcı sanayi seçmediyse uzaktaki sanayi mekanlarını öne çıkarma
                if (!q.SanayiOnly && !wanted.Contains("sanayi") && !userIntent.Cuisines.Contains("sanayi") && !friendIntent.Cuisines.Contains("sanayi") && isSanayi && dist > 2000)
                {
                    contextAdjustment -= 0.5;
                }
                else if (q.SanayiOnly && isSanayi)
                {
                    contextAdjustment += 0.8;
                }

                // 3.5 Doğal Dil Niyeti (Senin Aklından Geçen + Arkadaşının İsteği + Öğle Molası Modu)
                var nameLower = r.Name.ToLower(new System.Globalization.CultureInfo("tr-TR"));
                bool matchesUserCuisine = userIntent.Cuisines.Count > 0 && splitCuisines.Any(userIntent.Cuisines.Contains);
                bool matchesFriendCuisine = friendIntent.Cuisines.Count > 0 && splitCuisines.Any(friendIntent.Cuisines.Contains);
                bool matchesUserWord = userIntent.SpecificWords.Count > 0 && userIntent.SpecificWords.Any(nameLower.Contains);
                bool matchesFriendWord = friendIntent.SpecificWords.Count > 0 && friendIntent.SpecificWords.Any(nameLower.Contains);

                if (userIntent.HasAny && friendIntent.HasAny)
                {
                    bool userSatisfied = matchesUserCuisine || matchesUserWord;
                    bool friendSatisfied = matchesFriendCuisine || matchesFriendWord;
                    bool isVersatileMenu = splitCuisines.Contains("evyemegi") || splitCuisines.Length >= 2;

                    if (userSatisfied && friendSatisfied)
                    {
                        contextAdjustment += 3.5; // İki arkadaşın da isteğini doğrudan karşılayan ortak mekan!
                    }
                    else if ((userSatisfied || friendSatisfied) && isVersatileMenu)
                    {
                        contextAdjustment += 2.3; // Birinin isteği tam, menüsü geniş (diğeri de rahatça yiyebilir)
                    }
                    else if (userSatisfied || friendSatisfied)
                    {
                        contextAdjustment += 1.2;
                    }
                    else if (userIntent.Cuisines.Count > 0 || friendIntent.Cuisines.Count > 0)
                    {
                        contextAdjustment -= 1.6;
                    }
                }
                else if (userIntent.HasAny || friendIntent.HasAny)
                {
                    var activeIntent = userIntent.HasAny ? userIntent : friendIntent;
                    bool matchesCuisine = activeIntent.Cuisines.Count > 0 && splitCuisines.Any(activeIntent.Cuisines.Contains);
                    bool matchesWord = activeIntent.SpecificWords.Count > 0 && activeIntent.SpecificWords.Any(nameLower.Contains);

                    if (matchesCuisine) contextAdjustment += 2.4;
                    else if (activeIntent.Cuisines.Count > 0) contextAdjustment -= 1.4;

                    if (matchesWord) contextAdjustment += 1.3;
                }

                // Hızlı / Toplantı Var / Yakın Olsun
                if (mood == "hizli" || userIntent.WantsFastOrClose || friendIntent.WantsFastOrClose)
                {
                    if (dist <= 650) contextAdjustment += 1.6;
                    else if (dist <= 1200) contextAdjustment += 0.7;
                    else if (dist > 1600) contextAdjustment -= 1.8;
                }

                // Ekonomik / Ay Sonu / Yemek Kartı
                if (mood == "ekonomik" || userIntent.WantsBudget || friendIntent.WantsBudget)
                {
                    if (priceTl <= 340) contextAdjustment += 1.6;
                    else if (priceTl <= 430) contextAdjustment += 0.7;
                    else if (priceTl >= 520) contextAdjustment -= 1.8;

                    if (!string.IsNullOrWhiteSpace(r.MealCards)) contextAdjustment += 0.65;
                }

                // Hafif / Mideyi Yormayan / Sağlıklı
                if (mood == "hafif" || userIntent.WantsLight || friendIntent.WantsLight)
                {
                    if (splitCuisines.Contains("saglikli") || splitCuisines.Contains("evyemegi") || splitCuisines.Contains("tavuk"))
                        contextAdjustment += 1.5;
                    if (splitCuisines.Contains("burger") || isSanayi)
                        contextAdjustment -= 1.0;
                }

                // Sağlam Doyurucu / Çok Açız
                if (mood == "doyurucu" || userIntent.WantsHearty || friendIntent.WantsHearty)
                {
                    if (splitCuisines.Contains("kebap") || splitCuisines.Contains("pide") || splitCuisines.Contains("evyemegi") || isSanayi)
                        contextAdjustment += 1.4;
                }

                // Ekipçe Ortak Karar / Geniş Menü
                if (mood == "ortak")
                {
                    if (splitCuisines.Length >= 2 || splitCuisines.Contains("evyemegi") || splitCuisines.Contains("kebap"))
                        contextAdjustment += 1.2;
                    if (!string.IsNullOrWhiteSpace(r.MealCards))
                        contextAdjustment += 0.5;
                }

                // 4. Kullanıcı geçmişi ve favori etkisi
                var userHistoryAdjustment = 0.0;
                if (fav)
                {
                    userHistoryAdjustment += 1.1 + Math.Min(0.7, Math.Log10(favWeight) * 0.45);
                }
                if (my.HasValue)
                {
                    if (my.Value >= 4.0) userHistoryAdjustment += (my.Value - 3.0) * 0.85;
                    else if (my.Value <= 2.5) userHistoryAdjustment -= 3.5;
                }
                if (recent)
                {
                    userHistoryAdjustment -= 2.8;
                }

                // 5. Kontrollü çeşitlilik (Şansa bırak modunda çeşitliliği artır)
                var randomBonus = (q.SurpriseMe || mood == "sans")
                    ? rnd.NextDouble() * 1.15
                    : rnd.NextDouble() * 0.42;

                var score = ratingScore + reviewTrustBonus + proximityBonus - distancePenalty
                            + contextAdjustment + userHistoryAdjustment + randomBonus;

                var mapsUrl = !string.IsNullOrWhiteSpace(r.Address)
                    ? DemoSeeder.BuildMapsSearchUrl(r.Name, r.Address, r.Lat, r.Lng)
                    : (r.MapsUrl ?? $"https://www.google.com/maps/search/?api=1&query={r.Lat:F6},{r.Lng:F6}");

                return new CandidateDto(
                    r.Id,
                    r.Name,
                    r.Address,
                    r.Lat,
                    r.Lng,
                    (int)dist,
                    splitCuisines,
                    CuisineCatalog.Labels(r.Cuisines),
                    MealCardCatalog.Split(r.MealCards),
                    MealCardCatalog.Labels(r.MealCards),
                    r.PriceLevel,
                    priceTl,
                    r.GoogleRating,
                    r.GoogleRatingCount,
                    my,
                    rv.Count,
                    last?.VisitedAt,
                    rv.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v.Note))?.Note,
                    fav,
                    mapsUrl,
                    Math.Round(score, 3),
                    isSanayi
                );
            })
            .OrderByDescending(c => c.Score)
            .Take(Math.Clamp(q.Limit, 10, 20))
            .ToList();

        return candidates;
    }

    public static bool IsSanayiVenue(Restaurant r)
    {
        var text = (r.Name + " " + (r.Address ?? "") + " " + (r.Cuisines ?? "")).ToLower(new System.Globalization.CultureInfo("tr-TR"));
        return text.Contains("sanayi") || text.Contains("ostim") || text.Contains("şaşmaz") || text.Contains("sasmaz") ||
               text.Contains("ivedik") || text.Contains("siteler") || text.Contains("gersan") || text.Contains("osb") ||
               text.Contains("oto sanayi") || text.Contains("iskitler") || text.Contains("gimat");
    }

    public async Task<SuggestionResponse> SuggestAsync(int userId, string userName, CandidateQuery q, CancellationToken ct)
    {
        var candidates = await GetCandidatesAsync(userId, q, ct);
        if (candidates.Count == 0)
            return new SuggestionResponse(null, "Bu kriterlere uyan yer bulamadım 😕 Mesafeyi artırmayı ya da filtreleri esnetmeyi deneyebilirsin.", false, null, []);

        var userIntent = ParseIntent(q.UserPrompt);
        var friendIntent = ParseIntent(q.FriendPrompt);
        var mood = (q.Mood ?? "").Trim().ToLowerInvariant();
        bool isChanceMode = q.SurpriseMe || mood == "sans";
        bool hasSmartContext = userIntent.HasAny || friendIntent.HasAny || !string.IsNullOrWhiteSpace(mood) || isChanceMode;

        var top = candidates.Take(isChanceMode ? Math.Min(7, candidates.Count) : Math.Min(5, candidates.Count)).ToList();
        var aiCandidates = top.Select((c, i) => new AiCandidate(
            i,
            c.Name,
            c.CuisineLabels,
            c.DistanceM,
            c.PriceTl,
            c.GoogleRating,
            c.GoogleRatingCount,
            c.MyRating,
            c.LastVisitAt is null ? null : (int)(DateTime.UtcNow - c.LastVisitAt.Value).TotalDays,
            c.LastNote
        )).ToList();

        var wantedLabels = CuisineCatalog.Labels(string.Join(',', q.Cuisines ?? []));
        var pick = await gemini.PickAsync(userName, aiCandidates, wantedLabels, ct, q.UserPrompt, q.FriendPrompt, q.Mood, isChanceMode);

        CandidateDto chosen;
        string reason;
        if (pick is not null && pick.Index >= 0 && pick.Index < top.Count)
        {
            chosen = top[pick.Index];
            reason = pick.Reason;
        }
        else if (isChanceMode)
        {
            // Tamamen kararsız ekip için kaliteli adaylar arasından şans çekilişi!
            var luckyIdx = Random.Shared.Next(top.Count);
            chosen = top[luckyIdx];
            reason = LocalReason(chosen, q, userIntent, friendIntent, isChanceMode: true);
        }
        else
        {
            // En yüksek puanlı ilk 3 aday arasından skor ağırlıklı seçim
            var pool = top.Take(Math.Min(3, top.Count)).ToList();
            var min = pool.Min(c => c.Score);
            var weights = pool.Select(c => Math.Max(0.2, c.Score - min + 0.35)).ToList();
            var roll = Random.Shared.NextDouble() * weights.Sum();
            var idx = 0;
            for (; idx < pool.Count - 1 && (roll -= weights[idx]) > 0; idx++) { }
            chosen = pool[idx];
            reason = LocalReason(chosen, q, userIntent, friendIntent, isChanceMode: false);
        }

        var log = new SuggestionLog
        {
            UserId = userId,
            RestaurantId = chosen.Id,
            Source = isChanceMode ? "wheel" : "suggestion",
            SelectedCuisines = q.Cuisines is { Length: > 0 } ? string.Join(',', q.Cuisines) : null,
            Reason = reason.Length > 500 ? reason[..500] : reason
        };
        db.SuggestionLogs.Add(log);
        await db.SaveChangesAsync(ct);

        return new SuggestionResponse(
            chosen,
            reason,
            pick is not null || hasSmartContext,
            log.Id,
            candidates.Where(c => c.Id != chosen.Id).Take(14).ToList()
        );
    }

    private sealed class ParsedIntent
    {
        public HashSet<string> Cuisines { get; } = [];
        public List<string> SpecificWords { get; } = [];
        public HashSet<string> MealCards { get; } = [];
        public bool WantsFastOrClose { get; set; }
        public bool WantsBudget { get; set; }
        public bool WantsLight { get; set; }
        public bool WantsHearty { get; set; }
        public string RawSummary { get; set; } = "";
        public bool HasAny => Cuisines.Count > 0 || SpecificWords.Count > 0 || MealCards.Count > 0 ||
                              WantsFastOrClose || WantsBudget || WantsLight || WantsHearty || !string.IsNullOrWhiteSpace(RawSummary);
    }

    private static ParsedIntent ParseIntent(string? raw)
    {
        var res = new ParsedIntent();
        if (string.IsNullOrWhiteSpace(raw)) return res;

        var tr = new System.Globalization.CultureInfo("tr-TR");
        var text = raw.Trim().ToLower(tr);
        res.RawSummary = raw.Trim();

        // Mutfak eşleştirmeleri
        if (ContainsAny(text, "döner", "doner", "iskender", "kebap", "kebab", "adana", "urfa", "şiş", "ciğer", "ciger", "köfte", "kofte", "tantuni", "aspava", "kokoreç", "dürüm", "durum", "et "))
            res.Cuisines.Add("kebap");

        if (ContainsAny(text, "ev yeme", "sulu", "çorba", "corba", "esnaf", "lokanta", "tencere", "pilav", "kuru fasulye", "mantı", "manti", "paça", "işkembe", "mercimek", "sebze", "zeytinyağ", "ev işi"))
            res.Cuisines.Add("evyemegi");

        if (ContainsAny(text, "burger", "hamburger", "fast food", "patates", "sokak lezzeti"))
            res.Cuisines.Add("burger");

        if (ContainsAny(text, "pide", "lahmacun", "etli ekmek", "etliekmek", "karadeniz", "kıymalı", "kuşbaşılı", "cantık", "taş fırın"))
            res.Cuisines.Add("pide");

        if (ContainsAny(text, "salata", "bowl", "vegan", "vejetaryen", "fit", "sağlıklı", "saglikli", "diyet", "yeşillik"))
            res.Cuisines.Add("saglikli");

        if (ContainsAny(text, "sushi", "noodle", "ramen", "wok", "uzak doğu", "uzakdogu", "asya", "çin", "kore", "japon"))
            res.Cuisines.Add("uzakdogu");

        if (ContainsAny(text, "pizza", "makarna", "italyan", "spagetti", "lazanya", "forno"))
            res.Cuisines.Add("pizza");

        if (ContainsAny(text, "balık", "balik", "deniz", "hamsi", "mezgit", "levrek", "çupra", "midye"))
            res.Cuisines.Add("balik");

        if (ContainsAny(text, "kahvaltı", "kahvalti", "tost", "sandviç", "börek", "simit", "poğaça", "gözleme", "kafe", "cafe"))
            res.Cuisines.Add("kahvalti");

        if (ContainsAny(text, "tavuk", "piliç", "kanat", "şinitzel", "ızgara tavuk", "chicken"))
            res.Cuisines.Add("tavuk");

        if (ContainsAny(text, "sanayi", "usta", "salaş", "kavurma", "oto sanayi"))
            res.Cuisines.Add("sanayi");

        // Spesifik yemek / mekan anahtar kelimeleri
        string[] dishWords = ["aspava", "iskender", "köfte", "çorba", "mantı", "lahmacun", "pide", "döner", "balık", "sushi", "makarna", "tost", "kokoreç", "ciğer", "tantuni", "burger", "pizza", "kavurma", "pilav"];
        foreach (var w in dishWords)
        {
            if (text.Contains(w)) res.SpecificWords.Add(w);
        }

        // Yemek kartları
        if (ContainsAny(text, "ticket", "edenred")) res.MealCards.Add("ticket");
        if (ContainsAny(text, "multinet")) res.MealCards.Add("multinet");
        if (ContainsAny(text, "sodexo", "pluxee")) res.MealCards.Add("sodexo");
        if (ContainsAny(text, "setcard")) res.MealCards.Add("setcard");
        if (ContainsAny(text, "metropol")) res.MealCards.Add("metropol");

        // Bağlamsal niyetler
        res.WantsFastOrClose = ContainsAny(text, "hızlı", "hizli", "yakın", "yakin", "toplantı", "toplanti", "acele", "yürüme", "vakit yok", "hemen", "pratik", "kısa mola");
        res.WantsBudget = ContainsAny(text, "ucuz", "uygun", "ekonomik", "hesaplı", "cep yakmayan", "bütçe", "ay sonu", "ayın sonu", "yemek kart");
        res.WantsLight = ContainsAny(text, "hafif", "mide", "yormasın", "uyku", "sağlıklı", "saglikli", "fit", "diyet", "az kalorili");
        res.WantsHearty = ContainsAny(text, "doyurucu", "çok aç", "cok ac", "sağlam", "bol porsiyon", "ikram", "kurt gibi");

        return res;
    }

    private static bool ContainsAny(string text, params string[] needles)
    {
        foreach (var n in needles)
        {
            if (text.Contains(n)) return true;
        }
        return false;
    }

    private static string LocalReason(CandidateDto c, CandidateQuery q, ParsedIntent userIntent, ParsedIntent friendIntent, bool isChanceMode)
    {
        var distText = c.DistanceM >= 1000
            ? $"{(c.DistanceM / 1000.0):0.0} km mesafede"
            : $"sadece {c.DistanceM} m uzakta";

        var cuisineText = !string.IsNullOrWhiteSpace(c.CuisineLabels) ? c.CuisineLabels.Split(',')[0].Trim() : "Öğle yemeği";
        var mood = (q.Mood ?? "").Trim().ToLowerInvariant();

        // 1. Tamamen Şansa Bırak Modu
        if (isChanceMode)
        {
            return $"🎲 Kararsızlığı şansla çözdük! {distText}, {c.GoogleRating:0.0}⭐ puanlı bu mekan bugün tüm ekibi mutlu edecek sürpriz seçimimiz.";
        }

        // 2. Hem kullanıcının hem arkadaşının aklından geçen varsa (İkili / Grup Uzlaşma Modu)
        if (userIntent.HasAny && friendIntent.HasAny)
        {
            var uShort = ShortenPrompt(userIntent.RawSummary);
            var fShort = ShortenPrompt(friendIntent.RawSummary);
            return $"🤝 Senin \"{uShort}\" isteğinle arkadaşının \"{fShort}\" tercihini {distText} ({c.GoogleRating:0.0}⭐) ortak masada buluşturan en iyi nokta!";
        }

        // 3. Tekil doğal dil isteği (Senin veya arkadaşının aklından geçen)
        if (userIntent.HasAny || friendIntent.HasAny)
        {
            var active = userIntent.HasAny ? userIntent : friendIntent;
            var pShort = ShortenPrompt(active.RawSummary);
            if (active.WantsFastOrClose)
                return $"⚡ \"{pShort}\" niyetine tam uygun: {distText} hızlı servisi ve {c.GoogleRating:0.0}⭐ puanıyla toplantı öncesi en pratik tercih!";
            if (active.WantsBudget)
                return $"💳 \"{pShort}\" dediğin için ~{c.PriceTl} ₺ bütçe dostu yapısıyla {distText} ({c.GoogleRating:0.0}⭐) en mantıklı öğle durağı!";
            return $"✨ Aklından geçen \"{pShort}\" isteğine birebir uyan, {distText} ve {c.GoogleRating:0.0}⭐ puanlı harika bir öğle yemeği noktası!";
        }

        // 4. Hızlı Mod (Mood) seçilmişse
        if (mood == "hizli")
            return $"⚡ Toplantıya yetişmelik! {distText} yürüyerek hemen ulaşabileceğiniz, hızlı servisli ve {c.GoogleRating:0.0}⭐ puanlı garanti tercih.";
        if (mood == "ekonomik")
            return $"💳 Cep dostu öğle molası: Kişi başı ~{c.PriceTl} ₺ ortalaması ve {c.GoogleRating:0.0}⭐ puanıyla {distText} fiyat/performans lideri!";
        if (mood == "hafif")
            return $"🥗 Öğleden sonra ağırlık çökmeyecek hafif ve dengeli bir öğün için {distText} ({c.GoogleRating:0.0}⭐) çok ideal.";
        if (mood == "doyurucu")
            return $"🔥 Ekipçe sağlam doymak isteyenlere: Bol porsiyonlu {cuisineText.ToLowerInvariant()} lezzetiyle {distText} ({c.GoogleRating:0.0}⭐) tam isabet!";
        if (mood == "ortak")
            return $"🤝 Ekipçe kararsız kaldığınızda herkesin menüde sevdiği bir lezzet bulabileceği, {distText} {c.GoogleRating:0.0}⭐ puanlı ortak nokta!";

        if (c.IsFavorite && c.MyRating >= 4)
            return $"Favori mekanlarından biri ve {c.MyRating:0.#}⭐ vermiştin; {distText} harika bir öğle yemeği tercihi! 💛";

        if (c.IsFavorite)
            return $"Favori listenin gözdesi, {distText} — bugün öğle yemeğinde garanti bir seçim! ⭐";

        if (c.MyRating >= 4)
            return $"Daha önce {c.MyRating:0.#}⭐ ile çok memnun kalmıştın, {distText} tekrar gitmek için ideal 😋";

        var options = new List<string>();

        if (c.DistanceM <= 500 && c.GoogleRating >= 4.5)
        {
            var walkMin = Math.Max(1, (int)Math.Round(c.DistanceM / 80.0));
            options.Add($"Yürüme mesafesinde (~{walkMin} dk / {c.DistanceM} m) ve {c.GoogleRating:0.0}⭐ puanlı; {cuisineText.ToLowerInvariant()} için çok pratik ve lezzetli bir durak 🚶");
        }

        if (c.GoogleRatingCount >= 3000 && c.GoogleRating >= 4.6)
        {
            options.Add($"Bölgenin en bilinen klasiklerinden ({c.GoogleRatingCount:N0}+ değerlendirmede {c.GoogleRating:0.0}⭐), {distText} güçlü bir {cuisineText.ToLowerInvariant()} tercihi 🔥");
        }

        if (c.PriceTl is <= 360 && c.GoogleRating >= 4.4)
        {
            options.Add($"Kişi başı ~{c.PriceTl} ₺ bütçe dostu fiyatı ve {c.GoogleRating:0.0}⭐ puanıyla {distText} tam bir fiyat/performans noktası 👍");
        }

        if (c.MealCardLabels.Length > 0 && c.GoogleRating >= 4.5)
        {
            var cards = string.Join(", ", c.MealCardLabels.Take(2));
            options.Add($"{cuisineText} kategorisinde {c.GoogleRating:0.0}⭐ puana sahip, {distText} ve yemek kartı ({cards}) geçerli 💳");
        }

        if (options.Count > 0)
        {
            var pickIdx = Math.Abs(c.Id + DateTime.UtcNow.DayOfYear) % options.Count;
            return options[pickIdx];
        }

        if (c.GoogleRating >= 4.5)
            return $"{cuisineText} sevenler için {distText}, {c.GoogleRating:0.0}⭐ puanlı çok beğenilen bir mekan ✨";

        return $"{cuisineText} kategorisinde {distText}, öğle yemeği için dengeli ve pratik bir seçenek 🍽️";
    }

    private static string ShortenPrompt(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return "öğle yemeği";
        var clean = text.Trim();
        return clean.Length <= 28 ? clean : clean[..26].TrimEnd() + "…";
    }

    public static int EstimatePriceTl(Restaurant r)
    {
        if (r.AvgPriceTl.HasValue && r.AvgPriceTl > 0) return r.AvgPriceTl.Value;
        if (r.PriceLevel == 1) return 280;
        if (r.PriceLevel == 2) return 440;
        if (r.PriceLevel == 3) return 750;
        if (r.PriceLevel == 4) return 1500;

        var c = (r.Cuisines ?? "").ToLowerInvariant();
        if (c.Contains("kahvalti") || c.Contains("tost")) return 260;
        if (c.Contains("pide") || c.Contains("evyemegi")) return 320;
        if (c.Contains("kebap") || c.Contains("burger") || c.Contains("pizza") || c.Contains("tavuk")) return 420;
        if (c.Contains("uzakdogu") || c.Contains("balik")) return 680;
        return 380;
    }
}
