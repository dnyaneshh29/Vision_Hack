// Run this with Node.js to generate PNG icons from SVG
// node create_icons.js
// Or just use any 16x16, 48x48, 128x128 PNG files named icon16.png, icon48.png, icon128.png

const fs = require('fs')

// Minimal 1x1 purple PNG (base64) as placeholder
// Replace with real icons for production
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

// For a real icon, use a proper image editor or canvas
// These are placeholder files so the extension loads without errors
fs.writeFileSync('icon16.png', png1x1)
fs.writeFileSync('icon48.png', png1x1)
fs.writeFileSync('icon128.png', png1x1)
console.log('Placeholder icons created. Replace with real 16x16, 48x48, 128x128 PNG files.')
