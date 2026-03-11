import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envResult = dotenv.config({ path: path.join(__dirname, '.env'), override: true });
if (envResult.error) throw envResult.error;

await import('./src/server.js');
