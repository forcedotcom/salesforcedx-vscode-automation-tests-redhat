/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { join } from 'path';
import { LOG_LEVELS, LogLevel } from './core/constants';

/**
 * Singleton class to manage environment settings for Salesforce DX VSCode automation tests
 *
 * @remarks
 * This class loads configuration from environment variables at initialization time
 */
export class EnvironmentSettings {
  private static _instance: EnvironmentSettings;

  /**
   * VSCode version to use in tests
   * @env CODE_VERSION - VSCode version identifier (vscode-extension-tester standard)
   * @default 'latest'
   */
  private _codeVersion = 'latest';

  /**
   * Specific test spec files to run
   * @env SPEC_FILES - Test spec filename(s) to run
   * @default []
   */
  private _specFiles: string[] = [];

  /**
   * Path to directory containing VSIX files to install
   * @env VSIX_TO_INSTALL - Path to directory with VSIX files
   * @default undefined
   */
  private _vsixToInstallDir: string | undefined;

  /**
   * DevHub org alias name
   * @env DEV_HUB_ALIAS_NAME - Alias for the DevHub org
   * @default 'vscodeOrg'
   */
  private _devHubAliasName = 'vscodeOrg';

  /**
   * DevHub username
   * @env DEV_HUB_USER_NAME - Username for the DevHub org
   */
  private _devHubUserName: string | undefined;

  /**
   * SFDX auth URL for authentication
   * @env SFDX_AUTH_URL - URL for authenticating with Salesforce DX
   * @default undefined
   */
  private _sfdxAuthUrl = process.env.SFDX_AUTH_URL;

  /**
   * Path to Salesforce DX VSCode extensions
   * @env EXTENSIONS_FOLDER - Path to extensions directory (vscode-extension-tester standard)
   * @default '[project_root]/extensions'
   */
  private _extensionsFolder = join(process.cwd(), 'extensions');

  /**
   * Path to the workspace folder where VS Code and test artifacts are stored
   * @env TEST_RESOURCES - Path to workspace directory (vscode-extension-tester standard)
   * @default '[project_root]/test-resources'
   */
  private _testResources = join(process.cwd(), 'test-resources');

  /**
   * Chrome driver arguments
   * @env VSCODE_EXTENSION_TESTER_CHROMEDRIVER_ARGS - Arguments for Chrome driver
   * @default undefined
   */
  private _chromeDriverArgs: string | undefined;

  /**
   * Test execution start time
   * @default current time formatted as short time string
   */
  private _startTime = new Date(Date.now()).toLocaleTimeString([], { timeStyle: 'short' });

  /**
   * Factor to slow down test execution
   * @env THROTTLE_FACTOR - Number to multiply timeouts by
   * @default 1
   */
  private _throttleFactor = 1;

  /**
   * Java home directory path
   * @env JAVA_HOME - Path to Java installation
   * @default undefined
   */
  private _javaHome = process.env.JAVA_HOME;

  /**
   * Path to an existing project to use instead of creating a new one
   * @env USE_EXISTING_PROJECT_PATH - Path to existing project directory
   * @default undefined
   */
  private _useExistingProject: string | undefined;

  /**
   * Log level for test execution
   * @env E2E_LOG_LEVEL - One of the valid log levels defined in LOG_LEVELS
   * @default 'info'
   */
  private _logLevel: LogLevel = 'info';

  /**
   * Private constructor that loads all settings from environment variables
   * Follows the Singleton pattern - use getInstance() to access
   */
  private constructor() {
    // Use vscode-extension-tester standard environment variables
    this._codeVersion = process.env.CODE_VERSION || this._codeVersion;
    this._testResources = process.env.TEST_RESOURCES || this._testResources;
    this._extensionsFolder = process.env.EXTENSIONS_FOLDER || this._extensionsFolder;
    this._chromeDriverArgs = process.env.VSCODE_EXTENSION_TESTER_CHROMEDRIVER_ARGS;

    // VSIXs to install directory - no default value
    this._vsixToInstallDir = process.env.VSIX_TO_INSTALL;

    // Custom project environment variables
    this._devHubAliasName = process.env.DEV_HUB_ALIAS_NAME || this._devHubAliasName;
    this._devHubUserName = process.env.DEV_HUB_USER_NAME;
    this._throttleFactor = parseInt(process.env.THROTTLE_FACTOR ?? '0') || this._throttleFactor;
    this._sfdxAuthUrl = process.env.SFDX_AUTH_URL || this._sfdxAuthUrl;
    this._logLevel = LOG_LEVELS.some(l => l === process.env.E2E_LOG_LEVEL)
      ? (process.env.E2E_LOG_LEVEL as LogLevel)
      : this._logLevel;
    this._javaHome = process.env.JAVA_HOME || this._javaHome;
    this.useExistingProject = process.env.USE_EXISTING_PROJECT_PATH;
  }

  /**
   * Returns the singleton instance of EnvironmentSettings
   * Creates the instance if it doesn't exist
   */
  public static getInstance(): EnvironmentSettings {
    if (!EnvironmentSettings._instance) {
      EnvironmentSettings._instance = new EnvironmentSettings();
    }
    return EnvironmentSettings._instance;
  }

  /** Gets the VSCode version to use in tests */
  public get vscodeVersion(): string {
    return this._codeVersion;
  }

  /** @deprecated Use vscodeVersion instead */
  public get codeVersion(): string {
    return this._codeVersion;
  }

  /** Gets the spec files to run */
  public get specFiles(): string[] {
    return this._specFiles;
  }

  /** Gets the DevHub org alias name */
  public get devHubAliasName(): string {
    return this._devHubAliasName;
  }

  /** Gets the DevHub username */
  public get devHubUserName(): string | undefined {
    return this._devHubUserName;
  }

  /** Gets the path to Salesforce DX VSCode extensions */
  public get extensionPath(): string {
    return this._extensionsFolder;
  }

  /** Gets the path to Salesforce DX VSCode extensions (aligned with env var name) */
  public get extensionsFolder(): string {
    return this._extensionsFolder;
  }

  /** Gets the throttle factor for slowing down test execution */
  public get throttleFactor(): number {
    return this._throttleFactor;
  }

  /** Gets the test execution start time */
  public get startTime(): string {
    return this._startTime;
  }

  /** Gets the SFDX auth URL for authentication */
  public get sfdxAuthUrl(): string | undefined {
    return this._sfdxAuthUrl;
  }

  /** Gets the Java home directory path */
  public get javaHome(): string | undefined {
    return this._javaHome;
  }

  /** Gets the path to an existing project */
  public get useExistingProject(): string | undefined {
    return this._useExistingProject;
  }

  /**
   * Sets the path to an existing project
   * @param existingProject Path to the project directory
   * @throws Error if the specified path does not exist
   */
  public set useExistingProject(existingProject: string | undefined) {
    const projectPath = existingProject ?? process.env.USE_EXISTING_PROJECT_PATH;
    if (!projectPath) {
      this._useExistingProject = undefined;
      return;
    }
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Project path for "${projectPath}" does not exist`);
    }

    this._useExistingProject = projectPath;
  }

  /** Gets the workspace path where VS Code and test artifacts are stored */
  public get workspacePath(): string {
    return this._testResources;
  }

  /** Gets the test resources path (aligned with env var name) */
  public get testResources(): string {
    return this._testResources;
  }

  /** Gets the log level for test execution */
  public get logLevel(): LogLevel {
    return this._logLevel;
  }

  /** Gets the Chrome driver arguments */
  public get chromeDriverArgs(): string | undefined {
    return this._chromeDriverArgs;
  }

  /** Gets the Chrome driver arguments (more explicit naming) */
  public get vscodeExtensionTesterChromeDriverArgs(): string | undefined {
    return this._chromeDriverArgs;
  }

  /** Gets the directory containing VSIX files to install */
  public get vsixToInstallDir(): string | undefined {
    return this._vsixToInstallDir;
  }
}
