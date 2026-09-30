-- AlterTable
ALTER TABLE "games" ADD COLUMN     "hasReport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "report" JSONB;

-- AlterTable
ALTER TABLE "players" ADD COLUMN     "ratingAfter" INTEGER,
ADD COLUMN     "ratingBefore" INTEGER,
ADD COLUMN     "ratingPool" TEXT,
ADD COLUMN     "ratingVersion" INTEGER,
ADD COLUMN     "unratedReason" TEXT;

-- CreateTable
CREATE TABLE "player_ratings" (
    "userId" TEXT NOT NULL,
    "poolKey" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1000,
    "ratedGames" INTEGER NOT NULL DEFAULT 0,
    "ratedWins" INTEGER NOT NULL DEFAULT 0,
    "peakRating" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_ratings_pkey" PRIMARY KEY ("userId","poolKey")
);

-- CreateIndex
CREATE INDEX "player_ratings_poolKey_rating_userId_idx" ON "player_ratings"("poolKey", "rating", "userId");

-- CreateIndex
CREATE INDEX "games_startedAt_id_idx" ON "games"("startedAt", "id");

-- AddForeignKey
ALTER TABLE "player_ratings" ADD CONSTRAINT "player_ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
