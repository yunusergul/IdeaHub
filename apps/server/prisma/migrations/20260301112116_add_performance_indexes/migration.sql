-- CreateIndex
CREATE INDEX "comments_idea_id_idx" ON "comments"("idea_id");

-- CreateIndex
CREATE INDEX "ideas_category_id_idx" ON "ideas"("category_id");

-- CreateIndex
CREATE INDEX "ideas_status_id_idx" ON "ideas"("status_id");

-- CreateIndex
CREATE INDEX "ideas_sprint_id_idx" ON "ideas"("sprint_id");

-- CreateIndex
CREATE INDEX "ideas_author_id_idx" ON "ideas"("author_id");

-- CreateIndex
CREATE INDEX "ideas_created_at_idx" ON "ideas"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
