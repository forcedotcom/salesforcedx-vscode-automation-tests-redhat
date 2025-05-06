import { join } from 'path';
import path from 'path';
import { TestConfig } from './types';
import { EnvironmentSettings } from '../environmentSettings';

/**
 * Normalizes a file path to use forward slashes consistently across platforms
 *
 * @param path - The file path to normalize
 * @returns A path with forward slashes
 */
export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * Creates a default test configuration based on environment settings
 *
 * @param overrides - Optional partial TestConfig to override default values
 * @returns A complete TestConfig object
 */
export function createDefaultTestConfig(overrides?: Partial<TestConfig>): TestConfig {
  const env = EnvironmentSettings.getInstance();

  // Create default config with standard property names
  const defaultConfig: TestConfig = {
    testResources: normalizePath(env.testResources),
    extensionsFolder: normalizePath(env.extensionsFolder),
    codeVersion: env.codeVersion
  };

  // Add vsixToInstallDir if it's defined in environment settings
  if (env.vsixToInstallDir) {
    defaultConfig.vsixToInstallDir = normalizePath(env.vsixToInstallDir);
  }

  // Set deprecated properties for backward compatibility
  defaultConfig.workspacePath = defaultConfig.testResources;
  defaultConfig.extensionsPath = defaultConfig.extensionsFolder;
  defaultConfig.vscodeVersion = defaultConfig.codeVersion;

  // Normalize any path overrides and handle both new and deprecated property names
  if (overrides?.testResources) {
    overrides.testResources = normalizePath(overrides.testResources);
    // Keep workspacePath in sync for backward compatibility
    overrides.workspacePath = overrides.testResources;
  } else if (overrides?.workspacePath) {
    overrides.workspacePath = normalizePath(overrides.workspacePath);
    // Set testResources from workspacePath for forward compatibility
    overrides.testResources = overrides.workspacePath;
  }

  if (overrides?.extensionsFolder) {
    overrides.extensionsFolder = normalizePath(overrides.extensionsFolder);
    // Keep extensionsPath in sync for backward compatibility
    overrides.extensionsPath = overrides.extensionsFolder;
  } else if (overrides?.extensionsPath) {
    overrides.extensionsPath = normalizePath(overrides.extensionsPath);
    // Set extensionsFolder from extensionsPath for forward compatibility
    overrides.extensionsFolder = overrides.extensionsPath;
  }

  if (overrides?.codeVersion) {
    // Keep vscodeVersion in sync for backward compatibility
    overrides.vscodeVersion = overrides.codeVersion;
  } else if (overrides?.vscodeVersion) {
    // Set codeVersion from vscodeVersion for forward compatibility
    overrides.codeVersion = overrides.vscodeVersion;
  }

  // Merge with overrides
  return { ...defaultConfig, ...overrides };
}

/**
 * Ensures that all required paths for testing exist
 *
 * @param config - The test configuration to validate
 */
export function validateTestConfig(config: TestConfig): void {
  // First validate using the standard property names
  if (!config.testResources) {
    if (config.workspacePath) {
      // Use deprecated property if new one is not set
      config.testResources = config.workspacePath;
    } else {
      throw new Error('TestConfig.testResources is required');
    }
  }

  if (!config.extensionsFolder) {
    if (config.extensionsPath) {
      // Use deprecated property if new one is not set
      config.extensionsFolder = config.extensionsPath;
    } else {
      // Default to sibling 'extensions' directory
      const workspaceDir = path.dirname(config.testResources);
      config.extensionsFolder = join(workspaceDir, 'extensions');
    }
  }

  if (!config.codeVersion) {
    if (config.vscodeVersion) {
      // Use deprecated property if new one is not set
      config.codeVersion = config.vscodeVersion;
    } else {
      config.codeVersion = 'stable';
    }
  }

  // Keep deprecated properties in sync for backward compatibility
  config.workspacePath = config.testResources;
  config.extensionsPath = config.extensionsFolder;
  config.vscodeVersion = config.codeVersion;

  // Ensure paths use forward slashes
  config.testResources = normalizePath(config.testResources);
  config.extensionsFolder = normalizePath(config.extensionsFolder);
  config.workspacePath = config.testResources;
  config.extensionsPath = config.extensionsFolder;

  // Normalize vsixToInstallDir if it exists
  if (config.vsixToInstallDir) {
    config.vsixToInstallDir = normalizePath(config.vsixToInstallDir);
  }
}
