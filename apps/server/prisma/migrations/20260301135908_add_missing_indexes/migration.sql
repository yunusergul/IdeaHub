-- CreateIndex
CREATE INDEX "comments_parent_id_idx" ON "comments"("parent_id");

-- CreateIndex
CREATE INDEX "survey_options_survey_id_idx" ON "survey_options"("survey_id");

-- CreateIndex
CREATE INDEX "survey_votes_option_id_idx" ON "survey_votes"("option_id");

-- CreateIndex
CREATE INDEX "surveys_due_date_idx" ON "surveys"("due_date");

-- CreateIndex
CREATE INDEX "surveys_is_active_idx" ON "surveys"("is_active");
