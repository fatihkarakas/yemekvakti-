using System.Net.Http.Json;
using System.Text.Json;

namespace YemekVakti.Api.Services;

public record AiCandidate(int Index, string Name, string Cuisines, int DistanceM, double? GoogleRating, double? MyRating, int? DaysSinceLastVisit, string? LastNote);
public record AiPick(int Index, string Reason);

/// <summary>Gemini API ile aday listesinden seçim + kısa Türkçe gerekçe.</summary>
public class GeminiService(HttpClient http, IConfiguration config, ILogger<GeminiService> log)
{
    private string? ApiKey => config["Google:GeminiApiKey"];
    private string Model => config["Google:GeminiModel"] ?? "gemini-2.5-flash";
    public bool Enabled => !string.IsNullOrWhiteSpace(ApiKey);

    public async Task<AiPick?> PickAsync(string userName, IReadOnlyList<AiCandidate> candidates, string? wantedCuisines, CancellationToken ct)
    {
        if (!Enabled || candidates.Count == 0) return null;

        var prompt = $$"""
            Sen öğle yemeği asistanısın. Kullanıcı: {{userName}}.
            Bugün öğle yemeği için aşağıdaki adaylardan BİRİNİ seç.
            {{(string.IsNullOrEmpty(wantedCuisines) ? "" : $"Kullanıcının istediği tarz: {wantedCuisines}.")}}
            Kurallar: Kullanıcının yüksek puan verdiği yerleri tercih et, düşük puanlı ve notunda şikayet olan yerlerden kaçın,
            yakın olanı ve son zamanlarda gidilmemiş olanı öne çıkar, ara sıra çeşitlilik için yeni bir yer dene.
            Adaylar (JSON): {{JsonSerializer.Serialize(candidates)}}
            Sadece şu JSON'u döndür: {"index": <seçilen Index>, "reason": "<en fazla 140 karakter, samimi, Türkçe, 1 emoji içerebilir>"}
            """;

        try
        {
            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{Model}:generateContent";
            using var req = new HttpRequestMessage(HttpMethod.Post, url);
            req.Headers.Add("x-goog-api-key", ApiKey);
            req.Content = JsonContent.Create(new
            {
                contents = new[] { new { role = "user", parts = new[] { new { text = prompt } } } },
                generationConfig = new { responseMimeType = "application/json", temperature = 0.9 }
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
