import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function bootstrapDomainSchema(pgPool) {
  const schemas = [
    { file: 'schema-leetcode.sql', label: 'LeetCode Core Learning Data System' },
    { file: 'schema-admin.sql', label: 'Admin Dashboard' },
  ];

  for (const schema of schemas) {
    try {
      const schemaPath = path.join(__dirname, '..', schema.file);
      if (!fs.existsSync(schemaPath)) {
        console.warn(`[Bootstrap] Schema file not found: ${schema.file}, skipping.`);
        continue;
      }
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      console.log(`[Bootstrap] Applying ${schema.label} Schema...`);
      await pgPool.query(schemaSql);
      console.log(`[Bootstrap] ${schema.label} schema applied successfully.`);
    } catch (error) {
      console.error(`[Bootstrap] Failed to apply ${schema.label} schema:`, error.message);
      // Don't throw — allow other schemas to apply
    }
  }
}

