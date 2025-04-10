/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import * as fs from 'fs';
import { EnvironmentSettings as Env } from './environmentSettings';
import * as core from './core/index';
import { ProjectConfig, ProjectShapeOption, ExtensionConfig } from './core/types';
import {
  deleteScratchOrg,
  createFolder,
  generateSfProject,
  gitRepoExists,
  getRepoNameFromUrl,
  getFolderName,
  gitClone
} from './system-operations';
import {
  verifyExtensionsAreRunning,
  reloadAndEnableExtensions,
  checkForUncaughtErrors,
  extensions,
} from './testing';
import { verifyProjectLoaded } from './ui-interaction';
import { setUpScratchOrg } from './salesforce-components';

export class TestSetup {
  public testSuiteSuffixName = '';
  // this needs to be defined in EnvironmentSettings with the default being os.tmpDir()
  public tempFolderPath = path.join(process.cwd(), 'e2e-temp');
  public projectFolderPath: string | undefined;
  public aliasAndUserNameWereVerified = false;
  public scratchOrgAliasName: string | undefined;
  public scratchOrgId: string | undefined;
  private configuredExtensions: ExtensionConfig[] = [];

  private constructor() {}

  public get tempProjectName(): string {
    return 'TempProject-' + this.testSuiteSuffixName;
  }

  public static async setUp(testReqConfig: core.TestReqConfig): Promise<TestSetup> {
    const testSetup = new TestSetup();
    testSetup.testSuiteSuffixName = testReqConfig.testSuiteSuffixName;
    core.log('');
    core.log(`${testSetup.testSuiteSuffixName} - Starting TestSetup.setUp()...`);

    // Configure extensions based on test requirements
    testSetup.configureExtensions(testReqConfig);

    /* The expected workspace will be open up after setUpTestingWorkspace */
    await testSetup.setUpTestingWorkspace(testReqConfig.projectConfig);
    if (testReqConfig.projectConfig.projectShape !== ProjectShapeOption.NONE) {
      await verifyExtensionsAreRunning(testSetup.getExtensionsToVerify());
      const scratchOrgEdition = testReqConfig.scratchOrgEdition || 'developer';
      testSetup.updateScratchOrgDefWithEdition(scratchOrgEdition);
      if (process.platform === 'darwin') testSetup.setJavaHomeConfigEntry(); // Extra config needed for Apex LSP on GHA
      if (testReqConfig.isOrgRequired) await setUpScratchOrg(testSetup, scratchOrgEdition);
      await reloadAndEnableExtensions(); // This is necessary in order to update JAVA home path
    }
    testSetup.setWorkbenchHoverDelay();
    core.log(`${testSetup.testSuiteSuffixName} - ...finished TestSetup.setUp()`);
    return testSetup;
  }

  /**
   * Configure extensions based on test requirements
   * @param testReqConfig Test requirement configuration
   */
  private configureExtensions(testReqConfig: core.TestReqConfig): void {
    // Start with all default extensions from salesforceExtensions
    this.configuredExtensions = testReqConfig.extensionConfigs || [];

    // If extensionConfigs is provided, configure the specific extensions
    if (testReqConfig.extensionConfigs) {
      if (testReqConfig.extensionConfigs.length === 0) {
        // Empty array means no extensions
        this.configuredExtensions = [];
      } else {
        // For each configured extension, update the corresponding default extension or add a new one
        for (const extConfig of testReqConfig.extensionConfigs) {
          const existingExtIndex = this.configuredExtensions.findIndex(
            ext => ext.extensionId === extConfig.extensionId
          );

          if (existingExtIndex >= 0) {
            // Update existing extension configuration
            this.configuredExtensions[existingExtIndex] = {
              ...this.configuredExtensions[existingExtIndex],
              shouldInstall: extConfig.shouldInstall,
              shouldVerifyActivation: extConfig.shouldVerifyActivation,
              vsixPath: extConfig.vsixPath || this.configuredExtensions[existingExtIndex].vsixPath
            };
          } else {
            // Add new extension configuration
            this.configuredExtensions.push({
              extensionId: extConfig.extensionId,
              name: extConfig.name || extConfig.extensionId, // Use provided name or extensionId as name
              vsixPath: extConfig.vsixPath || '',
              shouldInstall: extConfig.shouldInstall,
              shouldVerifyActivation: extConfig.shouldVerifyActivation
            });
          }
        }
      }
    }

    // For backward compatibility: handle excludedExtensions by setting shouldInstall to 'never'
    if (testReqConfig.excludedExtensions && testReqConfig.excludedExtensions.length > 0) {
      for (const excludedExtId of testReqConfig.excludedExtensions) {
        const extIndex = this.configuredExtensions.findIndex(ext => ext.extensionId === excludedExtId);
        if (extIndex >= 0) {
          this.configuredExtensions[extIndex].shouldInstall = 'never';
          this.configuredExtensions[extIndex].shouldVerifyActivation = false;
        }
      }
    }

    // Update the global extensions variable to use our configured extensions
    // This ensures compatibility with any code that still uses the global extensions
    Object.assign(extensions, this.configuredExtensions);

    core.log(`${this.testSuiteSuffixName} - Configured ${this.configuredExtensions.length} extensions for testing`);
  }

  /**
   * Get extensions that should be verified during test setup
   */
  public getExtensionsToVerify(): ExtensionConfig[] {
    return this.configuredExtensions.filter(ext => ext.shouldVerifyActivation);
  }

  /**
   * Get extensions that should be installed with a specific installation option
   * @param option Installation option to filter by
   */
  public getExtensionsToInstall(option: 'always' | 'never' | 'optional'): ExtensionConfig[] {
    return this.configuredExtensions.filter(ext => ext.shouldInstall === option);
  }

  public async tearDown(shouldCheckForUncaughtErrors = true): Promise<void> {
    if (shouldCheckForUncaughtErrors) await checkForUncaughtErrors();
    try {
      await deleteScratchOrg(this.scratchOrgAliasName);
    } catch (error) {
      core.log(`Deleting scratch org (or info) failed with Error: ${(error as Error).message}`);
    }
  }

  private async initializeNewSfProject() {
    if (!fs.existsSync(this.tempFolderPath)) {
      createFolder(this.tempFolderPath);
    }
    await generateSfProject(this.tempProjectName, this.tempFolderPath); // generate a sf project for 'new'
    this.projectFolderPath = path.join(this.tempFolderPath, this.tempProjectName);
  }

  public async setUpTestingWorkspace(projectConfig: ProjectConfig) {
    core.log(`${this.testSuiteSuffixName} - Starting setUpTestingWorkspace()...`);
    let projectName;
    switch (projectConfig.projectShape) {
      case ProjectShapeOption.NEW:
        await this.initializeNewSfProject();
        break;

      case ProjectShapeOption.NAMED:
        if (projectConfig.githubRepoUrl) {
          // verify if folder matches the github repo url
          const repoExists = await gitRepoExists(projectConfig.githubRepoUrl);
          if (!repoExists) {
            this.throwError(`Repository does not exist or is inaccessible: ${projectConfig.githubRepoUrl}`);
          }
          const repoName = getRepoNameFromUrl(projectConfig.githubRepoUrl);
          if (!repoName) {
            this.throwError(`Unable to determine repository name from URL: ${projectConfig.githubRepoUrl}`);
          } else {
            projectName = repoName;
            if (projectConfig.folderPath) {
              const localProjName = getFolderName(projectConfig.folderPath);
              if (localProjName !== repoName) {
                this.throwError(
                  `The local project ${localProjName} does not match the required Github repo ${repoName}`
                );
              } else {
                // If it is a match, use the local folder directly. Local dev use only.
                this.projectFolderPath = projectConfig.folderPath;
              }
            } else {
              // Clone the project from Github URL directly
              this.projectFolderPath = path.join(this.tempFolderPath, repoName);
              await gitClone(projectConfig.githubRepoUrl, this.projectFolderPath);
            }
          }
        } else {
          // missing info, throw an error
          this.throwError(`githubRepoUrl is required for named project shape`);
        }
        break;

      case ProjectShapeOption.ANY:
        // ANY: workspace is designated to open when wdio is initialized
        if (projectConfig.folderPath) {
          this.projectFolderPath = projectConfig.folderPath;
          projectName = getFolderName(projectConfig.folderPath);
        } else {
          // Fallback: if no folder specified, create a new sf project instead
          await this.initializeNewSfProject();
        }
        break;

      case ProjectShapeOption.NONE:
        // NONE: no project open in the workspace by default
        /* create the e2e-temp folder to benefit further testing */
        this.projectFolderPath = path.join(this.tempFolderPath, this.tempProjectName);
        if (!fs.existsSync(this.tempFolderPath)) {
          createFolder(this.tempFolderPath);
        }
        break;

      default:
        this.throwError(`Invalid project shape: ${projectConfig.projectShape}`);
    }

    if ([ProjectShapeOption.NAMED, ProjectShapeOption.NEW].includes(projectConfig.projectShape)) {
      core.log(`Project folder to open: ${this.projectFolderPath}`);
      await core.openFolder(this.projectFolderPath!);
      // Verify the project was loaded.
      await verifyProjectLoaded(projectName ?? this.tempProjectName);
    }
  }

  private throwError(message: string) {
    core.log(message);
    throw new Error(message);
  }

  public updateScratchOrgDefWithEdition(scratchOrgEdition: core.OrgEdition) {
    if (scratchOrgEdition === 'enterprise') {
      const projectScratchDefPath = path.join(this.projectFolderPath!, 'config', 'project-scratch-def.json');
      let projectScratchDef = fs.readFileSync(projectScratchDefPath, 'utf8');
      projectScratchDef = projectScratchDef.replace(`"edition": "Developer"`, `"edition": "Enterprise"`);
      fs.writeFileSync(projectScratchDefPath, projectScratchDef, 'utf8');
    }
  }

  private setJavaHomeConfigEntry(): void {
    const vscodeSettingsPath = path.join(this.projectFolderPath!, '.vscode', 'settings.json');
    if (!Env.getInstance().javaHome) {
      return;
    }
    if (!fs.existsSync(path.dirname(vscodeSettingsPath))) {
      fs.mkdirSync(path.dirname(vscodeSettingsPath), { recursive: true });
    }

    let settings = fs.existsSync(vscodeSettingsPath) ? JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8')) : {};

    settings = {
      ...settings,
      ...(process.env.JAVA_HOME ? { 'salesforcedx-vscode-apex.java.home': process.env.JAVA_HOME } : {})
    };
    fs.writeFileSync(vscodeSettingsPath, JSON.stringify(settings, null, 2), 'utf8');
    core.log(
      `${this.testSuiteSuffixName} - Set 'salesforcedx-vscode-apex.java.home' to '${process.env.JAVA_HOME}' in ${vscodeSettingsPath}`
    );
  }

  private setWorkbenchHoverDelay(): void {
    const vscodeSettingsPath = path.join(this.projectFolderPath!, '.vscode', 'settings.json');

    if (!fs.existsSync(path.dirname(vscodeSettingsPath))) {
      fs.mkdirSync(path.dirname(vscodeSettingsPath), { recursive: true });
    }

    let settings = fs.existsSync(vscodeSettingsPath) ? JSON.parse(fs.readFileSync(vscodeSettingsPath, 'utf8')) : {};

    // Update settings to set workbench.hover.delay
    settings = {
      ...settings,
      'workbench.hover.delay': 300000
    };

    fs.writeFileSync(vscodeSettingsPath, JSON.stringify(settings, null, 2), 'utf8');
    core.log(`${this.testSuiteSuffixName} - Set 'workbench.hover.delay' to '300000' in ${vscodeSettingsPath}`);
  }
}
