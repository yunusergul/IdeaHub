-- AlterEnum
ALTER TYPE "SurveyType" ADD VALUE 'development';

-- AlterTable
ALTER TABLE "survey_options" ADD COLUMN     "idea_id" TEXT;

-- AlterTable
ALTER TABLE "surveys" ADD COLUMN     "auto_transition" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "target_sprint_id" TEXT,
ADD COLUMN     "target_status_id" TEXT,
ADD COLUMN     "transitioned_at" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_target_status_id_fkey" FOREIGN KEY ("target_status_id") REFERENCES "statuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_target_sprint_id_fkey" FOREIGN KEY ("target_sprint_id") REFERENCES "sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_options" ADD CONSTRAINT "survey_options_idea_id_fkey" FOREIGN KEY ("idea_id") REFERENCES "ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
