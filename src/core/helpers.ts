import { join } from 'path';
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

  // Create default config
  const defaultConfig: TestConfig = {
    workspacePath: normalizePath(env.workspacePath),
    extensionsPath: normalizePath(env.extensionPath),
    vscodeVersion: env.vscodeVersion
  };

  // Normalize any path overrides
  if (overrides?.workspacePath) {
    overrides.workspacePath = normalizePath(overrides.workspacePath);
  }
  if (overrides?.extensionsPath) {
    overrides.extensionsPath = normalizePath(overrides.extensionsPath);
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
  if (!config.workspacePath) {
    throw new Error('TestConfig.workspacePath is required');
  }

  if (!config.extensionsPath) {
    // Default to 'extensions' subfolder of workspace path
    config.extensionsPath = join(config.workspacePath, 'extensions');
  }

  if (!config.vscodeVersion) {
    config.vscodeVersion = 'stable';
  }

  // Ensure paths use forward slashes
  config.workspacePath = normalizePath(config.workspacePath);
  config.extensionsPath = normalizePath(config.extensionsPath);
}
