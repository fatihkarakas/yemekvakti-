using Google.Apis.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using YemekVakti.Api.Data;
using YemekVakti.Api.Models;
using YemekVakti.Api.Services;

namespace YemekVakti.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens, IConfiguration config, PlacesService places, GeminiService gemini) : ControllerBase
{
    private bool DemoEnabled => config.GetValue<bool>("Auth:AllowDemoLogin");

    [HttpGet("config")]
    public AuthConfigDto GetConfig() => new(config["Google:ClientId"], DemoEnabled, places.Enabled, gemini.Enabled);

    [HttpPost("google")]
    public async Task<ActionResult<LoginResponse>> Google(GoogleLoginRequest req)
    {
        var clientId = config["Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId)) return BadRequest("Google ClientId yapılandırılmamış.");

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(req.IdToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });
        }
        catch (InvalidJwtException)
        {
            return Unauthorized("Google oturumu doğrulanamadı.");
        }

        var allowed = config.GetSection("Auth:AllowedEmailDomains").Get<string[]>() ?? [];
        if (allowed.Length > 0 && !allowed.Any(d => payload.Email.EndsWith("@" + d, StringComparison.OrdinalIgnoreCase)))
            return StatusCode(403, "Bu e-posta adresiyle giriş izni yok.");

        var user = await Upsert($"google:{payload.Subject}", payload.Email, payload.Name ?? payload.Email, payload.Picture);
        return new LoginResponse(tokens.Create(user), ToDto(user));
    }

    [HttpPost("demo")]
    public async Task<ActionResult<LoginResponse>> Demo(DemoLoginRequest req)
    {
        if (!DemoEnabled) return NotFound();
        var name = string.IsNullOrWhiteSpace(req.Name) ? "Misafir" : req.Name.Trim();
        if (name.Length > 60) name = name[..60];
        var slug = name.ToLowerInvariant().Replace(' ', '.');
        var user = await Upsert($"demo:{slug}", $"{slug}@demo.local", name, null);
        return new LoginResponse(tokens.Create(user), ToDto(user));
    }

    private async Task<User> Upsert(string externalId, string email, string name, string? photo)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.ExternalId == externalId);
        if (user is null)
        {
            user = new User { ExternalId = externalId };
            db.Users.Add(user);
        }
        user.Email = email;
        user.Name = name;
        user.PhotoUrl = photo;
        user.LastLoginAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return user;
    }

    private static UserDto ToDto(User u) => new(u.Id, u.Name, u.Email, u.PhotoUrl);
}
