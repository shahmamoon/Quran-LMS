-- AlterTable: make IslamicCategory.type nullable
-- Categories without a type (null) appear under the ALL tab only.
ALTER TABLE "IslamicCategory" ALTER COLUMN "type" DROP NOT NULL;
