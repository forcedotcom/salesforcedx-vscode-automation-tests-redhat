/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { step } from 'mocha-steps';
import { By, InputBox, after } from 'vscode-extension-tester';
import { EnvironmentSettings } from '../environmentSettings';
import { TestSetup } from '../testSetup';
import * as utilities from '../utilities/index';
import { expect } from 'chai';

describe('Authentication', async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let projectFolderPath: string;
  let scratchOrgAliasName: string;
  let testSetup: TestSetup;
  const testReqConfig: utilities.TestReqConfig = {
    projectConfig: {
      projectShape: utilities.ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    testSuiteSuffixName: 'Authentication'
  };

  step('Set up the testing environment', async () => {
    testSetup = await TestSetup.setUp(testReqConfig);
    projectFolderPath = testSetup.projectFolderPath!;
  });

  step('Run SFDX: Authorize a Dev Hub', async () => {
    // In the initial state, the org picker button should be set to "No Default Org Set".
    let noDefaultOrgSetItem = await utilities.getStatusBarItemWhichIncludes('No Default Org Set');
    expect(noDefaultOrgSetItem).to.not.be.undefined;

    // This is essentially the "SFDX: Authorize a Dev Hub" command, but using the CLI and an auth file instead of the UI.
    await utilities.authorizeDevHub(testSetup);
  });

  step('Run SFDX: Set a Default Org', async () => {
    // This is "SFDX: Set a Default Org", using the button in the status bar.
    // Could also run the command, "SFDX: Set a Default Org" but this exercises more UI elements.

    // Click on "No default Org Set" (in the bottom bar).
    const workbench = await utilities.getWorkbench();
    const changeDefaultOrgSetItem = await utilities.getStatusBarItemWhichIncludes('No Default Org Set');
    expect(changeDefaultOrgSetItem).to.not.be.undefined;
    await changeDefaultOrgSetItem.click();
    await utilities.pause(utilities.Duration.seconds(5));

    const orgPickerOptions = await workbench.findElements(
      By.css(
        'div.monaco-list#quickInput_list > div.monaco-scrollable-element > div.monaco-list-rows > div.monaco-list-row'
      )
    );
    // In the drop down menu that appears, verify the SFDX auth org commands are present...
    const expectedSfdxCommands = [
      ' SFDX: Authorize an Org',
      ' SFDX: Authorize a Dev Hub',
      ' SFDX: Create a Default Scratch Org...',
      ' SFDX: Authorize an Org using Session ID',
      ' SFDX: Remove Deleted and Expired Orgs'
    ];
    const foundSfdxCommands: string[] = [];
    for (const quickPick of orgPickerOptions) {
      const label = (await quickPick.getAttribute('aria-label')).slice(5);
      if (expectedSfdxCommands.includes(label)) {
        foundSfdxCommands.push(label);
      }
    }

    if (expectedSfdxCommands.length !== foundSfdxCommands.length) {
      // Something is wrong - the count of matching menus isn't what we expected.
      expectedSfdxCommands.forEach(async expectedSfdxCommand => {
        expect(foundSfdxCommands).to.contain(expectedSfdxCommand);
      });
    }

    // In the drop down menu that appears, select "vscodeOrg - user_name".
    const environmentSettings = EnvironmentSettings.getInstance();
    const devHubAliasName = environmentSettings.devHubAliasName;
    const devHubUserName = environmentSettings.devHubUserName;
    const inputBox = await InputBox.create();
    const item = await inputBox.selectQuickPick(`${devHubAliasName} - ${devHubUserName}`);

    // Need to pause here for the "set a default org" command to finish.
    await utilities.pause(utilities.Duration.seconds(5));

    // Look for the notification that appears which says, "SFDX: Set a Default Org successfully ran".
    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      /SFDX: Set a Default Org successfully ran/,
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);

    const expectedOutputWasFound = await utilities.attemptToFindOutputPanelText(
      'Salesforce CLI',
      `target-org  ${devHubAliasName}  true`,
      5
    );
    expect(expectedOutputWasFound).to.not.be.undefined;

    // Look for "vscodeOrg" in the status bar.
    const statusBar = workbench.getStatusBar();
    const vscodeOrgItem = await statusBar.getItem(`plug  ${devHubAliasName}, Change Default Org`);
    expect(vscodeOrgItem).to.not.be.undefined;
  });

  step('Run SFDX: Create a Default Scratch Org', async () => {
    scratchOrgAliasName = await utilities.createDefaultScratchOrg();
  });

  step('Run SFDX: Set the Scratch Org As the Default Org', async () => {
    const inputBox = await utilities.executeQuickPick('SFDX: Set a Default Org', utilities.Duration.seconds(10));

    const scratchOrgQuickPickItemWasFound = await utilities.findQuickPickItem(
      inputBox,
      scratchOrgAliasName,
      false,
      true
    );
    expect(scratchOrgQuickPickItemWasFound).to.equal(true);

    await utilities.pause(utilities.Duration.seconds(3));

    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      /SFDX: Set a Default Org successfully ran/,
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);

    // Look for the org's alias name in the list of status bar items.
    const scratchOrgStatusBarItem = await utilities.getStatusBarItemWhichIncludes(scratchOrgAliasName);
    expect(scratchOrgStatusBarItem).to.not.be.undefined;
  });

  after('Tear down and clean up the testing environment', async () => {
    await testSetup?.tearDown();
  });
});
