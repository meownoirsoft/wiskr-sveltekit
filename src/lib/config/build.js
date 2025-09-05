// Build configuration and version info
// This file tracks the current build number and version

export const VERSION = '1.0.0';
export const BUILD_NUMBER = 2; // Increment this with each build

// Get formatted version string
export function getVersionString() {
  return `v${VERSION} (Build ${BUILD_NUMBER})`;
}

// Get build info for display
export function getBuildInfo() {
  return {
    version: VERSION,
    buildNumber: BUILD_NUMBER,
    versionString: getVersionString()
  };
}
