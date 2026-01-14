const initSqlJs = require('sql.js');
const { existsSync, writeFileSync, mkdirSync } = require('fs');
const { dirname } = require('path');

const dbPath = process.argv[2] || './dev.db';
console.log('Initializing database at:', dbPath);

async function init() {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Create Patient table
  db.run(`
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
  `);

  // Create Patient indexes
  db.run('CREATE INDEX IF NOT EXISTS Patient_name_idx ON Patient(name)');
  db.run('CREATE INDEX IF NOT EXISTS Patient_birthDate_idx ON Patient(birthDate)');
  db.run('CREATE INDEX IF NOT EXISTS Patient_credits_idx ON Patient(credits)');
  db.run('CREATE INDEX IF NOT EXISTS Patient_createdAt_idx ON Patient(createdAt)');

  // Create Consultation table
  db.run(`
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
  `);

  // Create Consultation indexes
  db.run('CREATE INDEX IF NOT EXISTS Consultation_patientId_idx ON Consultation(patientId)');
  db.run('CREATE INDEX IF NOT EXISTS Consultation_status_idx ON Consultation(status)');
  db.run('CREATE INDEX IF NOT EXISTS Consultation_paid_idx ON Consultation(paid)');
  db.run('CREATE INDEX IF NOT EXISTS Consultation_startedAt_idx ON Consultation(startedAt)');

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (dir && dir !== '.' && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Save database to file
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(dbPath, buffer);

  db.close();
  console.log('Database initialized successfully');
}

init().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
