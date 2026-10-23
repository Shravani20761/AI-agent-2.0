-- CreateEnum
CREATE TYPE "TeacherAvailabilityStatus" AS ENUM ('AVAILABLE', 'ON_LEAVE', 'PARTIAL');

-- CreateTable
CREATE TABLE "timetable_entries" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "faculty_name" TEXT,
    "room" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "timetable_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_availability" (
    "id" TEXT NOT NULL,
    "faculty_name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "TeacherAvailabilityStatus" NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_schedules" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "test_date" TIMESTAMP(3) NOT NULL,
    "syllabus" TEXT,
    "max_marks" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faqs" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faqs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "timetable_entries_batch_id_idx" ON "timetable_entries"("batch_id");

-- CreateIndex
CREATE INDEX "teacher_availability_faculty_name_idx" ON "teacher_availability"("faculty_name");

-- CreateIndex
CREATE INDEX "teacher_availability_date_idx" ON "teacher_availability"("date");

-- CreateIndex
CREATE INDEX "test_schedules_batch_id_idx" ON "test_schedules"("batch_id");

-- CreateIndex
CREATE INDEX "test_schedules_test_date_idx" ON "test_schedules"("test_date");

-- CreateIndex
CREATE INDEX "faqs_category_idx" ON "faqs"("category");

-- CreateIndex
CREATE INDEX "faqs_is_active_idx" ON "faqs"("is_active");

-- AddForeignKey
ALTER TABLE "timetable_entries" ADD CONSTRAINT "timetable_entries_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_schedules" ADD CONSTRAINT "test_schedules_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
