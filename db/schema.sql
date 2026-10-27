IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE TABLE [yv_Restaurants] (
        [Id] int NOT NULL IDENTITY,
        [GooglePlaceId] nvarchar(128) NULL,
        [Name] nvarchar(200) NOT NULL,
        [Address] nvarchar(400) NULL,
        [Lat] float NOT NULL,
        [Lng] float NOT NULL,
        [Cuisines] nvarchar(200) NOT NULL,
        [PriceLevel] int NULL,
        [GoogleRating] float NULL,
        [GoogleRatingCount] int NULL,
        [MapsUrl] nvarchar(512) NULL,
        [CreatedByUserId] int NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_yv_Restaurants] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE TABLE [yv_SuggestionLogs] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [RestaurantId] int NOT NULL,
        [Source] nvarchar(20) NOT NULL,
        [SelectedCuisines] nvarchar(200) NULL,
        [Reason] nvarchar(500) NULL,
        [Accepted] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_yv_SuggestionLogs] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE TABLE [yv_Users] (
        [Id] int NOT NULL IDENTITY,
        [ExternalId] nvarchar(128) NOT NULL,
        [Email] nvarchar(256) NOT NULL,
        [Name] nvarchar(128) NOT NULL,
        [PhotoUrl] nvarchar(512) NULL,
        [CreatedAt] datetime2 NOT NULL,
        [LastLoginAt] datetime2 NOT NULL,
        CONSTRAINT [PK_yv_Users] PRIMARY KEY ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE TABLE [yv_Preferences] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [RestaurantId] int NOT NULL,
        [Type] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_yv_Preferences] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_yv_Preferences_yv_Restaurants_RestaurantId] FOREIGN KEY ([RestaurantId]) REFERENCES [yv_Restaurants] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE TABLE [yv_Visits] (
        [Id] int NOT NULL IDENTITY,
        [UserId] int NOT NULL,
        [RestaurantId] int NOT NULL,
        [VisitedAt] datetime2 NOT NULL,
        [Source] nvarchar(20) NOT NULL,
        [Stars] int NULL,
        [Note] nvarchar(1000) NULL,
        [RatedAt] datetime2 NULL,
        CONSTRAINT [PK_yv_Visits] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_yv_Visits_yv_Restaurants_RestaurantId] FOREIGN KEY ([RestaurantId]) REFERENCES [yv_Restaurants] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_yv_Visits_yv_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [yv_Users] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_yv_Preferences_RestaurantId] ON [yv_Preferences] ([RestaurantId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_yv_Preferences_UserId_RestaurantId] ON [yv_Preferences] ([UserId], [RestaurantId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_yv_Restaurants_GooglePlaceId] ON [yv_Restaurants] ([GooglePlaceId]) WHERE [GooglePlaceId] IS NOT NULL');
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_yv_Users_ExternalId] ON [yv_Users] ([ExternalId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_yv_Visits_RestaurantId] ON [yv_Visits] ([RestaurantId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    CREATE INDEX [IX_yv_Visits_UserId_VisitedAt] ON [yv_Visits] ([UserId], [VisitedAt]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027053550_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261027053550_InitialCreate', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE TABLE [yv_Rooms] (
        [Id] int NOT NULL IDENTITY,
        [Code] nvarchar(16) NOT NULL,
        [Title] nvarchar(100) NOT NULL,
        [CreatorUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ExpiresAt] datetime2 NOT NULL,
        [IsClosed] bit NOT NULL,
        [WinningRestaurantId] int NULL,
        CONSTRAINT [PK_yv_Rooms] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_yv_Rooms_yv_Restaurants_WinningRestaurantId] FOREIGN KEY ([WinningRestaurantId]) REFERENCES [yv_Restaurants] ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE TABLE [yv_RoomOptions] (
        [Id] int NOT NULL IDENTITY,
        [RoomId] int NOT NULL,
        [RestaurantId] int NOT NULL,
        CONSTRAINT [PK_yv_RoomOptions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_yv_RoomOptions_yv_Restaurants_RestaurantId] FOREIGN KEY ([RestaurantId]) REFERENCES [yv_Restaurants] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_yv_RoomOptions_yv_Rooms_RoomId] FOREIGN KEY ([RoomId]) REFERENCES [yv_Rooms] ([Id]) ON DELETE CASCADE
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE TABLE [yv_RoomVotes] (
        [Id] int NOT NULL IDENTITY,
        [RoomId] int NOT NULL,
        [RoomOptionId] int NOT NULL,
        [UserId] int NOT NULL,
        [UserName] nvarchar(100) NOT NULL,
        [VotedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_yv_RoomVotes] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_yv_RoomVotes_yv_RoomOptions_RoomOptionId] FOREIGN KEY ([RoomOptionId]) REFERENCES [yv_RoomOptions] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_yv_RoomVotes_yv_Rooms_RoomId] FOREIGN KEY ([RoomId]) REFERENCES [yv_Rooms] ([Id])
    );
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE INDEX [IX_yv_RoomOptions_RestaurantId] ON [yv_RoomOptions] ([RestaurantId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE INDEX [IX_yv_RoomOptions_RoomId] ON [yv_RoomOptions] ([RoomId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE UNIQUE INDEX [IX_yv_Rooms_Code] ON [yv_Rooms] ([Code]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE INDEX [IX_yv_Rooms_WinningRestaurantId] ON [yv_Rooms] ([WinningRestaurantId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE UNIQUE INDEX [IX_yv_RoomVotes_RoomId_UserId] ON [yv_RoomVotes] ([RoomId], [UserId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    CREATE INDEX [IX_yv_RoomVotes_RoomOptionId] ON [yv_RoomVotes] ([RoomOptionId]);
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027054627_AddRooms'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261027054627_AddRooms', N'8.0.11');
END;
GO

COMMIT;
GO

BEGIN TRANSACTION;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027062131_AddAvgPriceTl'
)
BEGIN
    ALTER TABLE [yv_Restaurants] ADD [AvgPriceTl] int NULL;
END;
GO

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261027062131_AddAvgPriceTl'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261027062131_AddAvgPriceTl', N'8.0.11');
END;
GO

COMMIT;
GO

