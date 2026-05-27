#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VALID_TARGETS = new Set(['ios', 'android']);

function readAndroidVersion(rootDir) {
  const file = path.join(rootDir, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(file)) {
    console.warn('Android: build.gradle not found, unable to read versionName');
    return null;
  }

  const txt = fs.readFileSync(file, 'utf8');
  const matches = Array.from(txt.matchAll(/versionName\s+"([^"]+)"/g));
  if (!matches.length) {
    throw new Error('Android: versionName not found in build.gradle');
  }

  const unique = Array.from(new Set(matches.map((match) => match[1].trim())));
  if (unique.length > 1) {
    throw new Error(`Android: inconsistent versionName values: ${unique.join(', ')}`);
  }

  return unique[0];
}

function readIOSVersion(rootDir) {
  const file = path.join(rootDir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(file)) {
    console.warn('iOS: project.pbxproj not found, unable to read MARKETING_VERSION');
    return null;
  }

  const txt = fs.readFileSync(file, 'utf8');
  const matches = Array.from(txt.matchAll(/MARKETING_VERSION = ([^;]+);/g));
  if (!matches.length) {
    throw new Error('iOS: no MARKETING_VERSION entries found');
  }

  const unique = Array.from(new Set(matches.map((match) => match[1].trim())));
  if (unique.length > 1) {
    throw new Error(`iOS: inconsistent MARKETING_VERSION values: ${unique.join(', ')}`);
  }

  return unique[0];
}

function resolveVersion(rootDir, targets) {
  const versions = [];

  if (targets.includes('android')) {
    const androidVersion = readAndroidVersion(rootDir);
    if (androidVersion) versions.push(androidVersion);
  }

  if (targets.includes('ios')) {
    const iosVersion = readIOSVersion(rootDir);
    if (iosVersion) versions.push(iosVersion);
  }

  const unique = Array.from(new Set(versions));
  if (!unique.length) {
    throw new Error('Unable to resolve version for requested targets');
  }

  if (unique.length > 1) {
    throw new Error(`Version mismatch between targets: ${unique.join(' vs ')}`);
  }

  return unique[0];
}

function versionToBaseBuild(version) {
  if (typeof version !== 'string') {
    throw new Error('Version must be a string');
  }

  const parts = version.split('.');
  if (parts.length < 3) {
    throw new Error('Version must follow major.minor.patch');
  }

  const [major, minor, patch] = parts.slice(0, 3).map((part, idx) => {
    const match = String(part).match(/^(\d+)/);
    if (!match) {
      throw new Error(`Invalid ${['major', 'minor', 'patch'][idx]} version component: ${part}`);
    }
    return parseInt(match[1], 10);
  });

  return Number([
    String(major),
    String(minor).padStart(2, '0'),
    String(patch).padStart(2, '0'),
  ].join(''));
}

function resolveNextBuild(current, base) {
  return current >= base ? current + 1 : base;
}

function bumpAndroid(rootDir, baseBuild) {
  const file = path.join(rootDir, 'android', 'app', 'build.gradle');
  if (!fs.existsSync(file)) {
    console.warn('Android: build.gradle not found, no increment applied');
    return null;
  }

  let txt = fs.readFileSync(file, 'utf8');
  const matches = Array.from(txt.matchAll(/versionCode\s+(\d+)/g));
  if (!matches.length) {
    throw new Error('Android: no versionCode entries found');
  }

  const current = Math.max(...matches.map((match) => parseInt(match[1], 10)));
  const next = resolveNextBuild(current, baseBuild);
  txt = txt.replace(/versionCode\s+\d+/g, `versionCode ${next}`);
  fs.writeFileSync(file, txt, 'utf8');
  console.log(`Android: versionCode set to ${next} (was ${current})`);
  return next;
}

function bumpIOS(rootDir, baseBuild) {
  const file = path.join(rootDir, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(file)) {
    console.warn('iOS: project.pbxproj not found, no increment applied');
    return null;
  }

  let txt = fs.readFileSync(file, 'utf8');
  const matches = Array.from(txt.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g));
  if (!matches.length) {
    throw new Error('iOS: no CURRENT_PROJECT_VERSION entries found');
  }

  const current = Math.max(...matches.map((match) => parseInt(match[1], 10)));
  const next = resolveNextBuild(current, baseBuild);
  txt = txt.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${next};`);
  fs.writeFileSync(file, txt, 'utf8');
  console.log(`iOS: CURRENT_PROJECT_VERSION set to ${next} (was ${current})`);
  return next;
}

export function bumpBuild(targetsArg) {
  const rootDir = path.resolve(__dirname, '..');
  const targets = Array.from(new Set(targetsArg.filter((target) => VALID_TARGETS.has(target))));
  if (!targets.length) {
    throw new Error('No valid platform provided for build bump');
  }

  const version = resolveVersion(rootDir, targets);
  const baseBuild = versionToBaseBuild(version);
  console.log(`Base build derived from version ${version}: ${baseBuild}`);

  const result = {};
  for (const target of targets) {
    if (target === 'android') {
      result.android = bumpAndroid(rootDir, baseBuild);
    }
    if (target === 'ios') {
      result.ios = bumpIOS(rootDir, baseBuild);
    }
  }

  return result;
}

function parseCliTargets(argv) {
  const args = argv.slice(2).map((arg) => arg.replace(/^--?/, '').toLowerCase());
  const targets = args.length ? args : ['both'];

  if (targets.includes('both')) {
    return ['android', 'ios'];
  }

  return targets;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    bumpBuild(parseCliTargets(process.argv));
  } catch (err) {
    console.error(`Failed to bump build numbers: ${err.message}`);
    process.exit(1);
  }
}
