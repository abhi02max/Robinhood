// Run this script with: node scripts/create-auth-dirs.mjs
import { mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const basePath = join(__dirname, '..');

const directories = [
    'app/api/auth/[...nextauth]',
    'app/api/auth/signup',
    'app/api/auth/verify-email',
    'app/api/auth/forgot-password',
    'app/api/auth/reset-password',
    'app/(auth)/login',
    'app/(auth)/signup',
    'app/(auth)/verify',
    'app/(auth)/forgot-password',
    'app/(auth)/reset-password',
    'components/auth',
    'components/brand',
    'components/ui',
];

directories.forEach(dir => {
    const fullPath = join(basePath, dir);
    try {
        mkdirSync(fullPath, { recursive: true });
        console.log('Created:', fullPath);
    } catch (err) {
        if (err.code !== 'EEXIST') {
            console.error('Error creating:', fullPath, err.message);
        }
    }
});

console.log('\nDone! Auth directories created.');
