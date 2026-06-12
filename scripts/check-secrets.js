#!/usr/bin/env node
/**
 * Pre-push secret scanner for public-release repo.
 * Exit 1 if likely secrets are found in tracked paths.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'artifacts', 'cache', 'dist', 'venv', '.venv']);
const SKIP_FILES = new Set(['check-secrets.js', 'SECURITY.md', '.env.example', '.env.production.example']);

const PATTERNS = [
  { name: 'private key (64 hex)', re: /0x[a-fA-F0-9]{64}/ },
  { name: 'AGENT_*_PRIVATE_KEY assignment', re: /AGENT_[A-Z0-9_]*PRIVATE_KEY\s*=\s*0x[a-fA-F0-9]{64}/ },
  { name: 'DEPLOYER_PRIVATE_KEY assignment', re: /DEPLOYER_PRIVATE_KEY\s*=\s*0x[a-fA-F0-9]{64}/ },
  { name: 'mnemonic phrase marker', re: /\b(mnemonic|seed phrase)\s*[:=]\s*['"]\w+/i },
];

const hits = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.env') && entry.name !== '.env.example' && !entry.name.endsWith('.example')) {
      hits.push({ file: path.join(dir, entry.name), pattern: 'env file (should be gitignored)' });
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full);
      continue;
    }
    if (SKIP_FILES.has(entry.name)) continue;
    if (full.endsWith('.db') || full.endsWith('.pem') || full.endsWith('.key')) {
      hits.push({ file: full, pattern: 'sensitive file extension' });
      continue;
    }
    const ext = path.extname(entry.name);
    if (!['.js', '.ts', '.tsx', '.py', '.json', '.md', '.sol', '.env', '.example', '.ps1', '.yml'].includes(ext)) {
      continue;
    }
    const rel = full.replace(ROOT + path.sep, '').replace(/\\/g, '/');
    if (rel.includes('protocol/contracts/mocks/') || rel.includes('hardhat.config')) {
      continue;
    }
    if (rel.includes('web3-config.ts') || rel.includes('PRICE_FEEDS')) {
      continue;
    }
    // verify page contains example tx hashes for judges — not private keys
    if (rel.includes('verify/page.tsx')) {
      continue;
    }
    let text;
    try {
      text = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }
    for (const { name, re } of PATTERNS) {
      if (re.test(text)) {
        // Allow placeholder zeros in config defaults
        if (name.includes('private key') && /0x0{64}/.test(text.match(re)?.[0] || '')) continue;
        if (text.includes('your_testnet_private_key_here')) continue;
        if (text.includes('0x' + '0'.repeat(64))) continue;
        hits.push({ file: full.replace(ROOT + path.sep, ''), pattern: name });
      }
    }
  }
}

walk(ROOT);

if (hits.length) {
  console.error('❌ Possible secrets detected — fix before pushing to GitHub:\n');
  for (const h of hits) {
    console.error(`  • ${h.file}  (${h.pattern})`);
  }
  console.error('\nRun: git status  and ensure .env / *.db are not staged.');
  process.exit(1);
}

console.log('✅ No obvious secrets found in public-release tree.');
