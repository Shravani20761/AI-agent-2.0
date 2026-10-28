-- AlterTable
ALTER TABLE "cold_calls" ADD COLUMN "dograh_run_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "cold_calls_dograh_run_id_key" ON "cold_calls"("dograh_run_id");
