#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fonts to download
const fonts = [
  {
    name: 'Inter',
    weights: [300, 400, 500, 600, 700],
    styles: ['normal']
  },
  {
    name: 'JetBrains+Mono',
    weights: [400, 500, 600],
    styles: ['normal', 'italic']
  },
  {
    name: 'Crimson+Text',
    weights: [400, 600, 700],
    styles: ['normal', 'italic']
  },
  {
    name: 'Cinzel+Decorative',
    weights: [400, 700, 900],
    styles: ['normal']
  },
  {
    name: 'Merriweather',
    weights: [300, 400, 700, 900],
    styles: ['normal', 'italic']
  },
  {
    name: 'Lora',
    weights: [400, 500, 600, 700],
    styles: ['normal', 'italic']
  },
  {
    name: 'Spectral',
    weights: [200, 300, 400, 500, 600, 700, 800],
    styles: ['normal', 'italic']
  },
  {
    name: 'IBM+Plex+Sans',
    weights: [100, 200, 300, 400, 500, 600, 700],
    styles: ['normal', 'italic']
  }
];

const staticDir = path.join(__dirname, '..', 'static', 'fonts');
const cssDir = path.join(__dirname, '..', 'src', 'lib', 'fonts');

// Create directories
if (!fs.existsSync(staticDir)) {
  fs.mkdirSync(staticDir, { recursive: true });
}
if (!fs.existsSync(cssDir)) {
  fs.mkdirSync(cssDir, { recursive: true });
}

async function downloadFont(font) {
  console.log(`📥 Downloading ${font.name}...`);
  
  const fontDir = path.join(staticDir, font.name.replace(/\+/g, '-').toLowerCase());
  if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
  }

  const cssRules = [];
  
  for (const weight of font.weights) {
    for (const style of font.styles) {
      const italic = style === 'italic' ? 'ital,' : '';
      const fontUrl = `https://fonts.googleapis.com/css2?family=${font.name}:wght@${weight}${italic ? `&ital@1` : ''}&display=swap`;
      
      try {
        console.log(`  📄 Fetching CSS for ${font.name} ${weight} ${style}...`);
        const response = await fetch(fontUrl);
        const css = await response.text();
        
        // Extract font URLs from CSS
        const fontUrlMatches = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g);
        if (fontUrlMatches) {
          for (const urlMatch of fontUrlMatches) {
            const fontUrl = urlMatch.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)[1];
            const fileName = path.basename(fontUrl.split('?')[0]);
            const localPath = path.join(fontDir, fileName);
            
            if (!fs.existsSync(localPath)) {
              console.log(`    💾 Downloading ${fileName}...`);
              const fontResponse = await fetch(fontUrl);
              const fontBuffer = await fontResponse.arrayBuffer();
              fs.writeFileSync(localPath, Buffer.from(fontBuffer));
            }
            
            // Update CSS to use local path
            const localUrl = `/fonts/${font.name.replace(/\+/g, '-').toLowerCase()}/${fileName}`;
            cssRules.push(css.replace(fontUrl, localUrl));
          }
        }
      } catch (error) {
        console.error(`❌ Error downloading ${font.name} ${weight} ${style}:`, error.message);
      }
    }
  }
  
  // Write combined CSS for this font
  if (cssRules.length > 0) {
    const combinedCss = cssRules.join('\n');
    const cssFileName = `${font.name.replace(/\+/g, '-').toLowerCase()}.css`;
    const cssPath = path.join(cssDir, cssFileName);
    fs.writeFileSync(cssPath, combinedCss);
    console.log(`✅ Created ${cssFileName}`);
  }
}

async function main() {
  console.log('🚀 Starting font download process...');
  
  for (const font of fonts) {
    await downloadFont(font);
  }
  
  console.log('🎉 Font download complete!');
  console.log(`📁 Fonts saved to: ${staticDir}`);
  console.log(`📁 CSS files saved to: ${cssDir}`);
}

main().catch(console.error);
