const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Remove style={{ borderColor: '...' }}
  content = content.replace(/ style=\{\{\s*borderColor:\s*'[^']+'\s*\}\}/g, '');
  // Remove style={{ background: '...', color: '...' }}
  content = content.replace(/ style=\{\{\s*background:\s*'[^']+',\s*color:\s*'[^']+'\s*\}\}/g, '');
  // Remove style={{ background: 'var(--gradient-primary)' }}
  content = content.replace(/ style=\{\{\s*background:\s*'var\(--gradient-primary\)'\s*\}\}/g, '');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated inline styles in ${filePath}`);
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
