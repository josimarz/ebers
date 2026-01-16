import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { sql } from 'drizzle-orm'

/**
 * Creates the database schema if it doesn't exist.
 * This is called on application startup.
 */
export function initializeDatabase(databasePath: string): void {
  console.log('Initializing database at:', databasePath)
  
  const sqlite = new Database(databasePath)
  
  // Enable WAL mode for better performance
  sqlite.pragma('journal_mode = WAL')
  
  const db = drizzle(sqlite)
  
  // Create Patient table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS Patient (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      profilePhoto TEXT,
      birthDate INTEGER NOT NULL,
      gender TEXT NOT NULL,
      cpf TEXT,
      rg TEXT,
      religion TEXT NOT NULL,
      legalGuardian TEXT,
      legalGuardianEmail TEXT,
      legalGuardianCpf TEXT,
      phone1 TEXT NOT NULL,
      phone2 TEXT,
      email TEXT,
      hasTherapyHistory INTEGER NOT NULL,
      therapyHistoryDetails TEXT,
      takesMedication INTEGER NOT NULL,
      medicationSince TEXT,
      medicationNames TEXT,
      hasHospitalization INTEGER NOT NULL,
      hospitalizationDate TEXT,
      hospitalizationReason TEXT,
      consultationPrice REAL,
      consultationFrequency TEXT,
      consultationDay TEXT,
      credits INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `)
  
  // Create Patient indexes
  db.run(sql`CREATE INDEX IF NOT EXISTS Patient_name_idx ON Patient(name)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Patient_birthDate_idx ON Patient(birthDate)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Patient_credits_idx ON Patient(credits)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Patient_createdAt_idx ON Patient(createdAt)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Patient_name_createdAt_idx ON Patient(name, createdAt)`)
  
  // Create Consultation table
  db.run(sql`
    CREATE TABLE IF NOT EXISTS Consultation (
      id TEXT PRIMARY KEY,
      patientId TEXT NOT NULL REFERENCES Patient(id),
      startedAt INTEGER NOT NULL,
      finishedAt INTEGER,
      paidAt INTEGER,
      status TEXT NOT NULL DEFAULT 'OPEN',
      content TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `)
  
  // Create Consultation indexes
  db.run(sql`CREATE INDEX IF NOT EXISTS Consultation_patientId_idx ON Consultation(patientId)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Consultation_status_idx ON Consultation(status)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Consultation_paid_idx ON Consultation(paid)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Consultation_startedAt_idx ON Consultation(startedAt)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Consultation_createdAt_idx ON Consultation(createdAt)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Consultation_patientId_status_idx ON Consultation(patientId, status)`)
  db.run(sql`CREATE INDEX IF NOT EXISTS Consultation_status_startedAt_idx ON Consultation(status, startedAt)`)
  
  sqlite.close()
  
  console.log('Database initialized successfully')
}

/**
 * Runs any pending migrations.
 * For now, this just ensures the schema exists.
 */
export function runMigrations(databasePath: string): void {
  initializeDatabase(databasePath)
}
