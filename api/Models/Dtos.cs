namespace YemekVakti.Api.Models;

public record AuthConfigDto(string? GoogleClientId, bool DemoLoginEnabled, bool PlacesEnabled, bool GeminiEnabled);
public record GoogleLoginRequest(string IdToken);
public record DemoLoginRequest(string Name);
public record UserDto(int Id, string Name, string Email, string? PhotoUrl);
public record LoginResponse(string Token, UserDto User);

public record CuisineDto(string Code, string Label, string Emoji);
public record MealCardDto(string Code, string Label, string Color, string Emoji);

public class CandidateQuery
{
    public double Lat { get; set; }
    public double Lng { get; set; }
    public int Radius { get; set; } = 1500;
    public string[]? Cuisines { get; set; }
    public string[]? MealCards { get; set; }
    public int? MinPriceTl { get; set; }
    public int? MaxPriceTl { get; set; }
    public int? MaxPrice { get; set; }
    public int[]? ExcludeIds { get; set; }
    /// <summary>Son kaç gün içinde gidilen yerler önerilmesin.</summary>
    public int AvoidDays { get; set; } = 5;
    public int Limit { get; set; } = 12;
}

public record CandidateDto(
    int Id,
    string Name,
    string? Address,
    double Lat,
    double Lng,
    int DistanceM,
    string[] Cuisines,
    string CuisineLabels,
    string[] MealCards,
    string[] MealCardLabels,
    int? PriceLevel,
    int? PriceTl,
    double? GoogleRating,
    int? GoogleRatingCount,
    double? MyRating,
    int MyVisitCount,
    DateTime? LastVisitAt,
    string? LastNote,
    bool IsFavorite,
    string? MapsUrl,
    double Score);

public record SuggestionResponse(CandidateDto? Restaurant, string Reason, bool AiUsed, int? SuggestionLogId, List<CandidateDto> Alternatives);

public record CreateVisitRequest(int RestaurantId, string? Source, int? SuggestionLogId, DateTime? VisitedAt);
public record RateVisitRequest(int? Stars, string? Note);
public record VisitDto(int Id, DateTime VisitedAt, string Source, int? Stars, string? Note, DateTime? RatedAt, int RestaurantId, string RestaurantName, string? Address, string CuisineLabels, string? MapsUrl);
public record HistoryStatsDto(int TotalVisits, int Unrated, double? AverageStars, string? TopRestaurant, int TopRestaurantCount);

public record CreateRestaurantRequest(string Name, double Lat, double Lng, string[]? Cuisines, string[]? MealCards, int? PriceLevel, int? PriceTl, string? Address);
public record SetPreferenceRequest(int RestaurantId, PreferenceType Type);
public record PreferenceDto(int RestaurantId, string RestaurantName, PreferenceType Type, DateTime CreatedAt);

// Room & Ekip Oylama DTOs
public record CreateRoomRequest(string? Title, int[] RestaurantIds);
public record CastVoteRequest(int RoomOptionId);
public record CloseRoomRequest(int? WinningRestaurantId);

public record RoomOptionDto(int Id, int RestaurantId, string RestaurantName, string CuisineLabels, double? GoogleRating, int VoteCount, List<string> Voters);
public record RoomDto(int Id, string Code, string Title, int CreatorUserId, bool IsClosed, int? WinningRestaurantId, string? WinningRestaurantName, int? MyVotedOptionId, List<RoomOptionDto> Options, int TotalVotes);

