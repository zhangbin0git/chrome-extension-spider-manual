import fs from 'fs';
import path from 'path';

// Default values
let CLI_CEB_DEV = 'false';
let CLI_CEB_FIREFOX = 'false';
const cli_values = [];

// Parse arguments
const args = process.argv.slice(2);
for (const arg of args) {
  const [key, value] = arg.split('=');

  if (!key) continue;

  // Validate key
  if (key.startsWith('#')) continue;

  if (key === 'CLI_CEB_DEV') {
    if (value !== 'true' && value !== 'false') {
      console.error(`Invalid value for <${key}>. Please use 'true' or 'false'.`);
      process.exit(1);
    }
    CLI_CEB_DEV = value;
  } else if (key === 'CLI_CEB_FIREFOX') {
    if (value !== 'true' && value !== 'false') {
      console.error(`Invalid value for <${key}>. Please use 'true' or 'false'.`);
      process.exit(1);
    }
    CLI_CEB_FIREFOX = value;
  } else {
    // Check if it starts with CLI_CEB_
    if (!key.startsWith('CLI_CEB_')) {
      console.error(`Invalid key: <${key}>. All CLI keys must start with 'CLI_CEB_'.`);
      process.exit(1);
    }
    cli_values.push(`${key}=${value}`);
  }
}

const envPath = path.resolve(process.cwd(), '.env');
let existingContent = '';
if (fs.existsSync(envPath)) {
  existingContent = fs.readFileSync(envPath, 'utf-8');
}

const lines = existingContent.split('\n');
const cebLines = [];
for (const line of lines) {
  const trimmedLine = line.trim();
  if (!trimmedLine) continue;
  const key = trimmedLine.split('=')[0];
  if (key.startsWith('CEB_')) {
    cebLines.push(trimmedLine);
  }
}

const newContent = [
  '# THOSE VALUES ARE EDITABLE ONLY VIA CLI',
  `CLI_CEB_DEV=${CLI_CEB_DEV}`,
  `CLI_CEB_FIREFOX=${CLI_CEB_FIREFOX}`,
  ...cli_values,
  '',
  '# THOSE VALUES ARE EDITABLE',
  ...cebLines,
  '', // Add a newline at the end
].join('\n');

fs.writeFileSync(envPath, newContent);
