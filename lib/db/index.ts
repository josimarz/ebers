import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic, type SqlJsConfig } from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import * as schema from './schema'

// Database path will be set by environment variable or default
const getDatabasePath = (): string => {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
  // Remove 'file:' prefix if present
  return dbUrl.replace(/^file:/, '')
}

// Singleton pattern for database connection
let dbInstance: ReturnType<typeof drizzle> | null = null
let sqliteInstance: SqlJsDatabase | null = null
let SQL: SqlJsStatic | null = null

async function initSQL(): Promise<SqlJsStatic> {
  if (!SQL) {
    // In Node.js, we need to provide the WASM binary directly
    const wasmPath = join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    
    // Read the WASM file as a buffer and pass it directly
    let wasmBinary: Buffer | undefined
    if (existsSync(wasmPath)) {
      wasmBinary = readFileSync(wasmPath)
    }
    
    const config: SqlJsConfig = {
      wasmBinary,
      // Fallback locateFile for environments where wasmBinary doesn't work
      locateFile: (file: string) => {
        if (file === 'sql-wasm.wasm') {
          return wasmPath
        }
        return file
      }
    }
    
    SQL = await initSqlJs(config)
  }
  return SQL
}

export async function getDbAsync() {
  if (!dbInstance) {
    const SqlJs = await initSQL()
    const dbPath = getDatabasePath()
    
    // Ensure directory exists
    const dir = dirname(dbPath)
    if (dir && dir !== '.' && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    // Load existing database or create new one
    if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath)
      sqliteInstance = new SqlJs.Database(buffer)
    } else {
      sqliteInstance = new SqlJs.Database()
      // Initialize schema
      initializeSchema(sqliteInstance)
      // Save to file
      saveDatabase()
    }
    
    dbInstance = drizzle(sqliteInstance, { schema })
  }
  return dbInstance
}

// Synchronous version for compatibility (requires prior initialization)
export function getDb() {
  if (!dbInstance || !sqliteInstance) {
    throw new Error('Database not initialized. Call initializeDb() first.')
  }
  return dbInstance
}

export function getSqlite(): SqlJsDatabase {
  if (!sqliteInstance) {
    throw new Error('Database not initialized. Call initializeDb() first.')
  }
  return sqliteInstance
}

export function saveDatabase(): void {
  if (sqliteInstance) {
    const data = sqliteInstance.export()
    const buffer = Buffer.from(data)
    const dbPath = getDatabasePath()
    
    // Ensure directory exists
    const dir = dirname(dbPath)
    if (dir && dir !== '.' && !existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    writeFileSync(dbPath, buffer)
  }
}

export function closeDb(): void {
  if (sqliteInstance) {
    saveDatabase()
    sqliteInstance.close()
    sqliteInstance = null
    dbInstance = null
  }
}

function initializeSchema(db: SqlJsDatabase): void {
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
  `)
  
  // Create Patient indexes
  db.run('CREATE INDEX IF NOT EXISTS Patient_name_idx ON Patient(name)')
  db.run('CREATE INDEX IF NOT EXISTS Patient_birthDate_idx ON Patient(birthDate)')
  db.run('CREATE INDEX IF NOT EXISTS Patient_credits_idx ON Patient(credits)')
  db.run('CREATE INDEX IF NOT EXISTS Patient_createdAt_idx ON Patient(createdAt)')
  
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
  `)
  
  // Create Consultation indexes
  db.run('CREATE INDEX IF NOT EXISTS Consultation_patientId_idx ON Consultation(patientId)')
  db.run('CREATE INDEX IF NOT EXISTS Consultation_status_idx ON Consultation(status)')
  db.run('CREATE INDEX IF NOT EXISTS Consultation_paid_idx ON Consultation(paid)')
  db.run('CREATE INDEX IF NOT EXISTS Consultation_startedAt_idx ON Consultation(startedAt)')
}

// Initialize database on module load for server-side usage
let initPromise: Promise<void> | null = null

export async function initializeDb(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await getDbAsync()
    })()
  }
  return initPromise
}

// Re-export schema and types
export * from './schema'
export { schema }
