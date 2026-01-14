const initSqlJs = require('sql.js');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('fs');
const { dirname, join } = require('path');

let SQL = null;
let db = null;

const initializeDatabase = async (databasePath) => {
  try {
    console.log('Initializing database at:', databasePath);
    
    // Initialize sql.js with WASM binary
    if (!SQL) {
      // In Node.js/Electron, we need to provide the WASM binary directly
      const wasmPath = join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
      
      let wasmBinary;
      if (existsSync(wasmPath)) {
        wasmBinary = readFileSync(wasmPath);
        console.log('Loaded WASM from:', wasmPath);
      } else {
        console.log('WASM file not found at:', wasmPath);
      }
      
      SQL = await initSqlJs({
        wasmBinary,
        locateFile: (file) => {
          if (file === 'sql-wasm.wasm') {
            return wasmPath;
          }
          return file;
        }
      });
    }
    
    // Ensure directory exists
    const dir = dirname(databasePath);
    if (dir && dir !== '.' && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    // Load existing database or create new one
    if (existsSync(databasePath)) {
      const buffer = readFileSync(databasePath);
      db = new SQL.Database(buffer);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
    
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
    
    // Save database to file
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(databasePath, buffer);
    
    console.log('Database initialized successfully');
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

module.exports = { initializeDatabase };
