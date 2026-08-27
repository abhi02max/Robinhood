import axios from 'axios';

const PISTON_URL = process.env.PISTON_URL || 'http://127.0.0.1:2000/api/v2/execute';
const PISTON_TIMEOUT_MS = Math.max(1000, Math.min(Number(process.env.PISTON_TIMEOUT_MS || 10000), 30000));

const LANGUAGE_MAP = {
  python: { language: 'python', version: '3.10.0', fileName: 'main.py' },
  javascript: { language: 'javascript', version: '18.15.0', fileName: 'main.js' },
  cpp: { language: 'cpp', version: '*', fileName: 'main.cpp' },
  c: { language: 'c', version: '*', fileName: 'main.c' },
  java: { language: 'java', version: '*', fileName: 'Main.java' },
  sql: { language: 'sqlite3', version: '*', fileName: 'main.sql' },
};

export async function runCode({ language, code, stdin }) {
  const requestedLanguage = String(language || '').toLowerCase();
  const langConfig = LANGUAGE_MAP[requestedLanguage];
  if (!langConfig) {
    throw new Error(`Unsupported Piston language "${requestedLanguage}".`);
  }

  const payload = {
    language: langConfig.language,
    version: langConfig.version,
    files: [{ name: langConfig.fileName, content: String(code || '') }],
    stdin: String(stdin || ''),
    args: [],
  };

  const { data } = await axios.post(PISTON_URL, payload, {
    timeout: PISTON_TIMEOUT_MS,
    maxContentLength: 1024 * 1024,
    maxBodyLength: 1024 * 1024,
  });
  return data;
}

export default { runCode };
