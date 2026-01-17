const initSqlJs = require('sql.js');
const { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } = require('fs');
const { dirname, join } = require('path');

let SQL = null;
let db = null;

const runMigrations = async (db, migrationsPath) => {
  console.log('Running migrations from:', migrationsPath);
  
  if (!existsSync(migrationsPath)) {
    console.log('No migrations directory found, skipping migrations');
    return;
  }
  
  // Criar tabela de controle de migrations se não existir
  db.run(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  
  // Ler migrations aplicadas
  const appliedMigrations = new Set();
  try {
    const result = db.exec('SELECT hash FROM __drizzle_migrations');
    if (result.length > 0 && result[0].values) {
      result[0].values.forEach(row => appliedMigrations.add(row[0]));
    }
  } catch (error) {
    console.log('No migrations applied yet');
  }
  
  // Ler arquivos de migration
  const migrationFiles = readdirSync(migrationsPath)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  console.log(`Found ${migrationFiles.length} migration files`);
  
  for (const file of migrationFiles) {
    const hash = file.replace('.sql', '');
    
    if (appliedMigrations.has(hash)) {
      console.log(`✓ Migration already applied: ${file}`);
      continue;
    }
    
    const migrationPath = join(migrationsPath, file);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log(`Running migration: ${file}`);
    
    try {
      // Dividir por statements (separados por ;)
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        db.run(statement);
      }
      
      // Registrar migration como aplicada
      db.run(
        'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
        [hash, Date.now()]
      );
      
      console.log(`✓ Migration applied: ${file}`);
    } catch (error) {
      console.error(`✗ Failed to apply migration ${file}:`, error);
      throw error;
    }
  }
  
  console.log('All migrations completed successfully');
};

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
    const isNewDatabase = !existsSync(databasePath);
    
    if (!isNewDatabase) {
      const buffer = readFileSync(databasePath);
      db = new SQL.Database(buffer);
      console.log('Loaded existing database');
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
    
    // Run Drizzle migrations
    // Em produção empacotada, as migrations estão em extraResources
    let migrationsPath = join(__dirname, '..', 'drizzle');
    
    // Se não encontrar, tentar em Resources (extraResources do electron-builder)
    if (!existsSync(migrationsPath)) {
      const { app } = require('electron');
      const resourcesPath = process.resourcesPath || join(app.getAppPath(), '..');
      migrationsPath = join(resourcesPath, 'drizzle');
    }
    
    await runMigrations(db, migrationsPath);
    
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
