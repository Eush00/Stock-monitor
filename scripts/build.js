#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🏗️ Starting build process...');

// Funzione per minificare CSS (basic)
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // Rimuovi commenti
    .replace(/\s+/g, ' ') // Riduci spazi multipli
    .replace(/;\s*}/g, '}') // Rimuovi ; prima di }
    .trim();
}

// Combina tutti i CSS files
function buildCSS() {
  console.log('📦 Building CSS...');

  const cssFiles = [
    'css/style.css',
    'css/components.css',
    'css/responsive.css',
    'css/charts.css',
  ];

  let combinedCSS = '';

  cssFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  - Adding ${file}`);
      combinedCSS += fs.readFileSync(file, 'utf8') + '\n';
    }
  });

  // Minifica e salva
  const minified = minifyCSS(combinedCSS);
  fs.writeFileSync('css/bundle.min.css', minified);

  console.log('✅ CSS build completed');
}

// Valida JavaScript files
function validateJS() {
  console.log('🔍 Validating JavaScript...');

  const jsFiles = ['js/config.js', 'js/supabase-client.js', 'js/app.js'];

  jsFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`  - Validating ${file}`);
      try {
        const content = fs.readFileSync(file, 'utf8');
        // Basic syntax check
        new Function(content);
        console.log(`    ✅ ${file} is valid`);
      } catch (error) {
        console.error(`    ❌ ${file} has errors:`, error.message);
        process.exit(1);
      }
    }
  });

  console.log('✅ JavaScript validation completed');
}

// Crea file di versione
function createVersionFile() {
  const version = {
    version: require('../package.json').version,
    buildDate: new Date().toISOString(),
    buildNumber: process.env.GITHUB_RUN_NUMBER || 'local',
  };

  fs.writeFileSync('version.json', JSON.stringify(version, null, 2));
  console.log('✅ Version file created');
}

// Main build process
try {
  buildCSS();
  validateJS();
  createVersionFile();

  console.log('🎉 Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
