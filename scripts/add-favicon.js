const fs = require('fs');
const path = require('path');

// Function to recursively get all HTML files in a directory
function getHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Get all HTML files in the public directory
const htmlFiles = getHtmlFiles('./public');

// Add favicon link to each HTML file
htmlFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Check if favicon link already exists
  if (!content.includes('favicon.svg')) {
    // Add favicon link after the opening head tag
    content = content.replace('<head>', '<head>\n  <link rel="icon" href="img/favicon.svg" type="image/svg+xml">');

    // Write the updated content back to the file
    fs.writeFileSync(filePath, content);
    console.log(`Added favicon to ${filePath}`);
  } else {
    console.log(`Favicon already exists in ${filePath}`);
  }
});

console.log('Favicon added to all HTML files!');
