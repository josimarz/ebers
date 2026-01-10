-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "birthDate" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "religion" TEXT NOT NULL,
    "legalGuardian" TEXT,
    "legalGuardianEmail" TEXT,
    "legalGuardianCpf" TEXT,
    "phone1" TEXT NOT NULL,
    "phone2" TEXT,
    "email" TEXT,
    "hasTherapyHistory" BOOLEAN NOT NULL,
    "therapyHistoryDetails" TEXT,
    "takesMedication" BOOLEAN NOT NULL,
    "medicationSince" TEXT,
    "medicationNames" TEXT,
    "hasHospitalization" BOOLEAN NOT NULL,
    "hospitalizationDate" TEXT,
    "hospitalizationReason" TEXT,
    "consultationPrice" DECIMAL,
    "consultationFrequency" TEXT,
    "consultationDay" TEXT,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "paidAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "content" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "price" DECIMAL NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Consultation_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
