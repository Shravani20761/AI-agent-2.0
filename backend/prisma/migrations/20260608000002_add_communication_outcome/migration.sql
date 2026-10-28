-- AlterTable
ALTER TABLE "communications" ADD COLUMN "outcome" TEXT;

-- CreateIndex
CREATE INDEX "communications_call_id_idx" ON "communications"("call_id");
