-- Add indexes for better query performance

-- Patient table indexes
CREATE INDEX "Patient_name_idx" ON "Patient"("name");
CREATE INDEX "Patient_birthDate_idx" ON "Patient"("birthDate");
CREATE INDEX "Patient_credits_idx" ON "Patient"("credits");
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");

-- Consultation table indexes  
CREATE INDEX "Consultation_patientId_idx" ON "Consultation"("patientId");
CREATE INDEX "Consultation_status_idx" ON "Consultation"("status");
CREATE INDEX "Consultation_paid_idx" ON "Consultation"("paid");
CREATE INDEX "Consultation_startedAt_idx" ON "Consultation"("startedAt");
CREATE INDEX "Consultation_createdAt_idx" ON "Consultation"("createdAt");

-- Composite indexes for common query patterns
CREATE INDEX "Consultation_patientId_status_idx" ON "Consultation"("patientId", "status");
CREATE INDEX "Consultation_status_startedAt_idx" ON "Consultation"("status", "startedAt");
CREATE INDEX "Patient_name_createdAt_idx" ON "Patient"("name", "createdAt");