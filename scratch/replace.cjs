const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  content = content.replace(/glass-card-hover/g, '');
  content = content.replace(/glass-card/g, 'card');
  content = content.replace(/glass-panel/g, 'card');
  content = content.replace(/btn-gradient/g, 'btn-primary');
  
  // Remove background blobs
  content = content.replace(/<div className="bg-blob bg-blob-\d+" \/>\n?\s*/g, '');
  
  // Custom header fix
  content = content.replace(/sticky top-0 z-40 card/g, 'sticky top-0 z-40 bg-[var(--surface-primary)] border-b border-[var(--border-subtle)]');
  
  fs.writeFileSync(filePath, content);
  console.log(`Processed ${filePath}`);
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
