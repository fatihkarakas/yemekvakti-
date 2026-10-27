using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;
using YemekVakti.Api.Services;

namespace YemekVakti.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/rooms")]
public class RoomController(AppDbContext db) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<RoomDto>> CreateRoom(CreateRoomRequest req)
    {
        if (req.RestaurantIds.Length == 0)
            return BadRequest("En az 1 restoran seçilmelidir.");

        var distinctIds = req.RestaurantIds.Distinct().Take(10).ToList();
        var restaurants = await db.Restaurants.Where(r => distinctIds.Contains(r.Id)).ToListAsync();
        if (restaurants.Count == 0)
            return BadRequest("Seçilen restoranlar bulunamadı.");

        // Rastgele 5 karakterlik oda kodu
        var code = GenerateRoomCode();
        while (await db.Rooms.AnyAsync(r => r.Code == code))
        {
            code = GenerateRoomCode();
        }

        var room = new Room
        {
            Code = code,
            Title = string.IsNullOrWhiteSpace(req.Title) ? "Öğle Yemeği Oylaması" : req.Title.Trim(),
            CreatorUserId = User.UserId(),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(4),
            Options = restaurants.Select(r => new RoomOption { RestaurantId = r.Id }).ToList()
        };

        db.Rooms.Add(room);
        await db.SaveChangesAsync();

        return await GetRoomByCodeInternal(room.Code);
    }

    [HttpGet("{code}")]
    public async Task<ActionResult<RoomDto>> GetRoom(string code)
    {
        var result = await GetRoomByCodeInternal(code.ToUpperInvariant());
        if (result.Value is null) return NotFound("Oylama odası bulunamadı.");
        return result;
    }

    [HttpPost("{code}/vote")]
    public async Task<ActionResult<RoomDto>> Vote(string code, CastVoteRequest req)
    {
        var userId = User.UserId();
        var userName = User.UserName();

        var room = await db.Rooms
            .Include(r => r.Options)
            .Include(r => r.Votes)
            .FirstOrDefaultAsync(r => r.Code == code.ToUpperInvariant());

        if (room is null) return NotFound("Oda bulunamadı.");
        if (room.IsClosed) return BadRequest("Bu oylama kapanmıştır.");

        var option = room.Options.FirstOrDefault(o => o.Id == req.RoomOptionId);
        if (option is null) return BadRequest("Geçersiz seçenek.");

        var existingVote = room.Votes.FirstOrDefault(v => v.UserId == userId);
        if (existingVote is not null)
        {
            existingVote.RoomOptionId = option.Id;
            existingVote.VotedAt = DateTime.UtcNow;
        }
        else
        {
            db.RoomVotes.Add(new RoomVote
            {
                RoomId = room.Id,
                RoomOptionId = option.Id,
                UserId = userId,
                UserName = userName,
                VotedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
        return await GetRoomByCodeInternal(room.Code);
    }

    [HttpPost("{code}/close")]
    public async Task<ActionResult<RoomDto>> Close(string code, CloseRoomRequest req)
    {
        var userId = User.UserId();
        var room = await db.Rooms
            .Include(r => r.Options).ThenInclude(o => o.Restaurant)
            .Include(r => r.Votes)
            .FirstOrDefaultAsync(r => r.Code == code.ToUpperInvariant());

        if (room is null) return NotFound("Oda bulunamadı.");
        if (room.CreatorUserId != userId) return Forbid("Sadece odayı oluşturan kişi oylamayı kapatabilir.");

        room.IsClosed = true;

        if (req.WinningRestaurantId.HasValue)
        {
            room.WinningRestaurantId = req.WinningRestaurantId;
        }
        else
        {
            // En çok oyu alanı kazanan yap
            var topGroup = room.Votes
                .GroupBy(v => v.RoomOptionId)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault();

            if (topGroup is not null)
            {
                var winningOpt = room.Options.FirstOrDefault(o => o.Id == topGroup.Key);
                room.WinningRestaurantId = winningOpt?.RestaurantId;
            }
        }

        await db.SaveChangesAsync();
        return await GetRoomByCodeInternal(room.Code);
    }

    private async Task<ActionResult<RoomDto>> GetRoomByCodeInternal(string code)
    {
        var userId = User.UserId();
        var room = await db.Rooms
            .Include(r => r.Options).ThenInclude(o => o.Restaurant)
            .Include(r => r.Votes)
            .Include(r => r.WinningRestaurant)
            .FirstOrDefaultAsync(r => r.Code == code);

        if (room is null) return NotFound();

        var myVote = room.Votes.FirstOrDefault(v => v.UserId == userId);

        var optionsDto = room.Options.Select(opt =>
        {
            var optVotes = room.Votes.Where(v => v.RoomOptionId == opt.Id).ToList();
            return new RoomOptionDto(
                opt.Id,
                opt.RestaurantId,
                opt.Restaurant?.Name ?? "Restoran",
                CuisineCatalog.Labels(opt.Restaurant?.Cuisines),
                opt.Restaurant?.GoogleRating,
                optVotes.Count,
                optVotes.Select(v => v.UserName).ToList()
            );
        }).OrderByDescending(o => o.VoteCount).ToList();

        var dto = new RoomDto(
            room.Id,
            room.Code,
            room.Title,
            room.CreatorUserId,
            room.IsClosed,
            room.WinningRestaurantId,
            room.WinningRestaurant?.Name,
            myVote?.RoomOptionId,
            optionsDto,
            room.Votes.Count
        );

        return dto;
    }

    private static string GenerateRoomCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var rnd = new Random();
        return new string(Enumerable.Repeat(chars, 5).Select(s => s[rnd.Next(s.Length)]).ToArray());
    }
}
