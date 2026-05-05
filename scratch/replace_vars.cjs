const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Replace old variables with new OKLCH design system variables
  content = content.replace(/var\(--glass-border\)/g, 'var(--border-subtle)');
  content = content.replace(/var\(--glass-bg\)/g, 'var(--surface-elevated)');
  content = content.replace(/style=\{\{\s*borderColor:\s*'rgba\([^)]+\)'\s*\}\}/g, '');
  content = content.replace(/rgba\(0, 255, 194, 0\.\d+\)/g, 'var(--accent-primary-hover)');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated design tokens in ${filePath}`);
  }
}

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      replaceInFile(fullPath);
    }
  }
}

processDir('./src');
