const { execSync } = require('child_process');
const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const ROOT_DIR = join(__dirname, '..');
const PACKAGE_JSON_PATH = join(ROOT_DIR, 'package.json');

const exec = (command, options = {}) => {
  console.log(`\n> ${command}`);
  try {
    return execSync(command, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
      ...options
    });
  } catch (error) {
    console.error(`\n❌ Erro ao executar: ${command}`);
    throw error;
  }
};

const getCurrentVersion = () => {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  return packageJson.version;
};

const updateVersion = (newVersion) => {
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
  packageJson.version = newVersion;
  writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✓ Versão atualizada para ${newVersion}`);
};

const validateVersion = (version) => {
  const versionRegex = /^\d+\.\d+\.\d+$/;
  if (!versionRegex.test(version)) {
    throw new Error('Versão inválida. Use o formato: X.Y.Z (ex: 1.0.0)');
  }
};

const checkGitStatus = () => {
  try {
    const status = execSync('git status --porcelain', { 
      encoding: 'utf-8',
      cwd: ROOT_DIR 
    });
    
    if (status.trim()) {
      console.log('\n⚠️  Existem alterações não commitadas:');
      console.log(status);
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      return new Promise((resolve) => {
        readline.question('\nDeseja continuar mesmo assim? (s/N): ', (answer) => {
          readline.close();
          if (answer.toLowerCase() !== 's') {
            console.log('\n❌ Release cancelada');
            process.exit(0);
          }
          resolve();
        });
      });
    }
  } catch (error) {
    console.log('⚠️  Não foi possível verificar o status do Git');
  }
};

const release = async () => {
  console.log('🚀 Iniciando processo de release...\n');
  
  // Obter nova versão dos argumentos
  const newVersion = process.argv[2];
  
  if (!newVersion) {
    const currentVersion = getCurrentVersion();
    console.error('❌ Versão não especificada!');
    console.log(`\nVersão atual: ${currentVersion}`);
    console.log('\nUso: npm run release <versão>');
    console.log('Exemplo: npm run release 1.0.0');
    process.exit(1);
  }
  
  // Validar formato da versão
  validateVersion(newVersion);
  
  const currentVersion = getCurrentVersion();
  console.log(`Versão atual: ${currentVersion}`);
  console.log(`Nova versão: ${newVersion}\n`);
  
  // Verificar status do Git
  await checkGitStatus();
  
  try {
    // 1. Executar testes
    console.log('\n📋 Etapa 1/8: Executando testes...');
    exec('npm test');
    
    // 2. Gerar migrations
    console.log('\n📋 Etapa 2/8: Gerando migrations...');
    exec('npm run db:generate');
    
    // 3. Atualizar versão
    console.log('\n📋 Etapa 3/8: Atualizando versão...');
    updateVersion(newVersion);
    
    // 4. Preparar build
    console.log('\n📋 Etapa 4/8: Preparando build...');
    exec('npm run prepare:build');
    
    // 5. Criar instaladores
    console.log('\n📋 Etapa 5/8: Criando instaladores...');
    const platform = process.platform;
    
    if (platform === 'darwin') {
      exec('npm run dist:mac');
    } else if (platform === 'win32') {
      exec('npm run dist:win');
    } else if (platform === 'linux') {
      exec('npm run dist:linux');
    } else {
      exec('npm run dist');
    }
    
    // 6. Commit das alterações
    console.log('\n📋 Etapa 6/8: Commitando alterações...');
    exec('git add package.json');
    exec(`git commit -m "chore(release): bump version to ${newVersion}"`);
    
    // 7. Criar tag
    console.log('\n📋 Etapa 7/8: Criando tag...');
    exec(`git tag -a v${newVersion} -m "Release v${newVersion}"`);
    
    // 8. Instruções finais
    console.log('\n📋 Etapa 8/8: Finalização');
    console.log('\n✅ Release criada com sucesso!');
    console.log('\n📦 Arquivos gerados em: dist/');
    console.log('\n🏷️  Tag criada: v' + newVersion);
    console.log('\n📤 Para publicar, execute:');
    console.log('   git push');
    console.log('   git push --tags');
    
  } catch (error) {
    console.error('\n❌ Erro durante o processo de release');
    console.error(error.message);
    process.exit(1);
  }
};

release();
