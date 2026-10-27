-- CreateEnum
CREATE TYPE "DemoMode" AS ENUM ('GEMINI_LIVE', 'SARVAM_PIPELINE');

-- CreateEnum
CREATE TYPE "DemoCallStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "demo_calls" (
    "id" TEXT NOT NULL,
    "mode" "DemoMode" NOT NULL,
    "status" "DemoCallStatus" NOT NULL DEFAULT 'ACTIVE',
    "end_reason" TEXT,
    "room_name" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "contact_course" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration_secs" INTEGER,
    "audio_input_tokens" INTEGER,
    "audio_output_tokens" INTEGER,
    "stt_audio_secs" INTEGER,
    "tts_characters" INTEGER,
    "tts_audio_secs" INTEGER,
    "llm_input_tokens" INTEGER,
    "llm_output_tokens" INTEGER,
    "last_usage_seq" INTEGER,
    "total_cost_inr" DOUBLE PRECISION,
    "cost_per_min_inr" DOUBLE PRECISION,
    "pricing_version" TEXT NOT NULL DEFAULT '2026-10-provisional',
    "cost_basis" TEXT NOT NULL DEFAULT 'provisional_estimate',

    CONSTRAINT "demo_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_tool_calls" (
    "id" TEXT NOT NULL,
    "demo_call_id" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "result" JSONB,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "duration_ms" INTEGER,
    "called_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demo_calls_mode_idx" ON "demo_calls"("mode");

-- CreateIndex
CREATE INDEX "demo_calls_started_at_idx" ON "demo_calls"("started_at");

-- CreateIndex
CREATE INDEX "demo_calls_status_idx" ON "demo_calls"("status");

-- CreateIndex
CREATE INDEX "demo_tool_calls_demo_call_id_idx" ON "demo_tool_calls"("demo_call_id");

-- CreateIndex
CREATE INDEX "demo_tool_calls_called_at_idx" ON "demo_tool_calls"("called_at");

-- AddForeignKey
ALTER TABLE "demo_tool_calls" ADD CONSTRAINT "demo_tool_calls_demo_call_id_fkey" FOREIGN KEY ("demo_call_id") REFERENCES "demo_calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
