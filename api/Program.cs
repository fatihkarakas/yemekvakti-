using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using YemekVakti.Api.Data;
using YemekVakti.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
var cfg = builder.Configuration;

// ---------- Veritabanı (MSSQL veya SQLite) ----------
var provider = cfg["Database:Provider"] ?? "SqlServer";
builder.Services.AddDbContext<AppDbContext>(o =>
{
    if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
    {
        o.UseSqlite(cfg.GetConnectionString("Sqlite") ?? "Data Source=yemekvakti.db");
    }
    else
    {
        var connStr = cfg.GetConnectionString("DefaultConnection") ?? cfg.GetConnectionString("SqlServer");
        o.UseSqlServer(connStr, sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(5), errorNumbersToAdd: null);
        });
    }
});

// ---------- Kimlik doğrulama ----------
var jwtKey = cfg["Jwt:Key"] ?? "yemekvakti-default-production-secure-jwt-key-2026-auth";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidIssuer = cfg["Jwt:Issuer"] ?? "yemekvakti",
        ValidAudience = cfg["Jwt:Issuer"] ?? "yemekvakti",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromMinutes(2)
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddHttpClient<PlacesService>(c => c.Timeout = TimeSpan.FromSeconds(10));
builder.Services.AddHttpClient<GeminiService>(c => c.Timeout = TimeSpan.FromSeconds(15));
builder.Services.AddScoped<RecommendationService>();
builder.Services.AddSingleton<TokenService>();

var allowedOrigins = cfg.GetSection("Cors:Origins").Get<string[]>() ?? [
    "http://localhost:4200",
    "http://localhost:5058",
    "https://yemekvakti.fatihkarakas.com.tr",
    "http://yemekvakti.fatihkarakas.com.tr"
];

builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.WithOrigins(allowedOrigins)
     .AllowAnyHeader()
     .AllowAnyMethod()
     .SetIsOriginAllowed(_ => true) // dev & subdomain dostu
     .AllowCredentials()));

var app = builder.Build();

// ---------- Şema oluşturma / Otomatik Migrate ----------
using (var scope = app.Services.CreateScope())
{
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (db.Database.IsSqlite())
        {
            db.Database.EnsureCreated();
        }
        else if (cfg.GetValue("Database:AutoMigrate", true))
        {
            logger.LogInformation("Veritabanı migration uygulanıyor...");
            db.Database.Migrate();
            logger.LogInformation("Veritabanı migration başarıyla tamamlandı.");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Veritabanı migration veya bağlantı sırasında bir hata oluştu.");
    }
}

app.UseCors();
app.UseDefaultFiles();   // Angular build'i wwwroot'a kopyalanır
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();
