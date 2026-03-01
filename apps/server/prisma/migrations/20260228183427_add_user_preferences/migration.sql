-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notify_app_comment" BOOLEAN NOT NULL DEFAULT true,
    "notify_app_vote" BOOLEAN NOT NULL DEFAULT true,
    "notify_app_status" BOOLEAN NOT NULL DEFAULT true,
    "notify_app_survey" BOOLEAN NOT NULL DEFAULT true,
    "notify_email_comment" BOOLEAN NOT NULL DEFAULT false,
    "notify_email_vote" BOOLEAN NOT NULL DEFAULT false,
    "notify_email_status" BOOLEAN NOT NULL DEFAULT false,
    "notify_email_survey" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
