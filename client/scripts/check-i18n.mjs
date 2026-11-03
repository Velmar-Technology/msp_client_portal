#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(CLIENT_DIR, 'src', 'locales');
const FEATURES_DIR = path.join(CLIENT_DIR, 'src', 'features');
const SRC_DIR = path.join(CLIENT_DIR, 'src');

/**
 * Recursively extracts all dot-notated keys from a nested JSON object.
 */
function extractKeys(obj, prefix = '') {
  let keys = [];
  for (const k of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    const val = obj[k];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      keys = keys.concat(extractKeys(val, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/**
 * Recursively collects all `locales/<lang>.json` files inside `src/features/`.
 */
function findFeatureLocaleFiles(dir, lang) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'locales') {
        const candidate = path.join(fullPath, `${lang}.json`);
        if (fs.existsSync(candidate)) {
          results.push(candidate);
        }
      } else {
        results = results.concat(findFeatureLocaleFiles(fullPath, lang));
      }
    }
  }
  return results;
}

/**
 * Loads all keys for a locale across root `src/locales/<lang>.json` and
 * colocated `src/features/<domain>/locales/<lang>.json` (ADR-017).
 */
function loadLocaleKeys(lang) {
  const rootPath = path.join(LOCALES_DIR, `${lang}.json`);
  const keys = new Set(extractKeys(JSON.parse(fs.readFileSync(rootPath, 'utf8'))));

  for (const featureLocalePath of findFeatureLocaleFiles(FEATURES_DIR, lang)) {
    const featureData = JSON.parse(fs.readFileSync(featureLocalePath, 'utf8'));
    for (const k of extractKeys(featureData)) {
      keys.add(k);
    }
  }

  return keys;
}

/**
 * Recursively finds all .ts and .tsx source files under a directory.
 */
function findSourceFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.git') {
        results = results.concat(findSourceFiles(fullPath));
      }
    } else if (
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
      !entry.name.endsWith('.d.ts') &&
      !entry.name.endsWith('.test.ts') &&
      !entry.name.endsWith('.test.tsx') &&
      !entry.name.endsWith('.spec.ts') &&
      !entry.name.endsWith('.spec.tsx')
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('🔍 Running i18n Verification Suite...\n');

// 1. Read locale dictionaries (root + colocated feature locales)
const enPath = path.join(LOCALES_DIR, 'en_US.json');
const esPath = path.join(LOCALES_DIR, 'es_DO.json');

if (!fs.existsSync(enPath) || !fs.existsSync(esPath)) {
  console.error('❌ Error: Locale files en_US.json or es_DO.json not found in', LOCALES_DIR);
  process.exit(1);
}

const enKeys = loadLocaleKeys('en_US');
const esKeys = loadLocaleKeys('es_DO');

let hasErrors = false;

// 2. Audit Parity
const missingInEs = [...enKeys].filter((k) => !esKeys.has(k));
const missingInEn = [...esKeys].filter((k) => !enKeys.has(k));

if (missingInEs.length > 0) {
  hasErrors = true;
  console.error(`❌ Parity failure: Missing in es_DO.json (${missingInEs.length} keys):`);
  missingInEs.slice(0, 20).forEach((k) => console.error(`   - ${k}`));
  if (missingInEs.length > 20) console.error(`   ...and ${missingInEs.length - 20} more`);
  console.error('');
}

if (missingInEn.length > 0) {
  hasErrors = true;
  console.error(`❌ Parity failure: Missing in en_US.json (${missingInEn.length} keys):`);
  missingInEn.slice(0, 20).forEach((k) => console.error(`   - ${k}`));
  if (missingInEn.length > 20) console.error(`   ...and ${missingInEn.length - 20} more`);
  console.error('');
}

if (!missingInEs.length && !missingInEn.length) {
  console.log(`✅ 100% Locale Parity Verified (${enKeys.size} keys in en_US and es_DO).`);
}

// 3. Scan Source Files for unmapped t("...") calls (Strict Enforcement)
const sourceFiles = findSourceFiles(SRC_DIR);
const unmappedReferences = [];
const T_CALL_REGEX = /\bt\(\s*["']([a-zA-Z0-9_.-]+)["']/g;

for (const filePath of sourceFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(CLIENT_DIR, filePath).replace(/\\/g, '/');
  const lines = content.split('\n');

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    let match;
    while ((match = T_CALL_REGEX.exec(line)) !== null) {
      const key = match[1];
      if (key.includes('.') && !enKeys.has(key)) {
        unmappedReferences.push({
          file: relPath,
          line: lineNum + 1,
          key,
        });
      }
    }
  }
}

if (unmappedReferences.length > 0) {
  hasErrors = true;
  console.error(`\n❌ Found ${unmappedReferences.length} unmapped t("...") references in code:`);
  unmappedReferences.slice(0, 25).forEach(({ file, line, key }) => {
    console.error(`   ${file}:${line} -> "${key}" does not exist in en_US.json`);
  });
  if (unmappedReferences.length > 25) {
    console.error(`   ...and ${unmappedReferences.length - 25} more.`);
  }
  console.error('');
} else {
  console.log(`✅ Verified ${sourceFiles.length} source files: 0 unmapped t("...") key calls found.`);
}

console.log('----------------------------------------');
if (hasErrors) {
  console.error('❌ i18n Verification Failed! Please resolve the issues above.');
  process.exit(1);
} else {
  console.log('🎉 All i18n checks passed cleanly (0 missing keys, 0 unmapped calls, 100% parity)!');
  process.exit(0);
}
