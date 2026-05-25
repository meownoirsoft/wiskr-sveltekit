#!/bin/bash

# Script to update local Google Fonts
echo "🚀 Updating local Google Fonts..."

# Run the download script
node scripts/download-fonts.js

# Check if fonts were downloaded successfully
if [ -d "static/fonts" ] && [ -d "src/lib/fonts" ]; then
    echo "✅ Fonts updated successfully!"
    echo "📁 Font files: static/fonts/"
    echo "📁 CSS files: src/lib/fonts/"
    echo ""
    echo "💡 Benefits:"
    echo "  • Faster page load (no external font requests)"
    echo "  • Better privacy (no Google tracking)"
    echo "  • Offline functionality"
    echo "  • Reduced render blocking"
else
    echo "❌ Font update failed!"
    exit 1
fi
