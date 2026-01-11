const { spawn } = require('child_process');
const { join } = require('path');
const { existsSync } = require('fs');

const initializeDatabase = async (databasePath) => {
  try {
    console.log('Initializing database at:', databasePath);
    
    // Verificar se o banco já existe
    const dbExists = existsSync(databasePath);
    
    if (!dbExists) {
      console.log('Database does not exist, creating...');
    }

    // Executar prisma db push para criar/atualizar o schema
    const prismaPath = join(__dirname, '..', 'node_modules', '.bin', 'prisma');
    
    return new Promise((resolve, reject) => {
      const migrate = spawn(prismaPath, ['db', 'push', '--force-reset'], {
        cwd: join(__dirname, '..'),
        env: {
          ...process.env,
          DATABASE_URL: `file:${databasePath}`,
        },
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      migrate.stdout?.on('data', (data) => {
        const message = data.toString();
        console.log(`Prisma: ${message}`);
        output += message;
      });

      migrate.stderr?.on('data', (data) => {
        const message = data.toString();
        console.error(`Prisma Error: ${message}`);
        errorOutput += message;
      });

      migrate.on('close', (code) => {
        if (code === 0) {
          console.log('Database initialized successfully');
          resolve({ success: true, output });
        } else {
          console.error('Database initialization failed with code:', code);
          reject(new Error(`Prisma migration failed with code ${code}: ${errorOutput}`));
        }
      });

      migrate.on('error', (error) => {
        console.error('Failed to spawn prisma process:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

module.exports = { initializeDatabase };