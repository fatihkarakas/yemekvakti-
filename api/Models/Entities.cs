namespace YemekVakti.Api.Models;

public class User
{
    public int Id { get; set; }
    /// <summary>Google "sub" claim (demo kullanıcılar için "demo:..." ).</summary>
    public string ExternalId { get; set; } = "";
    public string Email { get; set; } = "";
    public string Name { get; set; } = "";
    public string? PhotoUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastLoginAt { get; set; } = DateTime.UtcNow;
}

public class Restaurant
{
    public int Id { get; set; }
    public string? GooglePlaceId { get; set; }
    public string Name { get; set; } = "";
    public string? Address { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    /// <summary>Virgülle ayrılmış mutfak kodları (kebap,burger,...)</summary>
    public string Cuisines { get; set; } = "";
    /// <summary>1-4 arası (₺ .. ₺₺₺₺), bilinmiyorsa null.</summary>
    public int? PriceLevel { get; set; }
    public double? GoogleRating { get; set; }
    public int? GoogleRatingCount { get; set; }
    public string? MapsUrl { get; set; }
    /// <summary>Kullanıcının elle eklediği restoran ise ekleyen kişi.</summary>
    public int? CreatedByUserId { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Visit
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public int RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }
    public DateTime VisitedAt { get; set; } = DateTime.UtcNow;
    /// <summary>suggestion | wheel | manual</summary>
    public string Source { get; set; } = "suggestion";
    /// <summary>1-5 yıldız, henüz puanlanmadıysa null.</summary>
    public int? Stars { get; set; }
    public string? Note { get; set; }
    public DateTime? RatedAt { get; set; }
}

public enum PreferenceType { Favorite = 1, Blacklist = 2 }

public class Preference
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }
    public PreferenceType Type { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SuggestionLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int RestaurantId { get; set; }
    public string Source { get; set; } = "suggestion";
    public string? SelectedCuisines { get; set; }
    public string? Reason { get; set; }
    public bool Accepted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Room
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Title { get; set; } = "Öğle Yemeği Oylaması";
    public int CreatorUserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddHours(4);
    public bool IsClosed { get; set; }
    public int? WinningRestaurantId { get; set; }
    public Restaurant? WinningRestaurant { get; set; }
    public List<RoomOption> Options { get; set; } = [];
    public List<RoomVote> Votes { get; set; } = [];
}

public class RoomOption
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public Room? Room { get; set; }
    public int RestaurantId { get; set; }
    public Restaurant? Restaurant { get; set; }
}

public class RoomVote
{
    public int Id { get; set; }
    public int RoomId { get; set; }
    public Room? Room { get; set; }
    public int RoomOptionId { get; set; }
    public RoomOption? RoomOption { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = "";
    public DateTime VotedAt { get; set; } = DateTime.UtcNow;
}

