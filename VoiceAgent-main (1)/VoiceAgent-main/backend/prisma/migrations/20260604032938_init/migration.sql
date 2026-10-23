-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'AGENT');

-- CreateEnum
CREATE TYPE "LifecycleStage" AS ENUM ('LEAD', 'INTERESTED', 'DEMO_SCHEDULED', 'DEMO_ATTENDED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'ADMISSION_PENDING', 'STUDENT', 'ALUMNI', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WEBSITE', 'PHONE', 'WALKIN', 'WHATSAPP', 'META_ADS', 'GOOGLE_ADS', 'JUSTDIAL', 'INSTAGRAM', 'FACEBOOK', 'COLD_CALL', 'REFERRAL', 'VOICE_AGENT', 'MANUAL');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('DEMO', 'VISIT');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'ATTENDED', 'CANCELLED', 'NO_SHOW', 'RESCHEDULED');

-- CreateEnum
CREATE TYPE "AdmissionStage" AS ENUM ('QUALIFIED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED', 'ADMISSION_PENDING', 'ADMITTED', 'DROPPED');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('DEMO', 'VISIT', 'ADMISSION', 'FEE', 'CALLBACK', 'REVIEW', 'GENERAL');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommType" AS ENUM ('CALL', 'WHATSAPP', 'SMS', 'NOTE', 'EMAIL');

-- CreateEnum
CREATE TYPE "CommDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('ENQUIRY', 'COLD_CALLING', 'WARM_LEAD', 'ADMISSION_CONVERSION', 'REVIEW_REFERRAL', 'STUDENT_SUPPORT', 'FEE_ACCOUNTS', 'STUDENT_ENGAGEMENT', 'FEE_RECOVERY', 'MANUAL');

-- CreateEnum
CREATE TYPE "SupportTicketType" AS ENUM ('TIMETABLE', 'BATCH_CHANGE', 'STUDY_MATERIAL', 'APP_ISSUE', 'GENERAL');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ReviewReferralType" AS ENUM ('REVIEW', 'REFERRAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('REQUESTED', 'RECEIVED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "people" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "lifecycle_stage" "LifecycleStage" NOT NULL DEFAULT 'LEAD',
    "source" "LeadSource" NOT NULL DEFAULT 'MANUAL',
    "assigned_to" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "fee_monthly" INTEGER NOT NULL,
    "batch_timings" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timings" TEXT NOT NULL,
    "faculty_name" TEXT,
    "start_date" TIMESTAMP(3),
    "max_seats" INTEGER NOT NULL DEFAULT 30,
    "current_seats" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL DEFAULT 'WEBSITE',
    "course_interested" TEXT,
    "course_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'New',
    "assigned_to" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cold_calls" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "campaign" TEXT,
    "agent_type" "AgentType" NOT NULL DEFAULT 'COLD_CALLING',
    "outcome" TEXT,
    "duration_secs" INTEGER,
    "called_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "cold_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warm_leads" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "enquiry_id" TEXT,
    "qualification_score" INTEGER,
    "demo_status" TEXT,
    "visit_status" TEXT,
    "assigned_to" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warm_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "location" TEXT,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admissions" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "course_id" TEXT,
    "stage" "AdmissionStage" NOT NULL DEFAULT 'QUALIFIED',
    "scholarship_amount" INTEGER,
    "seat_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "admitted_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "admission_id" TEXT,
    "batch_id" TEXT,
    "roll_number" TEXT,
    "enrollment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_plans" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "installments_count" INTEGER NOT NULL DEFAULT 1,
    "paid_amount" INTEGER NOT NULL DEFAULT 0,
    "outstanding_amount" INTEGER NOT NULL,
    "next_due_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "fee_plan_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "reference" TEXT,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recorded_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL DEFAULT 'GENERAL',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "due_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT,
    "agent_type" "AgentType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communications" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "type" "CommType" NOT NULL,
    "direction" "CommDirection" NOT NULL DEFAULT 'INBOUND',
    "content" TEXT,
    "recording_url" TEXT,
    "agent_type" "AgentType",
    "duration_secs" INTEGER,
    "call_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_logs" (
    "id" TEXT NOT NULL,
    "agent_type" "AgentType" NOT NULL,
    "person_id" TEXT,
    "tool_used" TEXT,
    "input_summary" TEXT,
    "output_summary" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_referrals" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "type" "ReviewReferralType" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'REQUESTED',
    "platform" TEXT,
    "referred_person_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "type" "SupportTicketType" NOT NULL DEFAULT 'GENERAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "resolved_at" TIMESTAMP(3),
    "assigned_to" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "people_phone_key" ON "people"("phone");

-- CreateIndex
CREATE INDEX "people_phone_idx" ON "people"("phone");

-- CreateIndex
CREATE INDEX "people_lifecycle_stage_idx" ON "people"("lifecycle_stage");

-- CreateIndex
CREATE UNIQUE INDEX "courses_slug_key" ON "courses"("slug");

-- CreateIndex
CREATE INDEX "enquiries_person_id_idx" ON "enquiries"("person_id");

-- CreateIndex
CREATE INDEX "enquiries_status_idx" ON "enquiries"("status");

-- CreateIndex
CREATE INDEX "enquiries_source_idx" ON "enquiries"("source");

-- CreateIndex
CREATE INDEX "cold_calls_person_id_idx" ON "cold_calls"("person_id");

-- CreateIndex
CREATE INDEX "cold_calls_campaign_idx" ON "cold_calls"("campaign");

-- CreateIndex
CREATE INDEX "warm_leads_person_id_idx" ON "warm_leads"("person_id");

-- CreateIndex
CREATE INDEX "appointments_person_id_idx" ON "appointments"("person_id");

-- CreateIndex
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at");

-- CreateIndex
CREATE INDEX "admissions_person_id_idx" ON "admissions"("person_id");

-- CreateIndex
CREATE INDEX "admissions_stage_idx" ON "admissions"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "students_person_id_key" ON "students"("person_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_admission_id_key" ON "students"("admission_id");

-- CreateIndex
CREATE INDEX "students_status_idx" ON "students"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_plans_student_id_key" ON "fee_plans"("student_id");

-- CreateIndex
CREATE INDEX "payments_fee_plan_id_idx" ON "payments"("fee_plan_id");

-- CreateIndex
CREATE INDEX "follow_ups_person_id_idx" ON "follow_ups"("person_id");

-- CreateIndex
CREATE INDEX "follow_ups_due_at_idx" ON "follow_ups"("due_at");

-- CreateIndex
CREATE INDEX "follow_ups_status_idx" ON "follow_ups"("status");

-- CreateIndex
CREATE INDEX "communications_person_id_idx" ON "communications"("person_id");

-- CreateIndex
CREATE INDEX "communications_type_idx" ON "communications"("type");

-- CreateIndex
CREATE INDEX "communications_created_at_idx" ON "communications"("created_at");

-- CreateIndex
CREATE INDEX "agent_logs_agent_type_idx" ON "agent_logs"("agent_type");

-- CreateIndex
CREATE INDEX "agent_logs_created_at_idx" ON "agent_logs"("created_at");

-- CreateIndex
CREATE INDEX "review_referrals_person_id_idx" ON "review_referrals"("person_id");

-- CreateIndex
CREATE INDEX "support_tickets_person_id_idx" ON "support_tickets"("person_id");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cold_calls" ADD CONSTRAINT "cold_calls_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warm_leads" ADD CONSTRAINT "warm_leads_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warm_leads" ADD CONSTRAINT "warm_leads_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "admissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_plans" ADD CONSTRAINT "fee_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_fee_plan_id_fkey" FOREIGN KEY ("fee_plan_id") REFERENCES "fee_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communications" ADD CONSTRAINT "communications_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_referrals" ADD CONSTRAINT "review_referrals_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
