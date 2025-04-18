#!/bin/bash

# Fix CSS and favicon paths
find public/platform -name "*.html" | grep -v platform-comparison.html | xargs sed -i '' 's|href="img/favicon.svg"|href="../img/favicon.svg"|g'
find public/platform -name "*.html" | grep -v platform-comparison.html | xargs sed -i '' 's|<link rel="stylesheet" href="style.css">|<link rel="stylesheet" href="../style.css">|g'

# Fix home link
find public/platform -name "*.html" | grep -v platform-comparison.html | xargs sed -i '' 's|href="index.html"|href="/"|g'

# Fix cold-starts link
find public/platform -name "*.html" | grep -v platform-comparison.html | xargs sed -i '' 's|href="cold-starts.html"|href="/cold-starts.html"|g'

# Fix platform/ prefixes in navigation links
find public/platform -name "*.html" | grep -v platform-comparison.html | xargs sed -i '' 's|href="platform/|href="|g'
