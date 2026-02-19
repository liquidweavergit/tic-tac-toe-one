-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "screen_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "player_x_id" TEXT NOT NULL,
    "player_o_id" TEXT,
    "board_state" TEXT NOT NULL DEFAULT '_________',
    "current_turn" TEXT NOT NULL DEFAULT 'x',
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "winner" TEXT,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_screen_name_key" ON "users"("screen_name");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_player_x_id_fkey" FOREIGN KEY ("player_x_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_player_o_id_fkey" FOREIGN KEY ("player_o_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
