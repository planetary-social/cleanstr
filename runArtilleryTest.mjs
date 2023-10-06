import { execSync } from 'child_process';
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  unlinkSync,
  rmdirSync,
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Get the identity token
const token = execSync('gcloud auth print-identity-token', {
  encoding: 'utf8',
}).trim();

// Read the template file
const template = readFileSync('artillery-config.yaml', 'utf8');

// Replace YOUR_TOKEN_HERE with the actual token
const config = template.replace('GCLOUD_IDENTITY_TOKEN', token);

// Create a temporary directory
const tmpDir = mkdtempSync(join(tmpdir(), 'artillery-'));

// Write the updated config to a temporary config.yml file in the temporary directory
const tmpConfigPath = join(tmpDir, 'config.yml');
writeFileSync(tmpConfigPath, config);

try {
  // Run Artillery with the updated config
  execSync(`artillery run ${tmpConfigPath}`, { stdio: 'inherit' });
} finally {
  // Remove the temporary directory and config file
  unlinkSync(tmpConfigPath);
  rmdirSync(tmpDir);
}
