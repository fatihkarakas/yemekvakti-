namespace YemekVakti.Api.Services;

public record MealCardDef(string Code, string Label, string Color, string Emoji);

/// <summary>
/// Türkiye'de yaygın kullanılan yemek kartları / kuponları kataloğu.
/// </summary>
public static class MealCardCatalog
{
    public static readonly MealCardDef[] All =
    [
        new("multinet", "Multinet", "#8b5cf6", "🟣"),
        new("setcard", "Setcard", "#eab308", "🟡"),
        new("sodexo", "Sodexo / Pluxee", "#3b82f6", "🔵"),
        new("ticket", "Ticket (Edenred)", "#ef4444", "🔴"),
        new("metropol", "Metropol", "#22c55e", "🟢")
    ];

    public static readonly HashSet<string> Codes = All.Select(c => c.Code).ToHashSet();

    public static string[] Split(string? cards) =>
        string.IsNullOrWhiteSpace(cards)
            ? []
            : cards.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public static string[] Labels(string? cards) =>
        Split(cards).Select(c => All.FirstOrDefault(x => x.Code == c)?.Label ?? c).ToArray();
}
