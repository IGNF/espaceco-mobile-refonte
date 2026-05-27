#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const appNames = {
  espaceco: 'EspaceCo',
  naviforest: 'NaviForest',
};

function parseArg(argv) {
  // Acceptés: --naviforest, --espaceco, naviforest, espaceco
  const raw = argv.slice(2).find(Boolean) || '';
  const cleaned = raw.replace(/^--?/, '').toLowerCase();
  return appNames[cleaned] || null;
}

const selected = parseArg(process.argv);
if (!selected) {
  console.error('Usage: npm run selectapp -- --naviforest | --espaceco');
  process.exit(1);
}

// Stockage de la sélection dans scripts/.selected-app
const outFile = path.resolve(__dirname, '.selected-app');
fs.writeFileSync(outFile, `${selected}\n`, 'utf8');
console.log(`Successfully set selected app to: ${selected}`);
