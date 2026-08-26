/*
  Warnings:

  - You are about to drop the column `description` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `fileName` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `subject` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Resource` table. All the data in the column will be lost.
  - You are about to drop the column `thumbnailUrl` on the `Resource` table. All the data in the column will be lost.
  - Added the required column `mimeType` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Added the required column `originalFileName` to the `Resource` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `fileType` on the `Resource` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ResourceFileType" AS ENUM ('PDF', 'IMAGE');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('UPLOADED');

-- DropIndex
DROP INDEX "Resource_userId_fileType_idx";

-- DropIndex
DROP INDEX "Resource_userId_subject_idx";

-- AlterTable
ALTER TABLE "Resource" DROP COLUMN "description",
DROP COLUMN "fileName",
DROP COLUMN "subject",
DROP COLUMN "tags",
DROP COLUMN "thumbnailUrl",
ADD COLUMN     "mimeType" TEXT NOT NULL,
ADD COLUMN     "originalFileName" TEXT NOT NULL,
ADD COLUMN     "status" "ResourceStatus" NOT NULL DEFAULT 'UPLOADED',
DROP COLUMN "fileType",
ADD COLUMN     "fileType" "ResourceFileType" NOT NULL,
ALTER COLUMN "fileSize" DROP DEFAULT;
