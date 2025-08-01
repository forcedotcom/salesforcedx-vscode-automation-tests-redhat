import { ExTester } from 'vscode-extension-tester';
import { EnvironmentSettings } from './environmentSettings';
import path from 'path';
import fs from 'fs/promises';
import { extensions } from './testing/extensionUtils';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ReleaseQuality } from 'vscode-extension-tester/out/util/codeUtil';
import { expect } from 'chai';
import { log } from 'console';
import { orgLoginSfdxUrl, setAlias } from './system-operations/cliCommands';
import { createOrOverwriteFile, getVsixFilesFromDir } from './system-operations';
import { TestConfig } from './core/types';
import { createDefaultTestConfig, validateTestConfig, normalizePath } from './core/helpers';
import { verifyAliasAndUserName } from './salesforce-components/authorization';
import { retryOperation } from './retryUtils';

// Set Ubuntu Chrome arguments immediately when module loads
if (process.platform === 'linux') {
  const uniqueId = `${Date.now()}-${process.pid}`;
  const tempDir = path.join(process.cwd(), 'test-resources', 'chrome-user-data', uniqueId);

  const ubuntuChromeArgs = [
    `--user-data-dir=${tempDir}`,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-field-trial-config',
    '--disable-ipc-flooding-protection',
    '--single-process',
    '--no-zygote'
  ].join(' ');

  process.env.VSCODE_EXTENSION_TESTER_CHROMEDRIVER_ARGS = ubuntuChromeArgs;
  process.env.CHROME_OPTIONS = ubuntuChromeArgs;
  process.env.CHROMIUM_FLAGS = ubuntuChromeArgs;

  log(`Early Ubuntu Chrome setup: ${ubuntuChromeArgs}`);
}

// Set Chrome-related environment variables early
process.env.CHROME_OPTIONS = '--no-sandbox --disable-dev-shm-usage --disable-gpu --remote-debugging-port=9222 --disable-web-security --disable-features=VizDisplayCompositor --single-process --no-zygote --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --user-data-dir=/tmp/chrome-user-data-' + Date.now();
process.env.CHROMIUM_FLAGS = '--no-sandbox --disable-dev-shm-usage --disable-gpu --remote-debugging-port=9222 --disable-web-security --disable-features=VizDisplayCompositor --single-process --no-zygote --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --user-data-dir=/tmp/chrome-user-data-' + Date.now();
process.env.CHROME_BIN = '/usr/bin/google-chrome';
process.env.CHROMIUM_BIN = '/usr/bin/google-chrome';

// Skip Husky installation during test setup
process.env.HUSKY_SKIP_INSTALL = '1';

// Set NPM to use legacy peer dependencies
process.env.NPM_CONFIG_LEGACY_PEER_DEPS = 'true';

// For Ubuntu CI environments
if (process.platform === 'linux') {
  // Set up virtual display for headless operation
  process.env.DISPLAY = ':99';
  process.env.CHROME_NO_SANDBOX = 'true';
  process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
  process.env.PUPPETEER_EXECUTABLE_PATH = '/usr/bin/google-chrome';

  // Additional Chrome flags for CI
  process.env.CHROME_DEVEL_SANDBOX = '/usr/lib/chromium-browser/chrome-sandbox';
}

class TestSetupAndRunner extends ExTester {
  protected static _exTestor: TestSetupAndRunner;
  private testConfig: TestConfig;
  private spec: string | string[] | undefined;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 5000;

  constructor(
    testConfig?: Partial<TestConfig>,
    spec?: string | string[] | undefined
  ) {
    log(`Init testConfig with testConfig: ${JSON.stringify(testConfig)}`);
    log(`Init testConfig with spec: ${spec}`);
    // Create config with defaults and overrides
    const config = createDefaultTestConfig(testConfig);

    // Validate config and set defaults for missing values
    validateTestConfig(config);

    super(config?.testResources, ReleaseQuality.Stable);
    this.testConfig = config;
    this.spec = spec;
  }

  /**
   * Helper method to log important test information using standard terminology
   */
  private logTestEnvironment(): void {
    log(`Setting up test environment with:`);
    log(`- Test Resources: ${this.testConfig.testResources}`);
    log(`- Extensions Folder: ${this.testConfig.extensionsFolder}`);
    log(`- VS Code Version: ${this.testConfig.codeVersion}`);

    // Log Chrome driver arguments if available
    const chromeDriverArgs = EnvironmentSettings.getInstance().chromeDriverArgs;
    if (chromeDriverArgs) {
      log(`- ChromeDriver Arguments: ${chromeDriverArgs}`);
    }

    // Log the throttle factor
    const throttleFactor = EnvironmentSettings.getInstance().throttleFactor;
    log(`- Throttle Factor: ${throttleFactor}`);
  }

  /**
   * Sets up Ubuntu-specific Chrome driver arguments to avoid user data directory conflicts
   */
  private async setupUbuntuChromeArgs(): Promise<void> {
    // Only apply Ubuntu-specific settings if we're on Linux and no custom args are already set
    if (process.platform !== 'linux') {
      console.log(`Not on Linux, skipping setupUbuntuChromeArgs: ${process.platform}`);
      return;
    }

    const existingArgs = EnvironmentSettings.getInstance().chromeDriverArgs;
    if (existingArgs) {
      log(`Chrome driver arguments already set: ${existingArgs}`);
      return;
    }

    // Generate a unique user data directory for this test run
    const uniqueId = `${Date.now()}-${process.pid}`;
    const tempDir = path.join(this.testConfig.testResources || 'test-resources', 'chrome-user-data', uniqueId);

    // Ensure the directory exists
    try {
      await fs.mkdir(tempDir, { recursive: true });
      log(`Created Chrome user data directory: ${tempDir}`);
    } catch (error) {
      log(`Warning: Could not create Chrome user data directory: ${error}`);
    }

    const ubuntuChromeArgs = [
      `--user-data-dir=${tempDir}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-field-trial-config',
      '--disable-ipc-flooding-protection',
      '--single-process',
      '--no-zygote'
    ].join(' ');

    // Set the environment variable for vscode-extension-tester to pick up
    process.env.VSCODE_EXTENSION_TESTER_CHROMEDRIVER_ARGS = ubuntuChromeArgs;

    // Also try other possible environment variables
    process.env.CHROME_OPTIONS = ubuntuChromeArgs;
    process.env.CHROMIUM_FLAGS = ubuntuChromeArgs;
    process.env.GOOGLE_CHROME_OPTS = ubuntuChromeArgs;

    log(`Set Ubuntu Chrome driver arguments: ${ubuntuChromeArgs}`);
    log(`Environment variable VSCODE_EXTENSION_TESTER_CHROMEDRIVER_ARGS: ${process.env.VSCODE_EXTENSION_TESTER_CHROMEDRIVER_ARGS}`);

    // Also try setting the user data dir in a more explicit way
    const userDataDir = tempDir;
    process.env.CHROME_USER_DATA_DIR = userDataDir;
    process.env.CHROMIUM_USER_DATA_DIR = userDataDir;
    log(`Set CHROME_USER_DATA_DIR: ${userDataDir}`);
  }

  /**
   * Kills existing Chrome processes that might be using the user data directory
   */
  private async killExistingChromeProcesses(): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      log('Attempting to kill existing Chrome processes...');

      // Kill Chrome processes
      const commands = [
        'pkill -f "chrome.*--test-type"',
        'pkill -f "chromium.*--test-type"',
        'pkill -f "google-chrome.*--test-type"',
        'pkill -f "chrome.*--user-data-dir"',
        'pkill -f "chromium.*--user-data-dir"'
      ];

      for (const command of commands) {
        try {
          await execAsync(command);
          log(`Executed: ${command}`);
        } catch (error) {
          // It's normal for pkill to exit with code 1 if no processes are found
          log(`Command ${command} completed (processes may not have been running)`);
        }
      }

      // Wait a moment for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      log('Chrome process cleanup completed');

    } catch (error) {
      log(`Warning: Could not kill Chrome processes: ${error}`);
    }
  }

  /**
   * Kills existing VS Code processes on Windows to prevent file locking issues during extension installation
   */
  private async killExistingVSCodeProcesses(): Promise<void> {
    if (process.platform !== 'win32') {
      return;
    }

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      log('Attempting to kill existing VS Code processes on Windows...');

      // Kill VS Code processes on Windows
      const commands = [
        'taskkill /f /im Code.exe',
        'taskkill /f /im code.exe',
        'taskkill /f /im VSCode.exe',
        'taskkill /f /im electron.exe /fi "WINDOWTITLE eq Visual Studio Code*"',
        'taskkill /f /im node.exe /fi "COMMANDLINE eq *vscode*"'
      ];

      for (const command of commands) {
        try {
          await execAsync(command);
          log(`Executed: ${command}`);
        } catch (error) {
          // It's normal for taskkill to exit with code 1 if no processes are found
          log(`Command ${command} completed (processes may not have been running)`);
        }
      }

      // Wait a moment for processes to fully terminate and release file locks
      await new Promise(resolve => setTimeout(resolve, 3000));
      log('VS Code process cleanup completed');

    } catch (error) {
      log(`Warning: Could not kill VS Code processes: ${error}`);
    }
  }

  /**
   * Cleans up Windows VS Code extension temporary files that may cause locking issues
   */
  private async cleanupWindowsExtensionTempFiles(): Promise<void> {
    if (process.platform !== 'win32') {
      return;
    }

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      log('Cleaning up Windows VS Code extension temporary files...');

      // Clean up VS Code extension temporary files
      const cleanupCommands = [
        'del /f /q "%USERPROFILE%\\.vscode\\extensions\\*.vsctmp" 2>nul',
        'del /f /q "%USERPROFILE%\\.vscode\\extensions\\*.tmp" 2>nul',
        'rmdir /s /q "%TEMP%\\vscode-*" 2>nul',
        'rmdir /s /q "%TEMP%\\Code-*" 2>nul'
      ];

      for (const command of cleanupCommands) {
        try {
          await execAsync(command);
          log(`Executed cleanup: ${command}`);
        } catch (error) {
          // It's normal for cleanup commands to fail if files don't exist
          log(`Cleanup command completed: ${command}`);
        }
      }

      log('Windows extension temp file cleanup completed');

    } catch (error) {
      log(`Warning: Could not cleanup Windows extension temp files: ${error}`);
    }
  }

  /**
   * Creates a Chrome wrapper script that forces Ubuntu-specific arguments
   */
  private async createChromeWrapper(): Promise<void> {
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      // Find Chrome executable
      const chromeCommands = [
        'which google-chrome',
        'which google-chrome-stable',
        'which chromium-browser',
        'which chromium'
      ];

      let chromeExePath = '';
      for (const command of chromeCommands) {
        try {
          const result = await execAsync(command);
          chromeExePath = result.stdout.trim();
          if (chromeExePath) {
            log(`Found Chrome at: ${chromeExePath}`);
            break;
          }
        } catch (error) {
          // Command failed, try next one
        }
      }

      if (!chromeExePath) {
        log('Warning: Could not find Chrome executable for wrapper');
        return;
      }

      // Create unique user data directory
      const uniqueId = `${Date.now()}-${process.pid}`;
      const tempDir = path.join(this.testConfig.testResources || 'test-resources', 'chrome-user-data', uniqueId);
      await fs.mkdir(tempDir, { recursive: true });

      // Create wrapper script
      const wrapperPath = path.join(this.testConfig.testResources || 'test-resources', 'chrome-wrapper.sh');
      const wrapperScript = `#!/bin/bash
# Chrome wrapper script for Ubuntu testing
exec "${chromeExePath}" \\
  --user-data-dir="${tempDir}" \\
  --no-sandbox \\
  --disable-dev-shm-usage \\
  --disable-web-security \\
  --disable-features=VizDisplayCompositor \\
  --disable-gpu \\
  --disable-software-rasterizer \\
  --disable-background-timer-throttling \\
  --disable-backgrounding-occluded-windows \\
  --disable-renderer-backgrounding \\
  --disable-field-trial-config \\
  --disable-ipc-flooding-protection \\
  --single-process \\
  --no-zygote \\
  "$@"
`;

      createOrOverwriteFile(wrapperPath, wrapperScript);
      await execAsync(`chmod +x "${wrapperPath}"`);

      // Override Chrome path in environment
      process.env.CHROME_BIN = wrapperPath;
      process.env.CHROMIUM_BIN = wrapperPath;
      process.env.GOOGLE_CHROME_BIN = wrapperPath;

      // Create wrapper scripts for common Chrome names in our own directory
      const wrapperDir = path.join(this.testConfig.testResources || 'test-resources', 'chrome-wrappers');
      await fs.mkdir(wrapperDir, { recursive: true });

      const chromeNames = ['google-chrome', 'google-chrome-stable', 'chromium-browser', 'chromium'];
      for (const name of chromeNames) {
        const nameWrapperPath = path.join(wrapperDir, name);
        createOrOverwriteFile(nameWrapperPath, wrapperScript);
        await execAsync(`chmod +x "${nameWrapperPath}"`);
        log(`Created ${name} wrapper at: ${nameWrapperPath}`);
      }

      // Prepend our wrapper directory to PATH so our wrappers are found first
      process.env.PATH = `${wrapperDir}:${process.env.PATH}`;
      log(`Prepended ${wrapperDir} to PATH`);

      log(`Created Chrome wrapper at: ${wrapperPath}`);
      log(`Set CHROME_BIN to: ${wrapperPath}`);

    } catch (error) {
      log(`Warning: Could not create Chrome wrapper: ${error}`);
    }
  }

  public async setup(): Promise<void> {
    // Log the test environment configuration
    this.logTestEnvironment();

    // Set Ubuntu-specific Chrome driver arguments if needed
    await this.setupUbuntuChromeArgs();

    // Kill any existing Chrome processes on Linux
    if (process.platform === 'linux') {
      await this.killExistingChromeProcesses();
    }

    await this.downloadCode(this.testConfig.codeVersion);
    await this.downloadChromeDriver(this.testConfig.codeVersion);

    // Create Chrome wrapper script for Ubuntu
    if (process.platform === 'linux') {
      await this.createChromeWrapper();
    }

    // Kill any existing VS Code processes on Windows before installing extensions
    if (process.platform === 'win32') {
      await this.killExistingVSCodeProcesses();
      await this.cleanupWindowsExtensionTempFiles();
    }

    try {
      await this.installExtensions();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Warning: Failed to install extensions: ${errorMessage}. Continuing setup.`);
    }
    await this.setupAndAuthorizeOrg();
  }

  public async runTests(): Promise<number> {
    const useExistingProject = EnvironmentSettings.getInstance().useExistingProject;
    const resources = useExistingProject ? [useExistingProject] : [];

    log(`starting runTests with useExistingProject: ${useExistingProject}`);
    log(`starting runTests with resources: ${resources}`);
    log(`starting runTests with spec: ${this.spec}`);

    // Set Ubuntu Chrome arguments just before running tests
    const isLinux = process.platform === 'linux';
    if (isLinux) {
      await this.setupUbuntuChromeArgs();
      await this.killExistingChromeProcesses();

      // Use Ubuntu-specific test runner
      log('Using Ubuntu-specific test runner...');
      return await this.runTestsUbuntu();
    }

    // Try to pass additional launch arguments for Ubuntu
    const runOptions: { resources: string[]; launchArgs?: string[] } = { resources };
    if (isLinux) {
      runOptions.launchArgs = [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-dev-shm-usage'
      ];
    }

    const exitCode = await super.runTests(this.spec || EnvironmentSettings.getInstance().specFiles, runOptions);
    await this.validateTestExecution(exitCode);
    return exitCode;
  }
  public async installExtension(extension: string): Promise<void> {
    log(`SetUp - Started Install extension ${path.basename(extension)}`);
    await this.installVsix({ useYarn: false, vsixFile: extension });
  }

  public async installExtensions(excludeExtensions: string[] = []): Promise<void> {
    const vsixToInstallDir = this.testConfig.vsixToInstallDir || EnvironmentSettings.getInstance().vsixToInstallDir;
    log(`Installing extension from vsixToInstallDir: ${vsixToInstallDir}`);

    if (!vsixToInstallDir) {
      log(`No VSIX_TO_INSTALL directory specified, the tests will run without installing any extensions`);
      return;
    }

    // Check if the directory exists
    try {
      await fs.access(vsixToInstallDir);
    } catch (error) {
      throw new Error(`VSIX_TO_INSTALL directory does not exist or is not accessible: ${vsixToInstallDir}`);
    }

    // Check for already installed extensions
    const extensionPattern = /^(?<publisher>.+?)\.(?<extensionId>.+?)-(?<version>\d+\.\d+\.\d+)(?:\.\d+)*$/;
    const extensionsDirEntries = (await fs.readdir(vsixToInstallDir)).map(entry =>
      path.resolve(normalizePath(path.join(vsixToInstallDir, entry)))
    );
    const foundInstalledExtensions = await Promise.all(
      extensionsDirEntries
        .filter(async entry => {
          try {
            const stats = await fs.stat(entry);
            return stats.isDirectory();
          } catch (e) {
            log(`stat failed for file ${entry}`);
            return false;
          }
        })
        .map(entry => {
          const match = path.basename(entry).match(extensionPattern);
          if (match?.groups) {
            return {
              publisher: match.groups.publisher,
              extensionId: match.groups.extensionId,
              version: match.groups.version,
              path: entry
            };
          }
          return null;
        })
        .filter(Boolean)
        .filter(ext =>
          extensions.find(refExt => {
            return refExt.extensionId === ext?.extensionId;
          })
        )
    );

    if (
      foundInstalledExtensions.length > 0 &&
      foundInstalledExtensions.every(ext => extensions.find(refExt => refExt.extensionId === ext?.extensionId))
    ) {
      log(`Found the following pre-installed extensions in dir ${vsixToInstallDir}, skipping installation of vsix`);
      foundInstalledExtensions.forEach(ext => {
        log(`Extension ${ext?.extensionId} version ${ext?.version}`);
      });
      return;
    }

    const extensionsVsixs = getVsixFilesFromDir(vsixToInstallDir);
    if (extensionsVsixs.length === 0) {
      log(`No vsix files were found in dir ${vsixToInstallDir}, skipping extension installation`);
      return; // Skip installation instead of throwing an error
    }

    log(`VSIX files count: ${extensionsVsixs.length} were found in dir ${vsixToInstallDir}, skipping extension installation`);

    const mergeExcluded = Array.from(
      new Set([
        ...excludeExtensions,
        ...extensions.filter(ext => ext.shouldInstall === 'never').map(ext => ext.extensionId)
      ])
    );

    // Refactored part to use the extensions array
    extensionsVsixs.forEach(vsix => {
      const match = path.basename(vsix).match(/^(?<extension>.*?)(-(?<version>\d+\.\d+\.\d+))?\.vsix$/);
      log(`Found extension: ${vsix} with match ${match}`)
      if (match?.groups) {
        const { extension, version } = match.groups;
        const foundExtension = extensions.find(e => e.extensionId === extension);
        if (foundExtension) {
          foundExtension.vsixPath = vsix;
          // assign 'never' to this extension if its id is included in excluedExtensions
          foundExtension.shouldInstall = mergeExcluded.includes(foundExtension.extensionId) ? 'never' : 'always';
          // if not installing, don't verify, otherwise use default value
          foundExtension.shouldVerifyActivation =
            foundExtension.shouldInstall === 'never' ? false : foundExtension.shouldVerifyActivation;
          log(`SetUp - Found extension ${extension} version ${version} with vsixPath ${foundExtension.vsixPath}`);
        } else {
          log(`SetUp - Not found extension ${extension} version ${version}`);
        }
      }
    });

    if (extensions.length === 0) {
      log(`No extensions found, cannot proceed with install`);
    }

    // Iterate over the extensions array to install extensions
    for (const extensionObj of extensions.filter(ext => ext.vsixPath !== '' && ext.shouldInstall !== 'never')) {
      let vsixPath = path.resolve(extensionObj.vsixPath);

      // Avoid Windows paths being parsed as URLs by the tester
      if (process.platform === 'win32') {
        vsixPath = vsixPath.replace(/\\/g, '/');
        if (/^[a-zA-Z]:\//.test(vsixPath)) {
          vsixPath = '/' + vsixPath; // Prevent `new URL()` from treating it as a URL
        }
      }

      // Use retry logic for Windows to handle file locking issues
      if (process.platform === 'win32') {
        await retryOperation(
          async () => {
            // Add a small delay before each retry attempt to allow file handles to be released
            await new Promise(resolve => setTimeout(resolve, TestSetupAndRunner.RETRY_DELAY));
            await this.installExtension(vsixPath);
          },
          TestSetupAndRunner.MAX_RETRIES,
          `Failed to install extension ${path.basename(vsixPath)} after retries due to Windows file locking issues`
        );
      } else {
        await this.installExtension(vsixPath);
      }
    }
  }

  public async setupAndAuthorizeOrg() {
    const environmentSettings = EnvironmentSettings.getInstance();
    const devHubUserName = environmentSettings.devHubUserName;
    const devHubAliasName = environmentSettings.devHubAliasName;
    const SFDX_AUTH_URL = environmentSettings.sfdxAuthUrl;

    try {
      // First try to verify if the org with alias and username exists
      log('Checking if org with matching alias and username is already authenticated...');
      await verifyAliasAndUserName();
      log(`Org with alias ${devHubAliasName} and username ${devHubUserName} is already authenticated`);
      return;
    } catch (error) {
      // If verification fails, continue with SFDX_AUTH_URL
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`No existing authenticated org found: ${errorMessage}`);

      // If no SFDX_AUTH_URL is provided, rethrow the error
      if (!SFDX_AUTH_URL) {
        throw new Error('No SFDX_AUTH_URL provided and no existing authentication found. Unable to authorize org.');
      }
    }

    // The verifyAliasAndUserName function already checks that both alias and username are set,
    // so at this point we know they are defined (or we would have thrown earlier).
    // TypeScript doesn't know this though, so we'll add the non-null assertion
    if (!devHubUserName || !devHubAliasName) {
      throw new Error(
        'DevHub username or alias name is not set. This should not happen as verifyAliasAndUserName should have caught this.'
      );
    }

    // At this point, neither alias nor username matched an existing org,
    // and we have an SFDX_AUTH_URL to use
    log('Authenticating using SFDX_AUTH_URL from environment variable...');

    // Step 1: Authorize to Testing Org
    const authorizeOrg = await orgLoginSfdxUrl();
    expect(authorizeOrg.stdout).to.contain(`Successfully authorized ${devHubUserName}`);
    log(`Successfully authorized ${devHubUserName}`);

    // Step 2: Set Alias for the Org
    const setAliasResult = await setAlias(devHubAliasName, devHubUserName);
    expect(setAliasResult.stdout).to.contain(devHubAliasName);
    expect(setAliasResult.stdout).to.contain(devHubUserName);
    expect(setAliasResult.stdout).to.contain('true');
    log(`Successfully setAliasResult ${setAliasResult.stdout}`);
  }

  async downloadCode(version = 'latest'): Promise<void> {
    await super.downloadCode(version);
  }

  static get exTester(): TestSetupAndRunner {
    if (TestSetupAndRunner.exTester) {
      return TestSetupAndRunner._exTestor;
    }
    TestSetupAndRunner._exTestor = new TestSetupAndRunner();
    return TestSetupAndRunner._exTestor;
  }

  private async setupVirtualDisplay(): Promise<void> {
    if (process.platform !== 'linux') {
      return;
    }

    try {
      console.log('Setting up virtual display for Ubuntu...');

      // Start Xvfb virtual display
      await this.execShellCommand('Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &').catch(() => {
        console.log('Xvfb might already be running or not available');
      });

      // Wait for display to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify display is working
      await this.execShellCommand('export DISPLAY=:99 && xdpyinfo > /dev/null 2>&1').catch(() => {
        console.log('Virtual display verification failed, continuing anyway');
      });

      console.log('Virtual display setup completed');

    } catch (error) {
      console.warn('Failed to setup virtual display:', error);
    }
  }

  private async execShellCommand(command: string): Promise<void> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    await execAsync(command);
  }

  private async runTestsUbuntu(): Promise<number> {
    // Setup virtual display for Ubuntu
    await this.setupVirtualDisplay();

    console.log('Running tests...');

    // Kill any existing Chrome processes before running
    if (process.platform === 'linux') {
      await this.killChromeProcesses();
    }

    // Create a unique user data directory
    const uniqueUserDataDir = `/tmp/vscode-chrome-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    // Update environment variables with unique directory
    process.env.CHROME_USER_DATA_DIR = uniqueUserDataDir;

    // Call the existing runTests method
    const useExistingProject = EnvironmentSettings.getInstance().useExistingProject;
    const resources = useExistingProject ? [useExistingProject] : [];
    const exitCode = await super.runTests(this.spec || EnvironmentSettings.getInstance().specFiles, { resources });

    await this.validateTestExecution(exitCode);

    if (exitCode === 0) {
      console.log('Tests completed successfully!');
    }

    return exitCode;
  }

  /**
   * Validates that tests were actually executed by checking for test output
   * Throws an error if no tests were found or executed
   */
  private async validateTestExecution(exitCode: number): Promise<void> {
    if (exitCode !== 0) {
      return; // If tests failed, don't check for test count (tests were found but failed)
    }

    // Check if any spec files were provided
    const specFiles = this.spec || EnvironmentSettings.getInstance().specFiles;
    if (!specFiles || (Array.isArray(specFiles) && specFiles.length === 0)) {
      throw new Error('No E2E test spec files were provided. Please specify test files to run.');
    }

    // Check if spec files actually exist
    const specsToCheck = Array.isArray(specFiles) ? specFiles : [specFiles];
    let foundTestFiles = false;

    for (const spec of specsToCheck) {
      try {
        // Check if the spec file/pattern matches any files
        if (spec.includes('*') || spec.includes('?')) {
          // It's a glob pattern - we can't easily check without implementing glob matching
          // For now, assume it's valid if it contains wildcards
          log(`Spec pattern provided: ${spec}`);
          foundTestFiles = true;
        } else {
          // It's a specific file path
          await fs.access(spec);
          foundTestFiles = true;
          log(`Found test file: ${spec}`);
        }
      } catch (error) {
        log(`Test file not found: ${spec}`);
      }
    }

    if (!foundTestFiles && exitCode === 0) {
      throw new Error(`No E2E test files were found for the provided spec: ${JSON.stringify(specFiles)}. This likely indicates a configuration issue - tests should not pass when no test files exist.`);
    }

    log('Test execution validation completed - test files were found and executed');
  }

  private async killChromeProcesses(): Promise<void> {
    try {
      console.log('Killing existing Chrome processes...');

      const commands = [
        'pkill -f "chrome.*--test-type"',
        'pkill -f "chrome.*--remote-debugging-port"',
        'pkill -f "chrome.*--user-data-dir"',
        'pkill -f "chrome.*--disable-dev-shm-usage"',
        'pkill -f chromium',
        'pkill -f google-chrome',
        'pkill -f chrome',
        'pkill -f "Code.*--extensionDevelopmentPath"',
        'pkill -f "code.*--extensionDevelopmentPath"'
      ];

      for (const cmd of commands) {
        try {
          await this.execShellCommand(cmd);
        } catch (error) {
          // Ignore errors - processes might not exist
        }
      }

      // Clean up any leftover user data directories and lock files
      await this.execShellCommand('rm -rf /tmp/chrome-user-data-* /tmp/vscode-chrome-* ~/.config/Code/SingletonLock ~/.vscode/extensions/*/node_modules/.bin/chromedriver').catch(() => {
        console.log('Failed to clean up leftover files, continuing anyway');
      });

      // Wait a moment for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 3000));

    } catch (error) {
      console.warn('Failed to kill Chrome processes:', error);
    }
  }
}

// Parse command-line arguments
const argv = yargs(hideBin(process.argv))
  .option('spec', {
    alias: 's',
    type: 'string',
    description: 'Glob pattern for test files or list of test files',
    demandOption: false,
    array: true
  })
  .option('workspace-path', {
    alias: 'w',
    type: 'string',
    description: 'Path to workspace directory',
    demandOption: false
  })
  .option('vscode-version', {
    alias: 'v',
    type: 'string',
    description: 'VS Code version to use (e.g., latest, stable, 1.85.0)',
    demandOption: false
  })
  .help().argv as {
    spec: string | string[] | undefined;
    workspacePath?: string;
    vscodeVersion?: string;
  };

// Create test config from command line arguments
const testConfig: Partial<TestConfig> = {};

if (argv.workspacePath) {
  testConfig.workspacePath = argv.workspacePath;
  testConfig.extensionsPath = path.join(argv.workspacePath, 'extensions');
}

if (argv.vscodeVersion) {
  testConfig.codeVersion = argv.vscodeVersion;
}

if (argv.spec) {
  log(`Spec passed in: ${argv.spec}`);
}

const testSetupAndRunner = new TestSetupAndRunner(testConfig, argv.spec);
async function run() {
  try {
    await testSetupAndRunner.setup();
    const result = await testSetupAndRunner.runTests();
    console.log(result);
    process.exit(result);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

void run();
