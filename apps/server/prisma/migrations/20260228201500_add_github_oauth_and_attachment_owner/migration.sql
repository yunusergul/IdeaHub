-- AlterTable: make password_hash nullable for OAuth users
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: add github_id for GitHub OAuth
ALTER TABLE "users" ADD COLUMN "github_id" TEXT;

-- CreateIndex: unique constraint on github_id
CREATE UNIQUE INDEX "users_github_id_key" ON "users"("github_id");

-- CreateIndex: unique constraint on azure_id
CREATE UNIQUE INDEX "users_azure_id_key" ON "users"("azure_id");

-- AlterTable: add uploaded_by_id to attachments
ALTER TABLE "attachments" ADD COLUMN "uploaded_by_id" TEXT;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
