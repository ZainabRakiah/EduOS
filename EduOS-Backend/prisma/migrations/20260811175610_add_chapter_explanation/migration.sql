-- CreateEnum
CREATE TYPE "ExplanationStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "ChapterExplanation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "class" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "originalType" TEXT NOT NULL,
    "originalFile" TEXT,
    "originalText" TEXT,
    "status" "ExplanationStatus" NOT NULL DEFAULT 'UPLOADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChapterExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChapterExplanation_userId_idx" ON "ChapterExplanation"("userId");

-- AddForeignKey
ALTER TABLE "ChapterExplanation" ADD CONSTRAINT "ChapterExplanation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
