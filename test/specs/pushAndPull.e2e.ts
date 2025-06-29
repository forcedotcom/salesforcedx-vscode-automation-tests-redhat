/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { expect } from 'chai';
import { step } from 'mocha-steps';
import path from 'path';
import { after } from 'vscode-extension-tester';
import { TestSetup } from '../testSetup';
import * as utilities from '../utilities/index';

describe('Push and Pull', () => {
  let projectName = '';
  let testSetup1: TestSetup;
  let testSetup2: TestSetup;
  const testReqConfig: utilities.TestReqConfig = {
    projectConfig: {
      projectShape: utilities.ProjectShapeOption.NEW
    },
    isOrgRequired: true,
    testSuiteSuffixName: 'PushAndPull'
  };

  step('Set up the testing environment', async () => {
    utilities.log(`Push And Pull - Set up the testing environment`);
    testSetup1 = await TestSetup.setUp(testReqConfig);
    projectName = testSetup1.tempProjectName;
  });

  step('SFDX: View All Changes (Local and in Default Org)', async () => {
    utilities.log(`Push And Pull - SFDX: View All Changes (Local and in Default Org)`);
    await utilities.executeQuickPick(
      'SFDX: View All Changes (Local and in Default Org)',
      utilities.Duration.seconds(5)
    );

    // Check the output.
    const outputPanelText = await utilities.attemptToFindOutputPanelText(`Salesforce CLI`, `Source Status`, 10);
    expect(outputPanelText).to.contain('No local or remote changes found');
  });

  step('Create an Apex class', async () => {
    utilities.log(`Push And Pull - Create an Apex class`);
    // Create an Apex Class.
    await utilities.createCommand('Apex Class', 'ExampleApexClass1', 'classes', 'cls');
  });

  step('SFDX: View Local Changes', async () => {
    utilities.log(`Push And Pull - SFDX: View Local Changes`);
    await utilities.executeQuickPick('SFDX: View Local Changes', utilities.Duration.seconds(5));

    // Check the output.
    const outputPanelText = await utilities.attemptToFindOutputPanelText(`Salesforce CLI`, `Source Status`, 10);
    expect(outputPanelText).to.contain(
      `Local Add  ExampleApexClass1  ApexClass  ${path.join('force-app', 'main', 'default', 'classes', 'ExampleApexClass1.cls')}`
    );
    expect(outputPanelText).to.contain(
      `Local Add  ExampleApexClass1  ApexClass  ${path.join('force-app', 'main', 'default', 'classes', 'ExampleApexClass1.cls-meta.xml')}`
    );
  });

  step('Push the Apex class', async () => {
    utilities.log(`Push And Pull - Push the Apex class`);
    await utilities.executeQuickPick('SFDX: Push Source to Default Org', utilities.Duration.seconds(5));

    await verifyPushSuccess();
    // Check the output.
    await verifyPushAndPullOutputText('Push', 'to', 'Created');
  });

  step('Push again (with no changes)', async () => {
    utilities.log(`Push And Pull - Push again (with no changes)`);
    // Clear the Output view first.
    await utilities.clearOutputView(utilities.Duration.seconds(2));

    // Now push
    await utilities.executeQuickPick('SFDX: Push Source to Default Org', utilities.Duration.seconds(5));

    await verifyPushSuccess();
    // Check the output.
    await verifyPushAndPullOutputText('Push', 'to');
  });

  step('Modify the file and push the changes', async () => {
    utilities.log(`Push And Pull - Modify the file and push the changes`);
    // Clear the Output view first.
    await utilities.clearOutputView(utilities.Duration.seconds(2));

    // Modify the file by adding a comment.
    const workbench = utilities.getWorkbench();
    const textEditor = await utilities.getTextEditor(workbench, 'ExampleApexClass1.cls');
    await textEditor.setTextAtLine(3, '        // sample comment');

    // Push the file.
    await utilities.executeQuickPick('SFDX: Push Source to Default Org', utilities.Duration.seconds(5));

    await verifyPushSuccess();
    // Check the output.
    await verifyPushAndPullOutputText('Push', 'to');

    // Clear the Output view again.
    await utilities.clearOutputView(utilities.Duration.seconds(2));

    // Now save the file.
    await textEditor.save();

    // An now push the changes.
    await utilities.executeQuickPick('SFDX: Push Source to Default Org', utilities.Duration.seconds(5));

    await verifyPushSuccess();
    // Check the output.
    const outputPanelText = await verifyPushAndPullOutputText('Push', 'to', 'Changed');

    expect(outputPanelText).to.contain(
      path.join(
        'e2e-temp',
        'TempProject-PushAndPull',
        'force-app',
        'main',
        'default',
        'classes',
        'ExampleApexClass1.cls'
      )
    );
    expect(outputPanelText).to.contain(
      path.join(
        'e2e-temp',
        'TempProject-PushAndPull',
        'force-app',
        'main',
        'default',
        'classes',
        'ExampleApexClass1.cls-meta.xml'
      )
    );
  });

  step('Pull the Apex class', async () => {
    utilities.log(`Push And Pull - Pull the Apex class`);
    // With this test, it's going to pull twice...
    // Clear the Output view first.
    await utilities.clearOutputView(utilities.Duration.seconds(2));

    await utilities.executeQuickPick('SFDX: Pull Source from Default Org', utilities.Duration.seconds(5));
    // At this point there should be no conflicts since there have been no changes.
    await verifyPullSuccess();
    // Check the output.
    let outputPanelText = await verifyPushAndPullOutputText('Pull', 'from', 'Created');
    // The first time a pull is performed, force-app/main/default/profiles/Admin.profile-meta.xml is pulled down.
    expect(outputPanelText).to.contain(path.join('force-app', 'main', 'default', 'profiles', 'Admin.profile-meta.xml'));

    // Second pull...
    // Clear the output again.
    await utilities.clearOutputView(utilities.Duration.seconds(2));

    // And pull again.
    await utilities.executeQuickPick('SFDX: Pull Source from Default Org', utilities.Duration.seconds(5));
    await verifyPullSuccess();
    // Check the output.
    outputPanelText = await verifyPushAndPullOutputText('Pull', 'from');
    expect(outputPanelText).to.not.contain('Created  Admin');
  });

  step("Modify the file (but don't save), then pull", async () => {
    utilities.log(`Push And Pull - Modify the file (but don't save), then pull`);
    // Clear the Output view first.
    await utilities.clearOutputView(utilities.Duration.seconds(2));

    // Modify the file by adding a comment.
    const workbench = utilities.getWorkbench();
    const textEditor = await utilities.getTextEditor(workbench, 'ExampleApexClass1.cls');
    await textEditor.setTextAtLine(3, '        // sample comment for the pull test');
    // Don't save the file just yet.

    // Pull the file.
    await utilities.executeQuickPick('SFDX: Pull Source from Default Org', utilities.Duration.seconds(5));
    await verifyPullSuccess();
    // Check the output.
    await verifyPushAndPullOutputText('Pull', 'from');
  });

  step('Save the modified file, then pull', async () => {
    utilities.log(`Push And Pull - Save the modified file, then pull`);
    // Clear the Output view first.
    await utilities.clearOutputView(utilities.Duration.seconds(2));

    // Now save the file.
    const workbench = utilities.getWorkbench();
    const textEditor = await utilities.getTextEditor(workbench, 'ExampleApexClass1.cls');
    await textEditor.save();

    // An now pull the changes.
    await utilities.executeQuickPick('SFDX: Pull Source from Default Org', utilities.Duration.seconds(5));
    await verifyPullSuccess();
    // Check the output.
    await verifyPushAndPullOutputText('Pull', 'from');
  });

  const testReqConfig2: utilities.TestReqConfig = {
    projectConfig: {
      projectShape: utilities.ProjectShapeOption.NEW
    },
    isOrgRequired: false,
    testSuiteSuffixName: 'ViewChanges'
  };

  step('SFDX: View Changes in Default Org', async () => {
    utilities.log(`Push And Pull - SFDX: View Changes in Default Org`);
    // Create second Project to then view Remote Changes
    // The new project will connect to the scratch org automatically on GHA, but does not work locally
    testSetup2 = await TestSetup.setUp(testReqConfig2);
    await utilities.runCliCommand('config set', `target-org=${testSetup1.scratchOrgAliasName}`);

    // Run SFDX: View Changes in Default Org command to view remote changes
    await utilities.executeQuickPick('SFDX: View Changes in Default Org', utilities.Duration.seconds(5));

    // Reload window to update cache
    await utilities.reloadWindow(utilities.Duration.seconds(20));

    // Run SFDX: View Changes in Default Org command to view remote changes
    await utilities.executeQuickPick('SFDX: View Changes in Default Org', utilities.Duration.seconds(5));

    // Check the output.
    const outputPanelText = await utilities.attemptToFindOutputPanelText(`Salesforce CLI`, `Source Status`, 10);
    expect(outputPanelText).to.not.be.undefined;
    expect(outputPanelText).to.contain(`Remote Add  ExampleApexClass1  ApexClass`);
  });

  // TODO: at this point write e2e tests for conflict detection
  // but there's a bug - when the 2nd user is created the code thinks
  // it's a source tracked org and push & pull are no longer available
  // (yet deploy & retrieve are).  Spoke with Ken and we think this will
  // be fixed with the check in of his PR this week.

  after('Tear down and clean up the testing environment', async () => {
    utilities.log('Push and Pull - Tear down and clean up the testing environment');
    await testSetup1?.tearDown(false);
    await testSetup2?.tearDown();
  });

  /**
   * @param operation identifies if it's a pull or push operation
   * @param fromTo indicates if changes are coming from or going to the org
   * @param type indicates if the metadata is expected to have been created, changed or deleted
   * @returns the output panel text after
   */
  const verifyPushAndPullOutputText = async (
    operation: string,
    fromTo: string,
    type?: string
  ): Promise<string | undefined> => {
    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      new RegExp(`SFDX: ${operation} Source ${fromTo} Default Org successfully ran`),
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);
    // Check the output.
    const outputPanelText = await utilities.attemptToFindOutputPanelText(
      `Salesforce CLI`,
      `=== ${operation}ed Source`,
      10
    );
    expect(outputPanelText).to.not.be.undefined;

    if (type) {
      if (operation === 'Push') {
        expect(outputPanelText).to.contain(`${type}  ExampleApexClass1  ApexClass`);
      } else {
        expect(outputPanelText).to.contain(`${type}  Admin`);
      }
    } else {
      expect(outputPanelText).to.contain('No results found');
    }
    expect(outputPanelText).to.contain('ended with exit code 0');
    return outputPanelText;
  };
});

async function verifyPushSuccess(wait = utilities.Duration.TEN_MINUTES) {
  const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
    /SFDX: Push Source to Default Org successfully ran/,
    wait
  );
  expect(successNotificationWasFound).to.equal(true);
}

async function verifyPullSuccess(wait = utilities.Duration.TEN_MINUTES) {
  const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
    /SFDX: Pull Source from Default Org successfully ran/,
    wait
  );
  expect(successNotificationWasFound).to.equal(true);
}
