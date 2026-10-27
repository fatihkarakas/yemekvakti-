using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Models;

namespace YemekVakti.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Restaurant> Restaurants => Set<Restaurant>();
    public DbSet<Visit> Visits => Set<Visit>();
    public DbSet<Preference> Preferences => Set<Preference>();
    public DbSet<SuggestionLog> SuggestionLogs => Set<SuggestionLog>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomOption> RoomOptions => Set<RoomOption>();
    public DbSet<RoomVote> RoomVotes => Set<RoomVote>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Ortak hostta başka tablolarla çakışmasın diye "yv_" öneki
        b.Entity<User>(e =>
        {
            e.ToTable("yv_Users");
            e.HasIndex(x => x.ExternalId).IsUnique();
            e.Property(x => x.ExternalId).HasMaxLength(128);
            e.Property(x => x.Email).HasMaxLength(256);
            e.Property(x => x.Name).HasMaxLength(128);
            e.Property(x => x.PhotoUrl).HasMaxLength(512);
        });

        b.Entity<Restaurant>(e =>
        {
            e.ToTable("yv_Restaurants");
            e.HasIndex(x => x.GooglePlaceId).IsUnique().HasFilter("[GooglePlaceId] IS NOT NULL");
            e.Property(x => x.GooglePlaceId).HasMaxLength(128);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Address).HasMaxLength(400);
            e.Property(x => x.Cuisines).HasMaxLength(200);
            e.Property(x => x.MapsUrl).HasMaxLength(512);
        });

        b.Entity<Visit>(e =>
        {
            e.ToTable("yv_Visits");
            e.HasIndex(x => new { x.UserId, x.VisitedAt });
            e.Property(x => x.Source).HasMaxLength(20);
            e.Property(x => x.Note).HasMaxLength(1000);
        });

        b.Entity<Preference>(e =>
        {
            e.ToTable("yv_Preferences");
            e.HasIndex(x => new { x.UserId, x.RestaurantId }).IsUnique();
        });

        b.Entity<SuggestionLog>(e =>
        {
            e.ToTable("yv_SuggestionLogs");
            e.Property(x => x.Source).HasMaxLength(20);
            e.Property(x => x.SelectedCuisines).HasMaxLength(200);
            e.Property(x => x.Reason).HasMaxLength(500);
        });

        b.Entity<Room>(e =>
        {
            e.ToTable("yv_Rooms");
            e.HasIndex(x => x.Code).IsUnique();
            e.Property(x => x.Code).HasMaxLength(16);
            e.Property(x => x.Title).HasMaxLength(100);
        });

        b.Entity<RoomOption>(e =>
        {
            e.ToTable("yv_RoomOptions");
        });

        b.Entity<RoomVote>(e =>
        {
            e.ToTable("yv_RoomVotes");
            e.HasIndex(x => new { x.RoomId, x.UserId }).IsUnique();
            e.Property(x => x.UserName).HasMaxLength(100);
            e.HasOne(x => x.Room)
                .WithMany(r => r.Votes)
                .HasForeignKey(x => x.RoomId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(x => x.RoomOption)
                .WithMany()
                .HasForeignKey(x => x.RoomOptionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
