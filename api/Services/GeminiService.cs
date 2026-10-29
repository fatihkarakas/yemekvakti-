using System.Net.Http.Json;
using System.Text.Json;

namespace YemekVakti.Api.Services;

public record AiCandidate(
    int Index,
    string Name,
    string Cuisines,
    int DistanceM,
    int? PriceTl,
    double? GoogleRating,
    int? GoogleRatingCount,
    double? MyRating,
    int? DaysSinceLastVisit,
    string? LastNote
);

public record AiPick(int Index, string Reason);

/// <summary>Gemini API ile aday listesinden öğle yemeğine en uygun seçim + kısa Türkçe gerekçe.</summary>
public class GeminiService(HttpClient http, IConfiguration config, ILogger<GeminiService> log)
{
    private string? ApiKey => config["Google:GeminiApiKey"];
    private string Model
    {
        get
        {
            var m = config["Google:GeminiModel"];
            if (string.IsNullOrWhiteSpace(m) || m == "gemini-3.8-flash") return "gemini-2.5-flash";
            return m;
        }
    }

    public bool Enabled => !string.IsNullOrWhiteSpace(ApiKey) && ApiKey.Length >= 20;

    public async Task<AiPick?> PickAsync(
        string userName,
        IReadOnlyList<AiCandidate> candidates,
        string? wantedCuisines,
        CancellationToken ct,
        string? userPrompt = null,
        string? friendPrompt = null,
        string? mood = null,
        bool surpriseMe = false)
    {
        if (!Enabled || candidates.Count == 0) return null;

        var contextLines = new List<string>();
        if (!string.IsNullOrWhiteSpace(wantedCuisines))
            contextLines.Add($"- Seçili mutfak filtreleri: {wantedCuisines}");
        if (!string.IsNullOrWhiteSpace(userPrompt))
            contextLines.Add($"- Kullanıcının ({userName}) aklından geçen / canının çektiği: \"{userPrompt.Trim()}\"");
        if (!string.IsNullOrWhiteSpace(friendPrompt))
            contextLines.Add($"- Yanındaki iş arkadaşının / ekibin istediği: \"{friendPrompt.Trim()}\" (İkisinin de mutlu olacağı ortak noktayı veya orta yolu bul!)");
        if (!string.IsNullOrWhiteSpace(mood))
            contextLines.Add($"- Öğle molası modu: {mood}");
        if (surpriseMe)
            contextLines.Add("- Ekip tamamen kararsız, işi şansa bıraktılar! Onları pişman etmeyecek, sürpriz ama garanti bir öğle yemeği noktası seç.");

        var contextBlock = contextLines.Count > 0
            ? "Özel Durum ve İstekler:\n" + string.Join("\n", contextLines)
            : "Özel bir filtre yok; öğle molası için en mantıklı yeri seç.";

        var prompt = $$"""
            Sen bir beyaz yakalı öğle yemeği karar asistanısın. Kullanıcı: {{userName}} ve iş arkadaşları öğle yemeğine çıkacak ama karar veremiyorlar.
            {{contextBlock}}
            Kurallar:
            1. Hem kullanıcının aklından geçeni hem de arkadaşının/ekibin isteğini dikkate al; ikisini aynı masada mutlu edecek veya en adil ortak noktayı oluşturacak gerçek restoranı seç.
            2. Öğle yemeğine uygun, yakın mesafeli ve fiyat/performans dengesi iyi mekanları önceliklendir.
            3. Kullanıcının yüksek puan verdiği yerleri tercih et; düşük puanlı veya şikayet notu olan yerlerden kaçın.
            4. Aşırı pahalı (1000+ TL) lüks akşam yemeği mekanlarını veya sadece kahvaltı/pastane olan yerleri (kullanıcı özellikle istemediyse) seçme.
            Adaylar (JSON): {{JsonSerializer.Serialize(candidates)}}
            Sadece şu JSON'u döndür: {"index": <seçilen Index>, "reason": "<en fazla 150 karakter, hem kullanıcının hem arkadaşının niyetine neden uyduğunu anlatan samimi beyaz yakalı Türkçesiyle gerekçe, 1 emoji>"}
            """;

        try
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:generateContent";
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Add("x-goog-api-key", ApiKey);
            req.Content = JsonContent.Create(new
            {
                contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
                generationConfig = new { responseMimeType = "application/json", temperature = 0.5 }
            });
            using var res = await http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                log.LogWarning("Gemini {Status}: {Body}", res.StatusCode, await res.Content.ReadAsStringAsync(ct));
                return null;
            }

            using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
            var text = doc.RootElement.GetProperty("candidates")[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
            if (string.IsNullOrWhiteSpace(text)) return null;
            var pick = JsonSerializer.Deserialize<AiPick>(text, new JsonSerializerOptions(JsonSerializerDefaults.Web));
            return pick is not null && candidates.Any(c => c.Index == pick.Index) ? pick : null;
        }
        catch (Exception ex)
        {
            log.LogWarning(ex, "Gemini çağrısı başarısız");
            return null;
        }
    }
}
