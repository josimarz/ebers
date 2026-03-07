import initSqlJs, { type Database as SqlJsDatabase, type SqlJsStatic, type SqlJsConfig } from 'sql.js'
import { drizzle } from 'drizzle-orm/sql-js'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import * as schema from './schema'

// Database path will be set by environment variable or default
const getDatabasePath = (): string => {
  const dbUrl = process.env.DATABASE_URL
  
  if (!dbUrl) {
    console.warn(
      'DATABASE_URL not set. This should be configured by the Electron main process. ' +
      'Falling back to ./dev.db (development only).'
    )
    return './dev.db'
  }
  
  // Remove 'file:' prefix if present
  return dbUrl.replace(/^file:/, '')
}

// Singleton pattern for database connection
let dbInstance: ReturnType<typeof drizzle> | null = null
let sqliteInstance: SqlJsDatabase | null = null
let SQL: SqlJsStatic | null = null

async function initSQL(): Promise<SqlJsStatic> {
  if (!SQL) {
    let wasmPath: string;
    let wasmBinary: Buffer | undefined;
    
    // Usar APP_PATH se disponível (definido pelo Electron)
    if (process.env.APP_PATH) {
      wasmPath = join(process.env.APP_PATH, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    } else {
      // Fallback para desenvolvimento
      wasmPath = join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
    }
    
    // Tentar ler o WASM file
    if (existsSync(wasmPath)) {
      wasmBinary = readFileSync(wasmPath);
    } else {
      console.warn(`WASM file not found at: ${wasmPath}`);
    }
    
    const config: SqlJsConfig = {
      wasmBinary,
      // Fallback locateFile para ambientes onde wasmBinary não funciona
      locateFile: (file: string) => {
        if (file === 'sql-wasm.wasm') {
          return wasmPath;
        }
        return file;
      }
    };
    
    SQL = await initSqlJs(config);
  }
  return SQL;
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
    
    // O banco de dados DEVE existir — ele é inicializado e migrado pelo
    // processo principal do Electron (electron/database.js) antes do
    // Next.js iniciar. Se o arquivo não existir, algo deu errado na
    // inicialização.
    if (existsSync(dbPath)) {
      const buffer = readFileSync(dbPath)
      sqliteInstance = new SqlJs.Database(buffer)
    } else {
      throw new Error(
        `Database file not found at: ${dbPath}. ` +
        'The database must be initialized by the Electron main process before Next.js starts.'
      )
    }
    
    dbInstance = drizzle(sqliteInstance, { schema })
    
    // Setup auto-save every 5 seconds
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        saveDatabase()
      }, 5000)
    }
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
