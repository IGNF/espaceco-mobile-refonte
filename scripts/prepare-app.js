#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const selectionFile = path.join(root, 'scripts', '.selected-app');

/**
 * Lit le fichier contenant le nom de l'app sélectionnée et le retourne.
 * @returns {string} le nom de l'app sélectionnée
 */
function readSelection() {
  try {
    const val = fs.readFileSync(selectionFile, 'utf8').trim();
    if (val === 'EspaceCo' || val === 'NaviForest') return val;
  } catch (err) {
    console.warn(`- Warning: unable to read selection file: ${err}`);
  }

  console.warn('No app selected, using default: EspaceCo');
  return 'EspaceCo';
}

/**
 * Charge la configuration de l'app sélectionnée à partir du fichier config.js.
 * Le projet étant en ESM, on importe directement le module au lieu de parser le fichier à la main.
 * @param {string} selectedName le nom de l'app sélectionnée
 * @returns {Promise<Object>} la configuration de l'app sélectionnée
 */
async function loadAppConfig(selectedName) {
  const cfgPath = path.join(root, 'scripts', selectedName, 'config.js');
  const moduleUrl = `${pathToFileURL(cfgPath).href}?mtime=${fs.statSync(cfgPath).mtimeMs}`; // Ajout d'un timestamp pour éviter les caches
  const configModule = await import(moduleUrl);

  if (!configModule.default) {
    throw new Error(`No default export found in ${path.relative(root, cfgPath)}`);
  }

  return configModule.default;
}

function copyFileIfExists(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.warn(`- Missing ${label}: ${path.relative(root, src)}`);
    return false;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`- Updated ${path.relative(root, dest)} from ${path.relative(root, src)}`);
  return true;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toTsString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function toTsValue(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function setTsObjectStringProperty(text, propertyName, value) {
  const replacement = `${propertyName}: ${toTsString(value)}`;
  const propertyPattern = new RegExp(`(${propertyName}\\s*:\\s*)['"\`][^'"\`]*['"\`]`);

  if (propertyPattern.test(text)) {
    return text.replace(propertyPattern, replacement);
  }

  return text.replace(/const\s+config(?:\s*:\s*[^{=]+)?\s*=\s*{/, (match) => `${match}\n  ${replacement},`);
}

function readTsObjectStringProperty(text, propertyName) {
  const match = text.match(new RegExp(`${propertyName}\\s*:\\s*['"\`]([^'"\`]*)['"\`]`));
  return match ? match[1] : null;
}

function setNestedTsObjectStringProperty(text, objectName, propertyName, value) {
  const objectPattern = new RegExp(`(${objectName}\\s*:\\s*{)([\\s\\S]*?)(\\n\\s*},)`);
  const objectMatch = text.match(objectPattern);

  if (objectMatch) {
    const [, opening, body, closing] = objectMatch;
    const propertyPattern = new RegExp(`(${propertyName}\\s*:\\s*)['"\`][^'"\`]*['"\`]`);
    const updatedBody = propertyPattern.test(body)
      ? body.replace(propertyPattern, `${propertyName}: ${toTsString(value)}`)
      : `${body}\n    ${propertyName}: ${toTsString(value)},`;

    return text.replace(objectPattern, `${opening}${updatedBody}${closing}`);
  }

  return text.replace(
    /const\s+config(?:\s*:\s*[^{=]+)?\s*=\s*{/,
    (match) => `${match}\n  ${objectName}: {\n    ${propertyName}: ${toTsString(value)},\n  },`,
  );
}

// Met à jour la configuration de Capacitor avec le nom de l'app sélectionnée et les identifiants natifs.
// Le nouveau projet utilise capacitor.config.ts et peut avoir des appId différents entre iOS et Android.
function updateCapacitorConfig(displayName, iosBundleId, androidPackage) {
  const capConfigPath = path.join(root, 'capacitor.config.ts');
  if (!fs.existsSync(capConfigPath)) {
    console.warn('- Warning: capacitor.config.ts not found');
    return;
  }

  let text = fs.readFileSync(capConfigPath, 'utf8');

  if (displayName) {
    text = setTsObjectStringProperty(text, 'appName', displayName);
  }

  if (iosBundleId) {
    text = setTsObjectStringProperty(text, 'appId', iosBundleId);
    text = setNestedTsObjectStringProperty(text, 'ios', 'appId', iosBundleId);
  }

  if (androidPackage) {
    text = setNestedTsObjectStringProperty(text, 'android', 'appId', androidPackage);
  }

  fs.writeFileSync(capConfigPath, text, 'utf8');
  console.log(
    `- Updated capacitor.config.ts (appId=${readTsObjectStringProperty(text, 'appId') || '(unset)'}, appName=${displayName || '(unchanged)'})`,
  );
}

// Génère la configuration runtime de la variante d'app.
// guichetID permet notamment à NaviForest de forcer un guichet et de désactiver le changement de groupe.
function writeAppVariantConfig(selected, appCfg, displayName) {
  const fixedCommunityId = appCfg.guichetID === undefined || appCfg.guichetID === null
    ? undefined
    : Number(appCfg.guichetID);
  const hasFixedCommunityId = Number.isFinite(fixedCommunityId);
  const appVariantPath = path.join(root, 'src', 'shared', 'config', 'appVariant.ts');
  const noAccessTitle = hasFixedCommunityId ? `Accès ${displayName}` : 'Aucun groupe';
  const noAccessMessage = hasFixedCommunityId
    ? `Votre compte ne permet pas d'accéder au guichet ${displayName}.`
    : "Vous n'êtes membre d'aucun groupe. Rejoignez un groupe depuis l'Espace collaboratif pour commencer à contribuer.";
  const content = `export interface AppVariantConfig {
  name: string;
  displayName: string;
  fixedCommunityId?: number;
  canSwitchCommunity: boolean;
  noAccessTitle: string;
  noAccessMessage: string;
}

export const appVariant: AppVariantConfig = {
  name: ${toTsValue(appCfg.name || selected)},
  displayName: ${toTsValue(displayName)},
  fixedCommunityId: ${hasFixedCommunityId ? fixedCommunityId : 'undefined'},
  canSwitchCommunity: ${!hasFixedCommunityId},
  noAccessTitle: ${toTsValue(noAccessTitle)},
  noAccessMessage: ${toTsValue(noAccessMessage)},
};
`;

  fs.mkdirSync(path.dirname(appVariantPath), { recursive: true });
  fs.writeFileSync(appVariantPath, content, 'utf8');
  console.log(`- Updated ${path.relative(root, appVariantPath)}`);
}

// Génère les assets natifs à partir des fichiers copiés dans resources/.
function generateNativeAssets() {
  execFileSync('npx', ['@capacitor/assets', 'generate', '--android'], { cwd: root, stdio: 'inherit', shell: true });
  execFileSync('npx', ['@capacitor/assets', 'generate', '--ios'], { cwd: root, stdio: 'inherit', shell: true });
}

// Applique les identifiants et les noms directement dans les projets natifs.
function updateNativeProjects(displayName, iosBundleId, androidPackage) {
  // iOS: met à jour PRODUCT_BUNDLE_IDENTIFIER et le nom affiché.
  if (iosBundleId) {
    const pbxproj = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
    if (fs.existsSync(pbxproj)) {
      let txt = fs.readFileSync(pbxproj, 'utf8');
      txt = txt.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${iosBundleId};`);
      fs.writeFileSync(pbxproj, txt, 'utf8');
      console.log(`- iOS: PRODUCT_BUNDLE_IDENTIFIER=${iosBundleId}`);
    }
  }

  const iosInfo = path.join(root, 'ios', 'App', 'App', 'Info.plist');
  if (fs.existsSync(iosInfo) && displayName) {
    let txt = fs.readFileSync(iosInfo, 'utf8');
    txt = txt.replace(
      /<key>CFBundleDisplayName<\/key>\s*<string>[^<]*<\/string>/,
      `<key>CFBundleDisplayName</key>\n    <string>${escapeXml(displayName)}</string>`,
    );
    fs.writeFileSync(iosInfo, txt, 'utf8');
    console.log(`- iOS: CFBundleDisplayName=${displayName}`);
  }

  if (!androidPackage) return;

  // Android: met à jour applicationId, namespace et app_name strings.
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(gradle)) {
    let txt = fs.readFileSync(gradle, 'utf8');
    txt = txt.replace(/applicationId\s+["'][^"']+["']/g, `applicationId "${androidPackage}"`);
    txt = txt.replace(/namespace\s*=\s*["'][^"']+["']/g, `namespace = "${androidPackage}"`);
    txt = txt.replace(/namespace\s+["'][^"']+["']/g, `namespace "${androidPackage}"`);
    fs.writeFileSync(gradle, txt, 'utf8');
    console.log(`- Android: applicationId/namespace=${androidPackage}`);
  }

  const manifest = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifest)) {
    let txt = fs.readFileSync(manifest, 'utf8');
    // Conserve le placeholder Gradle pour que l'autorité suive automatiquement applicationId.
    txt = txt.replace(/android:authorities="[^"]+\.fileprovider"/, 'android:authorities="${applicationId}.fileprovider"');
    fs.writeFileSync(manifest, txt, 'utf8');
    console.log('- Android: FileProvider authority uses ${applicationId}.fileprovider');
  }

  const stringsXml = path.join(root, 'android', 'app', 'src', 'main', 'res', 'values', 'strings.xml');
  if (fs.existsSync(stringsXml)) {
    let txt = fs.readFileSync(stringsXml, 'utf8');
    if (displayName) {
      const escapedName = escapeXml(displayName);
      txt = txt.replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">${escapedName}</string>`);
      txt = txt.replace(/<string name="title_activity_main">[^<]*<\/string>/, `<string name="title_activity_main">${escapedName}</string>`);
    }
    txt = txt.replace(/<string name="package_name">[^<]*<\/string>/, `<string name="package_name">${androidPackage}</string>`);
    txt = txt.replace(/<string name="custom_url_scheme">[^<]*<\/string>/, `<string name="custom_url_scheme">${androidPackage}</string>`);
    fs.writeFileSync(stringsXml, txt, 'utf8');
    console.log('- Android: Updated strings.xml');
  }
}

function findMainActivity(javaBase) {
  if (!fs.existsSync(javaBase)) return null;

  const entries = fs.readdirSync(javaBase, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(javaBase, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(fullPath);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java') {
      return fullPath;
    }
  }

  return null;
}

function removeEmptyParentDirs(startDir, stopDir) {
  let dirToClean = startDir;
  while (dirToClean !== stopDir && dirToClean.startsWith(stopDir)) {
    const remaining = fs.readdirSync(dirToClean);
    if (remaining.length) break;

    fs.rmdirSync(dirToClean);
    dirToClean = path.dirname(dirToClean);
  }
}

// Renomme le répertoire de l'activité principale Android pour correspondre au package.
function updateAndroidActivityPackage(androidPackage) {
  if (!androidPackage) return;

  const javaBase = path.join(root, 'android', 'app', 'src', 'main', 'java');
  const newPkgPath = androidPackage.replace(/\./g, path.sep);
  const newActivityDir = path.join(javaBase, newPkgPath);
  const newActivityFile = path.join(newActivityDir, 'MainActivity.java');
  const existingActivityFile = findMainActivity(javaBase);

  if (!existingActivityFile) {
    console.warn('- Android: MainActivity.java not found, skipping activity package update');
    return;
  }

  const existingDir = path.dirname(existingActivityFile);
  const content = fs.readFileSync(existingActivityFile, 'utf8');
  const updatedContent = content.replace(/^package\s+[^;]+;/m, `package ${androidPackage};`);

  if (existingDir === newActivityDir) {
    if (content !== updatedContent) {
      fs.writeFileSync(existingActivityFile, updatedContent, 'utf8');
      console.log('- Android: Updated package declaration in MainActivity.java');
    }
    return;
  }

  fs.mkdirSync(newActivityDir, { recursive: true });
  fs.writeFileSync(newActivityFile, updatedContent, 'utf8');
  fs.unlinkSync(existingActivityFile);
  removeEmptyParentDirs(existingDir, javaBase);
  console.log(`- Android: Moved MainActivity.java to ${path.relative(root, newActivityFile)}`);
}

// Synchronise la version de l'app à partir de la configuration, sans incrémenter les numéros de build.
function syncVersions(version) {
  if (!version) {
    throw new Error('No versionNumber defined in app config');
  }

  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(gradle)) {
    let txt = fs.readFileSync(gradle, 'utf8');
    txt = txt.replace(/versionName\s+"[^"]+"/g, `versionName "${version}"`);
    fs.writeFileSync(gradle, txt, 'utf8');
    console.log(`- Android: versionName=${version} (build number unchanged)`);
  }

  const pbxproj = path.join(root, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
  if (fs.existsSync(pbxproj)) {
    let txt = fs.readFileSync(pbxproj, 'utf8');
    txt = txt.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
    fs.writeFileSync(pbxproj, txt, 'utf8');
    console.log(`- iOS: MARKETING_VERSION=${version} (build number unchanged)`);
  }
}

const selected = readSelection();
console.log(`Preparing app for: ${selected}`);

const appCfg = await loadAppConfig(selected);
const displayName = appCfg.displayName || appCfg.appli || selected;
const iosBundleId = appCfg.ios?.bundleId ? String(appCfg.ios.bundleId) : undefined;
const androidPackage = appCfg.android?.packageName ? String(appCfg.android.packageName) : undefined;
const version = String(appCfg.versionNumber || '').trim();
const appSourceDir = path.join(root, 'scripts', selected);

// 1) Copie le logo de l'app sélectionnée dans le répertoire src/assets/img.
copyFileIfExists(
  path.join(appSourceDir, 'logo.png'),
  path.join(root, 'src', 'assets', 'img', 'logo.png'),
  'app logo',
);

// 2) Génère la configuration runtime utilisée par le code React.
writeAppVariantConfig(selected, appCfg, displayName);

// 3) Met à jour capacitor.config.ts avec le nom et les identifiants de l'app sélectionnée.
updateCapacitorConfig(displayName, iosBundleId, androidPackage);

// 4) Prépare les entrées pour @capacitor/assets.
const resourcesDir = path.join(root, 'resources');
const originDir = path.join(appSourceDir, 'assets');

// Définit les images (icon, splash, android-background, android-foreground) à utiliser pour la génération des assets natifs.
copyFileIfExists(path.join(originDir, 'icon.png'), path.join(resourcesDir, 'icon.png'), 'app icon');
copyFileIfExists(path.join(originDir, 'splash.png'), path.join(resourcesDir, 'splash.png'), 'splash');
copyFileIfExists(path.join(originDir, 'splash-dark.png'), path.join(resourcesDir, 'splash-dark.png'), 'dark splash');
copyFileIfExists(
  path.join(originDir, 'android', 'icon-background.png'),
  path.join(resourcesDir, 'android', 'icon-background.png'),
  'Android icon background',
);
copyFileIfExists(
  path.join(originDir, 'android', 'icon-foreground.png'),
  path.join(resourcesDir, 'android', 'icon-foreground.png'),
  'Android icon foreground',
);
generateNativeAssets();

// 5) Applique les identifiants et les noms directement dans les projets natifs pour assurer la correction.
try {
  updateNativeProjects(displayName, iosBundleId, androidPackage);
} catch (err) {
  console.warn(`- Warning: unable to fully update native project files: ${err.message}`);
}

// 6) Renomme le package de l'activité principale Android pour suivre applicationId.
try {
  updateAndroidActivityPackage(androidPackage);
} catch (err) {
  console.warn(`- Warning: unable to update Android activity package: ${err.message}`);
}

// 7) Synchronise la version de l'app sans incrémenter les numéros de build.
try {
  syncVersions(version);
} catch (err) {
  console.warn(`- Warning: unable to sync versions/build numbers: ${err.message}`);
}

console.log('Preparation complete.');
