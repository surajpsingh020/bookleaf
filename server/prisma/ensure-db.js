const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '../.env');
const exampleEnvPath = path.join(__dirname, '../.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(exampleEnvPath)) {
  fs.copyFileSync(exampleEnvPath, envPath);
  console.log('📋 Automatically copied server/.env.example to server/.env');
}

// Ensure DATABASE_URL is set in environment for Prisma CLI
const env = { ...process.env };
if (!env.DATABASE_URL) {
  env.DATABASE_URL = 'file:./dev.db';
}

console.log('🚀 Pushing Prisma database schema...');
try {
  execSync('npx prisma db push', {
    stdio: 'inherit',
    env,
    cwd: path.join(__dirname, '..')
  });
  console.log('✅ Prisma schema pushed successfully.');
} catch (error) {
  console.error('❌ Failed to push schema:', error);
  process.exit(1);
}
