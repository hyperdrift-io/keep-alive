const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Function to recursively copy files from source to destination
function copyRecursive(source, destination) {
  // Create the destination directory if it doesn't exist
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read the source directory
  const items = fs.readdirSync(source);

  // Copy each item
  items.forEach(item => {
    const sourcePath = path.join(source, item);
    const destinationPath = path.join(destination, item);

    // Check if it's a directory or a file
    if (fs.statSync(sourcePath).isDirectory()) {
      // If it's a directory, recursively copy it
      copyRecursive(sourcePath, destinationPath);
    } else {
      // If it's a file, copy it
      fs.copyFileSync(sourcePath, destinationPath);
      console.log(`Copied ${sourcePath} to ${destinationPath}`);
    }
  });
}

// Copy the entire public directory to dist
copyRecursive('public', 'dist');

console.log('Build completed successfully!');
