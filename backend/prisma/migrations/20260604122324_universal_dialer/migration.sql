-- CreateTable
CREATE TABLE "outbound_call_queue" (
    "id" TEXT NOT NULL,
    "agent_type" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "person_id" TEXT,
    "related_id" TEXT,
    "related_type" TEXT,
    "workflow_uuid" TEXT NOT NULL,
    "workflow_id" INTEGER NOT NULL,
    "initial_context" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "dograh_run_id" INTEGER,
    "outcome" TEXT,
    "gathered_ctx" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "scheduled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "campaign" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_call_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbound_call_queue_status_scheduled_at_priority_idx" ON "outbound_call_queue"("status", "scheduled_at", "priority");

-- CreateIndex
CREATE INDEX "outbound_call_queue_person_id_idx" ON "outbound_call_queue"("person_id");

-- AddForeignKey
ALTER TABLE "outbound_call_queue" ADD CONSTRAINT "outbound_call_queue_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;
