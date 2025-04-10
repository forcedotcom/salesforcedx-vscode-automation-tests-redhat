/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import path from 'path';
import fs from 'fs';
import { EnvironmentSettings as Env } from '../../src/environmentSettings';
import { TestSetup } from '../../src/testSetup';
import { log, pause, Duration, transformedUserName } from '../core/miscellaneous';
import { notificationIsPresentWithTimeout } from '../ui-interaction/notifications';
import { getStatusBarItemWhichIncludes } from '../ui-interaction/statusBar';
import { setDefaultOrg } from '../core/miscellaneous';
import {
  orgDisplay,
  orgList,
  orgLoginSfdxUrl,
  runCliCommand,
  scratchOrgCreate
} from '../system-operations/cliCommands';
import { OrgEdition } from '../core/types';

/**
 * Sets up a scratch org for testing
 * @param testSetup - The test setup configuration
 * @param scratchOrgEdition - The edition of the scratch org to create
 */
export async function setUpScratchOrg(testSetup: TestSetup, scratchOrgEdition: OrgEdition) {
  await authorizeDevHub(testSetup);
  await createDefaultScratchOrg(testSetup, scratchOrgEdition);
}

/**
 * Authorizes a DevHub for use in tests
 * @param testSetup - The test setup configuration
 * @throws Error if DevHub alias or username are not set
 */
export async function authorizeDevHub(testSetup: TestSetup): Promise<void> {
  log('');
  log(`${testSetup.testSuiteSuffixName} - Starting authorizeDevHub()...`);

  // Only need to check this once.
  if (!testSetup.aliasAndUserNameWereVerified) {
    await verifyAliasAndUserName();
    testSetup.aliasAndUserNameWereVerified = true;
  }

  // This is essentially the "SFDX: Authorize a Dev Hub" command, but using the CLI and an auth file instead of the UI.
  const authFilePath = path.join(testSetup.projectFolderPath!, 'authFile.json');
  log(`${testSetup.testSuiteSuffixName} - calling sf org:display...`);
  const sfOrgDisplayResult = await orgDisplay(Env.getInstance().devHubUserName);

  // Now write the file.
  fs.writeFileSync(authFilePath, sfOrgDisplayResult.stdout);
  log(`${testSetup.testSuiteSuffixName} - finished writing the file...`);

  // Call org:login:sfdx-url and read in the JSON that was just created.
  log(`${testSetup.testSuiteSuffixName} - calling sf org:login:sfdx-url...`);
  await orgLoginSfdxUrl(authFilePath);

  log(`${testSetup.testSuiteSuffixName} - ...finished authorizeDevHub()`);
  log('');
}

/**
 * Verifies that the alias and user name are set and match an org in the org list
 * @throws Error if DevHub alias or username are not set or can't be found in org list
 */
export async function verifyAliasAndUserName() {
  const environmentSettings = Env.getInstance();

  const devHubAliasName = environmentSettings.devHubAliasName;
  if (!devHubAliasName) {
    throw new Error('Error: devHubAliasName was not set.');
  }

  const devHubUserName = environmentSettings.devHubUserName;
  if (!devHubUserName) {
    throw new Error('Error: devHubUserName was not set.');
  }

  const execResult = await orgList();
  const sfOrgListResult = JSON.parse(execResult.stdout).result;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nonScratchOrgs = sfOrgListResult.nonScratchOrgs as any[];

  for (let i = 0; i < nonScratchOrgs.length; i++) {
    const nonScratchOrg = nonScratchOrgs[i];
    if (nonScratchOrg.alias === devHubAliasName && nonScratchOrg.username === devHubUserName) {
      return;
    }
  }

  throw new Error(
    `Error: matching devHub alias '${devHubAliasName}' and devHub user name '${devHubUserName}' was not found.\nPlease consult README.md and make sure DEV_HUB_ALIAS_NAME and DEV_HUB_USER_NAME are set correctly.`
  );
}

/**
 * Creates a default scratch org for testing
 * @param testSetup - The test setup configuration
 * @param edition - The edition of the scratch org to create (defaults to 'developer')
 * @throws Error if scratch org creation fails
 * @private
 */
async function createDefaultScratchOrg(testSetup: TestSetup, edition: OrgEdition = 'developer'): Promise<void> {
  log('');
  log(`${testSetup.testSuiteSuffixName} - Starting createDefaultScratchOrg()...`);

  const definitionFile = path.join(testSetup.projectFolderPath!, 'config', 'project-scratch-def.json');

  log(`${testSetup.testSuiteSuffixName} - constructing scratchOrgAliasName...`);
  // Org alias format: TempScratchOrg_yyyy_mm_dd_username_ticks_testSuiteSuffixName
  const currentDate = new Date();
  const day = currentDate.getDate().toString().padStart(2, '0');
  const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
  const year = currentDate.getFullYear();

  const currentOsUserName = transformedUserName();

  testSetup.scratchOrgAliasName = `TempScratchOrg_${year}_${month}_${day}_${currentOsUserName}_${currentDate.getTime()}_${testSetup.testSuiteSuffixName}`;
  log(`${testSetup.testSuiteSuffixName} - temporary scratch org name is ${testSetup.scratchOrgAliasName}...`);

  const startHr = process.hrtime();

  const sfOrgCreateResult = await scratchOrgCreate(edition, definitionFile, testSetup.scratchOrgAliasName, 1);
  log(`${testSetup.testSuiteSuffixName} - calling JSON.parse()...`);
  const result = JSON.parse(sfOrgCreateResult.stdout).result;

  const endHr = process.hrtime(startHr);
  const time = endHr[0] * 1_000_000_000 + endHr[1] - (startHr[0] * 1_000_000_000 + startHr[1]);

  log(`Creating ${testSetup.scratchOrgAliasName} took ${time} ticks (${time / 1_000.0} seconds)`);
  if (!result?.authFields?.accessToken || !result.orgId || !result.scratchOrgInfo.SignupEmail) {
    throw new Error(
      `In createDefaultScratchOrg(), result is missing required fields.\nAuth Fields: ${result.authFields}\nOrg ID: ${result.orgId}\nSign Up Email: ${result.scratchOrgInfo.SignupEmail}.`
    );
  }
  testSetup.scratchOrgId = result.orgId as string;

  // Run SFDX: Set a Default Org
  log(`${testSetup.testSuiteSuffixName} - selecting SFDX: Set a Default Org...`);

  await setDefaultOrg(testSetup.scratchOrgAliasName);

  await pause(Duration.seconds(3));

  // Look for the success notification.
  const successNotificationWasFound = await notificationIsPresentWithTimeout(
    /SFDX: Set a Default Org successfully ran/,
    Duration.TEN_MINUTES
  );
  if (!successNotificationWasFound) {
    throw new Error(
      'In createDefaultScratchOrg(), the notification of "SFDX: Set a Default Org successfully ran" was not found'
    );
  }

  // Look for this.scratchOrgAliasName in the list of status bar items.
  const scratchOrgStatusBarItem = await getStatusBarItemWhichIncludes(testSetup.scratchOrgAliasName);
  if (!scratchOrgStatusBarItem) {
    throw new Error(
      'In createDefaultScratchOrg(), getStatusBarItemWhichIncludes() returned a scratchOrgStatusBarItem with a value of null (or undefined)'
    );
  }

  log(`${testSetup.testSuiteSuffixName} - ...finished createDefaultScratchOrg()`);
  log('');
}

/**
 * Deletes scratch org information from the DevHub
 * @param testSetup - The test setup configuration
 * @throws Error if deletion fails
 */
export async function deleteScratchOrgInfo(testSetup: TestSetup): Promise<void> {
  if (testSetup.scratchOrgId) {
    const sfDataDeleteRecord = await runCliCommand(
      'data:delete:record',
      '--sobject',
      'ScratchOrgInfo',
      '--where',
      `ScratchOrg=${testSetup.scratchOrgId.slice(0, -3)}`,
      '--target-org',
      Env.getInstance().devHubAliasName
    );
    if (sfDataDeleteRecord.exitCode > 0) {
      const message = `data delete record failed with exit code ${sfDataDeleteRecord.exitCode}\n stderr ${sfDataDeleteRecord.stderr}`;
      log(message);
      throw new Error(message);
    }
  }
}
