import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
const exampleEnvPath = path.resolve(process.cwd(), '.example.env');

if (!fs.existsSync(envPath) && fs.existsSync(exampleEnvPath)) {
  fs.copyFileSync(exampleEnvPath, envPath);
  console.log('.example.env has been copied to .env');
}
