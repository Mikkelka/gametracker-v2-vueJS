const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(process.cwd(), 'src');

const EXCLUDED_DIRS = new Set(['assets']);

const ALLOWED_EXTS = new Set([
  '.js',
  '.ts',
  '.vue',
  '.css',
  '.scss',
  '.html'
]);

function isExcludedDir(dirName) {
  return EXCLUDED_DIRS.has(dirName);
}

function shouldCountFile(filePath) {
  return ALLOWED_EXTS.has(path.extname(filePath));
}

function countNonEmptyLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function walk(dirPath, visitor) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (!isExcludedDir(entry.name)) {
        walk(fullPath, visitor);
      }
    } else if (entry.isFile()) {
      visitor(fullPath);
    }
  }
}

let totalLines = 0;
const totalsByExt = {};
const totalsByDir = {};

walk(ROOT_DIR, (filePath) => {
  if (shouldCountFile(filePath)) {
    const fileLines = countNonEmptyLines(filePath);
    totalLines += fileLines;

    const ext = path.extname(filePath);
    totalsByExt[ext] = (totalsByExt[ext] || 0) + fileLines;

    const relDir = path.relative(ROOT_DIR, path.dirname(filePath));
    const topDir = relDir.split(path.sep)[0] || '.';
    totalsByDir[topDir] = (totalsByDir[topDir] || 0) + fileLines;
  }
});

console.log(
  `![Lines of Code](https://img.shields.io/badge/lines%20of%20code-${totalLines}%20lines-blue)`
);

const sortedExts = Object.entries(totalsByExt).sort((a, b) => b[1] - a[1]);
const sortedDirs = Object.entries(totalsByDir).sort((a, b) => b[1] - a[1]);

console.log('');
console.log('Breakdown by extension:');
sortedExts.forEach(([ext, lines]) => {
  console.log(`${ext}: ${lines}`);
});

console.log('');
console.log('Breakdown by top-level dir:');
sortedDirs.forEach(([dir, lines]) => {
  console.log(`${dir}: ${lines}`);
});
