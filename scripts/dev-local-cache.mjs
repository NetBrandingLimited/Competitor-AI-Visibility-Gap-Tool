/**
 * Puts physical `.next` data on local disk (off OneDrive) while keeping `./.next` in the repo:
 * Windows: directory junction; macOS/Linux: symlink. Turbopack requires distDir under the project,
 * so we cannot use NEXT_DIST_DIR outside the tree.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const cacheTarget =
  process.platform === 'win32'
    ? path.join(os.homedir(), 'AppData', 'Local', 'CompetitorAI-next', 'next-cache')
    : path.join(os.homedir(), '.cache', 'competitor-ai-next', 'next-cache');

function normalizeReal(p) {
  return path.normalize(path.resolve(p));
}

function readLinkIfPresent(p) {
  try {
    return fs.readlinkSync(p, 'utf8');
  } catch {
    return null;
  }
}

function ensureDotNextPointsToCache() {
  fs.mkdirSync(cacheTarget, { recursive: true });
  const linkPath = path.join(root, '.next');

  if (fs.existsSync(linkPath)) {
    const existingTarget = readLinkIfPresent(linkPath);
    if (existingTarget !== null) {
      let cur = existingTarget;
      if (!path.isAbsolute(cur)) {
        cur = path.resolve(path.dirname(linkPath), cur);
      }
      if (normalizeReal(cur) === normalizeReal(cacheTarget)) {
        return;
      }
      fs.unlinkSync(linkPath);
    } else {
      const st = fs.lstatSync(linkPath);
      if (st.isDirectory()) {
        const bak = path.join(root, `.next.bak-${Date.now()}`);
        fs.renameSync(linkPath, bak);
        console.warn(
          `[dev:safe] Renamed existing .next → ${path.basename(bak)}. Remove it when you no longer need it.`
        );
      }
    }
  }

  if (process.platform === 'win32') {
    fs.symlinkSync(cacheTarget, linkPath, 'junction');
  } else {
    fs.symlinkSync(cacheTarget, linkPath, 'dir');
  }
}

/**
 * Turbopack emits SSR chunks under `cacheTarget`. `require('react/...')` walks parents of that file;
 * without `cacheTarget/node_modules`, resolution never reaches the real project. Junction/symlink the
 * project's `node_modules` here (same as NODE_PATH intent, but works with Turbopack's loader).
 */
function ensureCacheNodeModulesLink() {
  const projectNm = path.join(root, 'node_modules');
  if (!fs.existsSync(projectNm)) {
    console.error('[dev:safe] Run npm install in the project first.');
    process.exit(1);
  }

  const cacheNm = path.join(cacheTarget, 'node_modules');
  if (fs.existsSync(cacheNm)) {
    const target = readLinkIfPresent(cacheNm);
    if (target !== null) {
      const cur = path.isAbsolute(target) ? target : path.resolve(path.dirname(cacheNm), target);
      if (normalizeReal(cur) === normalizeReal(projectNm)) {
        return;
      }
      fs.unlinkSync(cacheNm);
    } else {
      console.error(
        `[dev:safe] Remove the real directory (not a link): ${cacheNm}\nThen run dev:safe again.`
      );
      process.exit(1);
    }
  }

  try {
    if (process.platform === 'win32') {
      fs.symlinkSync(projectNm, cacheNm, 'junction');
    } else {
      fs.symlinkSync(projectNm, cacheNm, 'dir');
    }
  } catch (first) {
    if (process.platform !== 'win32') {
      console.error('[dev:safe] Could not link node_modules into cache:', first.message);
      process.exit(1);
    }
    try {
      fs.symlinkSync(projectNm, cacheNm, 'dir');
    } catch (second) {
      console.error(
        '[dev:safe] Could not link node_modules into cache (junction and dir symlink failed).',
        second.message
      );
      process.exit(1);
    }
  }
}

ensureDotNextPointsToCache();
ensureCacheNodeModulesLink();

const env = { ...process.env };
const nodeModules = path.join(root, 'node_modules');
env.NODE_PATH = env.NODE_PATH
  ? `${nodeModules}${path.delimiter}${env.NODE_PATH}`
  : nodeModules;

const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextCli, 'dev'], {
  cwd: root,
  stdio: 'inherit',
  env
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 0);
});
