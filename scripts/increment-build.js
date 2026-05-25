#!/usr/bin/env node

// Script to increment the build number
// Usage: node scripts/increment-build.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildConfigPath = path.join(__dirname, '..', 'src', 'lib', 'config', 'build.js');

try {
  // Read the current build.js file
  let content = fs.readFileSync(buildConfigPath, 'utf8');
  
  // Find the current BUILD_NUMBER
  const buildNumberMatch = content.match(/export const BUILD_NUMBER = (\d+);/);
  if (!buildNumberMatch) {
    console.error('Could not find BUILD_NUMBER in build.js');
    process.exit(1);
  }
  
  const currentBuildNumber = parseInt(buildNumberMatch[1]);
  const newBuildNumber = currentBuildNumber + 1;
  
  // Replace the build number
  const newContent = content.replace(
    /export const BUILD_NUMBER = \d+;/,
    `export const BUILD_NUMBER = ${newBuildNumber};`
  );
  
  // Write the updated file
  fs.writeFileSync(buildConfigPath, newContent);
  
  console.log(`✅ Build number incremented from ${currentBuildNumber} to ${newBuildNumber}`);
  console.log(`📦 New version: v1.0.0 (Build ${newBuildNumber})`);
  
} catch (error) {
  console.error('❌ Error incrementing build number:', error.message);
  process.exit(1);
}
