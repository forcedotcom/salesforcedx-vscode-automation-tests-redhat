/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Type representing the available Salesforce org editions
 */
export type OrgEdition = 'developer' | 'enterprise';

/**
 * Results from running a Salesforce CLI command
 */
export type SfCommandRunResults = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

/**
 * Enumeration of project shape options for test configuration
 */
export enum ProjectShapeOption {
  /** No project needed */
  NONE,
  /** Any project is acceptable */
  ANY,
  /** A new project should be created */
  NEW,
  /** Tests will run on a well-known test project once wdio is initialized */
  NAMED
}

/**
 * Configuration for a project used in tests
 */
export type ProjectConfig = {
  /** The shape of the test project that the test runs on */
  projectShape: ProjectShapeOption;
  /** The local path to the project if the project shape is any or named */
  folderPath?: string;
  /** The url of the github repo, only exists when project shape is named */
  githubRepoUrl?: string;
};

/**
 * Extension installation options for test configuration
 */
export type ExtensionInstallOption = 'always' | 'never' | 'optional';

/**
 * Configuration for a specific extension in tests
 */
export type ExtensionConfig = {
  /** Extension identifier - can be any valid VS Code extension ID */
  extensionId: string;
  /** Whether to install the extension */
  shouldInstall: ExtensionInstallOption;
  /** Whether to verify the extension is activated */
  shouldVerifyActivation: boolean;
  /** Custom VSIX path for the extension if needed */
  vsixPath?: string;
  /** Optional display name for the extension */
  name?: string;
};

/**
 * Configuration for test requirements
 */
export type TestReqConfig = {
  /** The project shape and the local path to the project */
  projectConfig: ProjectConfig;
  /** If org is required for the test. If not, do not need to create and log into the scratch org */
  isOrgRequired: boolean;
  /** The edition of the scratch org to be created, only specified when isOrgRequired is true */
  scratchOrgEdition?: OrgEdition;
  /**
   * Configuration for extensions to use in the test.
   * Options:
   * - undefined: use all default extensions with default configuration
   * - Array of extension configs: override configuration for specific extensions
   * - Empty array: don't configure any extensions
   */
  extensionConfigs?: ExtensionConfig[];
  /**
   * The extensions that should not be installed or verified.
   * @deprecated Use extensionConfigs instead for more granular control
   */
  excludedExtensions?: string[];
  /** The test suite suffix name */
  testSuiteSuffixName: string;
};

/**
 * Configuration options for the test environment
 */
export interface TestConfig {
  /**
   * Path to the workspace directory where VS Code and test artifacts are stored
   * @deprecated Use testResources instead
   */
  workspacePath?: string;

  /**
   * Path to the test resources directory (standard vscode-extension-tester name)
   */
  testResources: string;

  /**
   * Path to extensions directory
   * @deprecated Use extensionsFolder instead
   */
  extensionsPath?: string;

  /**
   * Path to the extensions folder (standard vscode-extension-tester name)
   */
  extensionsFolder: string;

  /**
   * Path to directory containing VSIX files to install
   */
  vsixToInstallDir?: string;

  /**
   * VS Code version to use for testing
   * @deprecated Use codeVersion instead
   */
  vscodeVersion?: string;

  /**
   * VS Code version to use for testing (standard vscode-extension-tester name)
   */
  codeVersion: string;
}

/**
 * Extension information returned by VS Code APIs
 */
export type Extension = {
  id: string;
  extensionPath: string;
  isActive: boolean;
  packageJSON: unknown;
};

/**
 * Configuration for extension types in tests
 */
export type ExtensionType = {
  extensionId: string;
  name: string;
  vsixPath: string;
  shouldInstall: 'always' | 'never' | 'optional';
  shouldVerifyActivation: boolean;
};

/**
 * Information about extension activation status
 */
export type ExtensionActivation = {
  extensionId: string;
  isPresent: boolean;
  version?: string;
  activationTime?: string;
  hasBug?: boolean;
  isActivationComplete?: boolean;
};

/**
 * Options for verifying extensions
 */
export type VerifyExtensionsOptions = {
  timeout?: number;
  interval?: number;
};
