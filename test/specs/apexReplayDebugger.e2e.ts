/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { step } from 'mocha-steps';
import path from 'path';
import { InputBox, QuickOpenBox, TextEditor, Key } from 'vscode-extension-tester';
import { TestSetup } from '../testSetup';
import * as utilities from '../utilities/index';
import { expect } from 'chai';
import { execSync } from "child_process";

describe('Apex Replay Debugger', async () => {
  let prompt: QuickOpenBox | InputBox;
  let testSetup: TestSetup;
  const testReqConfig: utilities.TestReqConfig = {
    projectConfig: {
      projectShape: utilities.ProjectShapeOption.NEW,
    },
    isOrgRequired: true,
    testSuiteSuffixName: 'ApexReplayDebugger'
  }

  step('Set up the testing environment', async () => {
    utilities.log(`ApexReplayDebugger - Set up the testing environment`);
    testSetup = await TestSetup.setUp(testReqConfig);

    // Create Apex class file
    await utilities.createApexClassWithTest('ExampleApexClass');

    // Push source to org
    await utilities.executeQuickPick(
      'SFDX: Push Source to Default Org and Ignore Conflicts',
      utilities.Duration.seconds(1)
    );

    let successPushNotificationWasFound;
    try {
      successPushNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
        'SFDX: Push Source to Default Org and Ignore Conflicts successfully ran',
        utilities.Duration.TEN_MINUTES
      );
      expect(successPushNotificationWasFound).to.equal(true);
    } catch (error) {
      await utilities.getWorkbench().openNotificationsCenter();
      successPushNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
        'SFDX: Push Source to Default Org and Ignore Conflicts successfully ran',
        utilities.Duration.ONE_MINUTE
      );
      expect(successPushNotificationWasFound).to.equal(true);
    }
  });

  step('Verify LSP finished indexing', async () => {
    utilities.log(`ApexReplayDebugger - Verify LSP finished indexing`);

    // Get Apex LSP Status Bar
    const statusBar = await utilities.getStatusBarItemWhichIncludes('Editor Language Status');
    await statusBar.click();
    expect(await statusBar.getAttribute('aria-label')).to.contain('Indexing complete');
  });

  step('SFDX: Turn On Apex Debug Log for Replay Debugger', async () => {
    utilities.log(`ApexReplayDebugger - SFDX: Turn On Apex Debug Log for Replay Debugger`);

    // Clear output before running the command
    await utilities.clearOutputView();

    // Run SFDX: Turn On Apex Debug Log for Replay Debugger
    await utilities.executeQuickPick(
      'SFDX: Turn On Apex Debug Log for Replay Debugger',
      utilities.Duration.seconds(10)
    );

    // Look for the success notification that appears which says, "SFDX: Turn On Apex Debug Log for Replay Debugger successfully ran".
    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      'SFDX: Turn On Apex Debug Log for Replay Debugger successfully ran',
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);

    // Verify content on vscode's Output section
    const outputPanelText = await utilities.attemptToFindOutputPanelText(
      'Salesforce CLI',
      'Starting SFDX: Turn On Apex Debug Log for Replay Debugger',
      10
    );
    expect(outputPanelText).not.to.be.undefined;
    expect(outputPanelText).to.contain('SFDX: Turn On Apex Debug Log for Replay Debugger ');
    expect(outputPanelText).to.contain('ended with exit code 0');
  });

  step('Run the Anonymous Apex Debugger with Currently Selected Text', async () => {
    utilities.log(`ApexReplayDebugger - Run the Anonymous Apex Debugger with Currently Selected Text`);

    // Get open text editor
    const workbench = utilities.getWorkbench();
    const textEditor = await utilities.getTextEditor(workbench, 'ExampleApexClassTest.cls');

    // Select text
    const findWidget = await textEditor.openFindWidget();
    await findWidget.setSearchText("ExampleApexClass.SayHello('Cody');");
    await utilities.pause(utilities.Duration.seconds(1));
    // Close finder tool
    await findWidget.close();
    await utilities.pause(utilities.Duration.seconds(1));

    // Clear output before running the command
    await utilities.clearOutputView();

    // Run SFDX: Launch Apex Replay Debugger with Currently Selected Text.
    await utilities.executeQuickPick(
      'SFDX: Execute Anonymous Apex with Currently Selected Text',
      utilities.Duration.seconds(1)
    );

    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      'Execute Anonymous Apex successfully ran',
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);

    // Verify content on vscode's Output section
    const outputPanelText = await utilities.attemptToFindOutputPanelText(
      'Apex',
      'Starting Execute Anonymous Apex',
      10
    );
    expect(outputPanelText).not.to.be.undefined;
    expect(outputPanelText).to.contain('Compiled successfully.');
    expect(outputPanelText).to.contain('Executed successfully.');
    expect(outputPanelText).to.contain('|EXECUTION_STARTED');
    expect(outputPanelText).to.contain('|EXECUTION_FINISHED');
    expect(outputPanelText).to.contain('ended Execute Anonymous Apex');
  });

  step('SFDX: Get Apex Debug Logs', async () => {
    utilities.log(`ApexReplayDebugger - SFDX: Get Apex Debug Logs`);

    // Run SFDX: Get Apex Debug Logs
    const workbench = utilities.getWorkbench();
    await utilities.clearOutputView();
    await utilities.pause(utilities.Duration.seconds(2));
    prompt = await utilities.executeQuickPick(
      'SFDX: Get Apex Debug Logs',
      utilities.Duration.seconds(10)
    );

    // Wait for the command to execute
    // await utilities.waitForNotificationToGoAway(
    //   'Getting Apex debug logs',
    //   utilities.Duration.TEN_MINUTES
    // );
    await utilities.pause(utilities.Duration.seconds(2));

    // Select a log file
    const quickPicks = await prompt.getQuickPicks();
    expect(quickPicks).not.to.be.undefined;
    expect(quickPicks.length).greaterThanOrEqual(0);
    await prompt.selectQuickPick('User User - Api');

    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      'SFDX: Get Apex Debug Logs successfully ran',
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);

    // Verify content on vscode's Output section
    const outputPanelText = await utilities.attemptToFindOutputPanelText(
      'Apex',
      'Starting SFDX: Get Apex Debug Logs',
      10
    );
    expect(outputPanelText).not.to.be.undefined;
    expect(outputPanelText).to.contain('|EXECUTION_STARTED');
    expect(outputPanelText).to.contain('|EXECUTION_FINISHED');
    expect(outputPanelText).to.contain('ended SFDX: Get Apex Debug Logs');

    // Verify content on log file
    await utilities.reloadWindow();
    const editorView = workbench.getEditorView();
    const activeTab = await editorView.getActiveTab();
    const title = await activeTab?.getTitle();
    const textEditor = (await editorView.openEditor(title!)) as TextEditor;
    const executionStarted = await textEditor.getLineOfText('|EXECUTION_STARTED');
    const executionFinished = await textEditor.getLineOfText('|EXECUTION_FINISHED');
    expect(executionStarted).greaterThanOrEqual(1);
    expect(executionFinished).greaterThanOrEqual(1);
  });

  xstep('SFDX: Launch Apex Replay Debugger with Last Log File', async () => {
    utilities.log(`ApexReplayDebugger - SFDX: Launch Apex Replay Debugger with Last Log File`);

    // Get open text editor
    const workbench = utilities.getWorkbench();
    const editorView = workbench.getEditorView();

    // Get file path from open text editor
    const activeTab = await editorView.getActiveTab();
    expect(activeTab).not.to.be.undefined;
    const title = await activeTab?.getTitle();
    console.log('*** title = ' + title);
    // TODO: `logFilePath` needs to be the full filepath starting with /Users/daphne.yang
    const currentDirectory = execSync(`pwd`).toString().slice(0, -1);
    const logFilePath = path.join(path.delimiter, currentDirectory, 'e2e-temp', 'TempProject-ApexReplayDebugger', '.sfdx', 'tools', 'debug', 'logs', title!).slice(1);
    console.log('*** logFilePath = ' + logFilePath);

    // TODO: THIS IS JUST FOR TESTING - the text is set correctly!
    // const textEditor = await utilities.getTextEditor(workbench, 'ExampleApexClass.cls');
    // await textEditor.setText(logFilePath);
    // await utilities.pause();

    // Run SFDX: Launch Apex Replay Debugger with Last Log File
    prompt = await utilities.executeQuickPick(
      'SFDX: Launch Apex Replay Debugger with Last Log File',
      utilities.Duration.seconds(1)
    );
    // TODO: Why is `/Users/daphne.yang/Development/salesforcedx-vscode-automation-tests-redhat/e2e-temp/TempProject-ApexReplayDebugger/.sfdx/` being set?  What happens to the remaining part of the filepath?
    await prompt.setText(logFilePath);
    await prompt.confirm();
    await utilities.pause();

    // Continue with the debug session
    await utilities.continueDebugging(2, 30);
  });

  step('SFDX: Launch Apex Replay Debugger with Current File - log file', async () => {
    utilities.log(`ApexReplayDebugger - SFDX: Launch Apex Replay Debugger with Current File - log file`);

    // Run SFDX: Launch Apex Replay Debugger with Current File
    await utilities.executeQuickPick(
      'SFDX: Launch Apex Replay Debugger with Current File',
      utilities.Duration.seconds(3)
    );

    // Continue with the debug session
    await utilities.continueDebugging(2, 30);
  });

  step('SFDX: Launch Apex Replay Debugger with Current File - test class', async () => {
    utilities.log(`ApexReplayDebugger - SFDX: Launch Apex Replay Debugger with Current File - test class`);

    // Run SFDX: Launch Apex Replay Debugger with Current File
    const workbench = utilities.getWorkbench();
    await utilities.getTextEditor(workbench, 'ExampleApexClassTest.cls');
    await utilities.executeQuickPick(
      'SFDX: Launch Apex Replay Debugger with Current File',
      utilities.Duration.seconds(3)
    );

    // Continue with the debug session
    await utilities.continueDebugging(2, 30);

    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      'Debug Test(s) successfully ran',
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);
  });

  step('Run the Anonymous Apex Debugger using the Command Palette', async () => {
    utilities.log(`ApexReplayDebugger - Run the Anonymous Apex Debugger using the Command Palette`);

    // Create anonymous apex file
    await utilities.createAnonymousApexFile();

    // Clear output before running the command
    await utilities.clearOutputView();

    // Run SFDX: Launch Apex Replay Debugger with Editor Contents", using the Command Palette.
    await utilities.executeQuickPick(
      'SFDX: Execute Anonymous Apex with Editor Contents',
      utilities.Duration.seconds(10)
    );

    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      'Execute Anonymous Apex successfully ran',
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);

    // Verify content on vscode's Output section
    const outputPanelText = await utilities.attemptToFindOutputPanelText(
      'Apex',
      'Starting Execute Anonymous Apex',
      10
    );
    expect(outputPanelText).not.to.be.undefined;
    expect(outputPanelText).to.contain('Compiled successfully.');
    expect(outputPanelText).to.contain('Executed successfully.');
    expect(outputPanelText).to.contain('|EXECUTION_STARTED');
    expect(outputPanelText).to.contain('|EXECUTION_FINISHED');
    expect(outputPanelText).to.contain('ended Execute Anonymous Apex');
  });

  step('SFDX: Turn Off Apex Debug Log for Replay Debugger', async () => {
    utilities.log(`ApexReplayDebugger - SFDX: Turn Off Apex Debug Log for Replay Debugger`);

    // Run SFDX: Turn Off Apex Debug Log for Replay Debugger
    await utilities.clearOutputView();
    prompt = await utilities.executeQuickPick(
      'SFDX: Turn Off Apex Debug Log for Replay Debugger',
      utilities.Duration.seconds(1)
    );

    // Look for the success notification that appears which says, "SFDX: Turn Off Apex Debug Log for Replay Debugger successfully ran".
    const successNotificationWasFound = await utilities.notificationIsPresentWithTimeout(
      'SFDX: Turn Off Apex Debug Log for Replay Debugger successfully ran',
      utilities.Duration.TEN_MINUTES
    );
    expect(successNotificationWasFound).to.equal(true);

    // Verify content on vscode's Output section
    const outputPanelText = await utilities.attemptToFindOutputPanelText(
      'Salesforce CLI',
      'Starting SFDX: Turn Off Apex Debug Log for Replay Debugger',
      10
    );
    expect(outputPanelText).not.to.be.undefined;
    expect(outputPanelText).to.contain('Deleting Record...');
    expect(outputPanelText).to.contain('Success');
    expect(outputPanelText).to.contain('Successfully deleted record:');
    expect(outputPanelText).to.contain('ended with exit code 0');
  });

  after('Tear down and clean up the testing environment', async () => {
    utilities.log(`ApexReplayDebugger - Tear down and clean up the testing environment`);
    await testSetup?.tearDown();
  });

  // const continueDebugging = async (): Promise<void> => {
  //   // TODO: why isn't the input box created in the log file?
  //   const inputBox = await InputBox.create();
  //   await inputBox.sendKeys(CONTINUE);
  //   await utilities.pause(utilities.Duration.seconds(1));
  //   await inputBox.sendKeys(CONTINUE);
  //   await utilities.pause(utilities.Duration.seconds(1));
  // };
});
