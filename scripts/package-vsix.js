'use strict';

const fsSync = require('fs');
const fs = fsSync.promises;
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const stageDir = path.join(distDir, 'vsix-stage');
const stageNodeModulesDir = path.join(stageDir, 'node_modules');

const staticEntries = [
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
  'package.json',
  'language-configuration.json',
  'assets',
  'snippets',
  'syntaxes',
  path.join('src', 'webview'),
];

async function main() {
  const stageOnly = process.argv.includes('--stage-only');
  const pkg = JSON.parse(await fs.readFile(path.join(rootDir, 'package.json'), 'utf8'));
  const outVsix = path.join(rootDir, `${pkg.name}-${pkg.version}.vsix`);

  await fs.rm(stageDir, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  });
  await fs.mkdir(stageNodeModulesDir, { recursive: true });

  await buildExtensionBundle();
  await copyStaticEntries();
  await copyProductionDependencies();
  await normalizeStagePackageJson();
  if (stageOnly) return;
  packageVsix(outVsix);
}

async function buildExtensionBundle() {
  await esbuild.build({
    entryPoints: [path.join(rootDir, 'extension.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    outfile: path.join(stageDir, 'extension.js'),
    external: ['vscode'],
    logLevel: 'info',
  });
}

async function copyStaticEntries() {
  for (const entry of staticEntries) {
    const source = path.join(rootDir, entry);
    const destination = path.join(stageDir, entry);
    const stat = await fs.stat(source);
    await fs.mkdir(path.dirname(destination), { recursive: true });

    if (stat.isDirectory()) {
      await fs.cp(source, destination, { recursive: true });
    } else {
      await fs.copyFile(source, destination);
    }
  }
}

function getProductionPackageDirs() {
  const output = execSync('npm ls --omit=dev --all --parseable', {
    cwd: rootDir,
    encoding: 'utf8',
  });

  const nodeModulesRoot = path.join(rootDir, 'node_modules') + path.sep;
  const topLevelPackages = new Set();

  for (const line of output.split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    if (!line.startsWith(nodeModulesRoot)) continue;
    const relative = path.relative(path.join(rootDir, 'node_modules'), line);
    if (!relative || relative.startsWith('..')) continue;

    const segments = relative.split(path.sep);
    const topLevel =
      segments[0].startsWith('@') && segments.length > 1
        ? path.join(segments[0], segments[1])
        : segments[0];

    topLevelPackages.add(topLevel);
  }

  return [...topLevelPackages].sort();
}

async function copyProductionDependencies() {
  for (const packageDir of getProductionPackageDirs()) {
    const source = path.join(rootDir, 'node_modules', packageDir);
    const destination = path.join(stageNodeModulesDir, packageDir);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.cp(source, destination, { recursive: true });
  }
}

async function normalizeStagePackageJson() {
  const packageJsonPath = path.join(stageDir, 'package.json');
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));

  pkg.main = './extension.js';
  pkg.files = [
    'extension.js',
    'assets/**',
    'snippets/**',
    'src/webview/**',
    'syntaxes/**',
    'language-configuration.json',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
  ];

  await fs.writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

function packageVsix(outVsix) {
  const stagedVsixName = path.basename(outVsix);
  const stagedVsixPath = path.join(stageDir, stagedVsixName);

  if (fsSync.existsSync(stagedVsixPath)) {
    fsSync.rmSync(stagedVsixPath, { force: true });
  }

  execSync(`npx vsce package --no-dependencies --out ${stagedVsixName}`, {
    cwd: stageDir,
    stdio: 'inherit',
  });

  if (!fsSync.existsSync(stagedVsixPath)) {
    throw new Error(`VSIX was not created at ${stagedVsixPath}`);
  }

  if (fsSync.existsSync(outVsix)) {
    fsSync.rmSync(outVsix, { force: true });
  }

  fsSync.renameSync(stagedVsixPath, outVsix);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
