/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as utilities from './index';
import path from 'path';
import fs from 'fs';
import { EnvironmentSettings as Env } from '../environmentSettings';
import { TestSetup } from '../testSetup';
import { expect } from 'chai';

export async function setUpScratchOrg(testSetup: TestSetup) {
  await authorizeDevHub(testSetup);
  await createDefaultScratchOrg();
}

export async function authorizeDevHub(testSetup: TestSetup): Promise<void> {
  utilities.log('');
  utilities.log(`${testSetup.testSuiteSuffixName} - Starting authorizeDevHub()...`);

  // Only need to check this once.
  if (!testSetup.aliasAndUserNameWereVerified) {
    await verifyAliasAndUserName();
    testSetup.aliasAndUserNameWereVerified = true;
  }

  // This is essentially the "SFDX: Authorize a Dev Hub" command, but using the CLI and an auth file instead of the UI.
  const authFilePath = path.join(testSetup.projectFolderPath!, 'authFile.json');
  utilities.log(`${testSetup.testSuiteSuffixName} - calling sf org:display...`);
  const sfOrgDisplayResult = await utilities.orgDisplay(Env.getInstance().devHubUserName);

  // Now write the file.
  fs.writeFileSync(authFilePath, sfOrgDisplayResult.stdout);
  utilities.log(`${testSetup.testSuiteSuffixName} - finished writing the file...`);

  // Call org:login:sfdx-url and read in the JSON that was just created.
  utilities.log(`${testSetup.testSuiteSuffixName} - calling sf org:login:sfdx-url...`);
  await utilities.orgLoginSfdxUrl(authFilePath);

  utilities.log(`${testSetup.testSuiteSuffixName} - ...finished authorizeDevHub()`);
  utilities.log('');
}

// verifyAliasAndUserName() verifies that the alias and user name are set,
// and also verifies there is a corresponding match in the org list.
async function verifyAliasAndUserName() {
  const environmentSettings = Env.getInstance();

  const devHubAliasName = environmentSettings.devHubAliasName;
  if (!devHubAliasName) {
    throw new Error('Error: devHubAliasName was not set.');
  }

  const devHubUserName = environmentSettings.devHubUserName;
  if (!devHubUserName) {
    throw new Error('Error: devHubUserName was not set.');
  }

  const execResult = await utilities.orgList();
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

export async function createDefaultScratchOrg(): Promise<string> {
  const prompt = await utilities.executeQuickPick(
    'SFDX: Create a Default Scratch Org...',
    utilities.Duration.seconds(1)
  );

  // Select a project scratch definition file (config/project-scratch-def.json)
  await prompt.confirm();

  // Enter an org alias - yyyy-mm-dd-username-ticks
  const currentDate = new Date();
  const ticks = currentDate.getTime();
  const day = ('0' + currentDate.getDate()).slice(-2);
  const month = ('0' + (currentDate.getMonth() + 1)).slice(-2);
  const year = currentDate.getFullYear();
  const currentOsUserName = utilities.transformedUserName();
  const scratchOrgAliasName = `TempScratchOrg_${year}_${month}_${day}_${currentOsUserName}_${ticks}_OrgAuth`;

  await prompt.setText(scratchOrgAliasName);
  await utilities.pause(utilities.Duration.seconds(1));

  // Press Enter/Return.
  await prompt.confirm();

  // Enter the number of days.
  await prompt.setText('1');
  await utilities.pause(utilities.Duration.seconds(1));

  // Press Enter/Return.
  await prompt.confirm();

  const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
    /SFDX: Create a Default Scratch Org\.\.\. successfully ran/,
    utilities.Duration.TEN_MINUTES
  );
  if (successNotificationWasFound !== true) {
    const failureNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      /SFDX: Create a Default Scratch Org\.\.\. failed to run/,
      utilities.Duration.TEN_MINUTES
    );
    if (failureNotificationWasFound === true) {
      if (
        await utilities.attemptToFindOutputPanelText(
          'Salesforce CLI',
          'organization has reached its daily scratch org signup limit',
          5
        )
      ) {
        // This is a known issue...
        utilities.log('Warning - creating the scratch org failed, but the failure was due to the daily signup limit');
      } else if (await utilities.attemptToFindOutputPanelText('Salesforce CLI', 'is enabled as a Dev Hub', 5)) {
        // This is a known issue...
        utilities.log('Warning - Make sure that the org is enabled as a Dev Hub.');
        utilities.log(
          'Warning - To enable it, open the org in your browser, navigate to the Dev Hub page in Setup, and click Enable.'
        );
        utilities.log(
          'Warning - If you still see this error after enabling the Dev Hub feature, then re-authenticate to the org.'
        );
      } else {
        // The failure notification is showing, but it's not due to maxing out the daily limit.  What to do...?
        utilities.log('Warning - creating the scratch org failed... not sure why...');
      }
    } else {
      utilities.log(
        'Warning - creating the scratch org failed... neither the success notification or the failure notification was found.'
      );
    }
  }
  expect(successNotificationWasFound).to.equal(true);

  // Look for the org's alias name in the list of status bar items.
  const scratchOrgStatusBarItem = await utilities.getStatusBarItemWhichIncludes(scratchOrgAliasName);
  expect(scratchOrgStatusBarItem).to.not.be.undefined;
  return scratchOrgAliasName;
}

export async function deleteScratchOrgInfo(testSetup: TestSetup): Promise<void> {
  if (testSetup.scratchOrgId) {
    const sfDataDeleteRecord = await utilities.runCliCommand(
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
      utilities.log(message);
      throw new Error(message);
    }
  }
}
