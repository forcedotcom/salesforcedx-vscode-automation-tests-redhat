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
import { getVsixFilesFromDir } from './system-operations';
import { TestConfig } from './core/types';
import { createDefaultTestConfig, validateTestConfig, normalizePath } from './core/helpers';
import { verifyAliasAndUserName } from './salesforce-components/authorization';

class TestSetupAndRunner extends ExTester {
  protected static _exTestor: TestSetupAndRunner;
  private testConfig: TestConfig;
  private spec: string | string[] | undefined;

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

    super(undefined, ReleaseQuality.Stable);
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
  }

  public async setup(): Promise<void> {
    // Log the test environment configuration
    this.logTestEnvironment();

    await this.downloadCode(this.testConfig.codeVersion);
    await this.downloadChromeDriver(this.testConfig.codeVersion);

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

    return super.runTests(this.spec || EnvironmentSettings.getInstance().specFiles, { resources });
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
      await this.installExtension(extensionObj.vsixPath);
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
    log('Authenticating using SFDX_AUTH_URL...');
    const sfdxAuthUrl = String(SFDX_AUTH_URL);
    const authFilePath = 'authFile.txt';

    // Create and write the SFDX Auth URL in a text file
    await fs.writeFile(authFilePath, sfdxAuthUrl);

    // Step 1: Authorize to Testing Org
    const authorizeOrg = await orgLoginSfdxUrl(authFilePath);
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
  .help().argv as {
  spec: string | string[] | undefined;
  workspacePath?: string;
};

// Create test config from command line arguments
const testConfig: Partial<TestConfig> = {};

if (argv.workspacePath) {
  testConfig.workspacePath = argv.workspacePath;
  testConfig.extensionsPath = path.join(argv.workspacePath, 'extensions');
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
