/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { executeQuickPick } from '../ui-interaction/commandPrompt';
import { Duration, log, pause } from '../core/miscellaneous';
import { getTextEditor, overrideTextInFile } from '../ui-interaction/textEditorView';
import { getWorkbench } from '../ui-interaction/workbench';

/**
 * Creates a Visualforce page named 'FooPage' with a controller reference
 * The page includes a simple form with an account name input field and save button
 */
export async function createVisualforcePage(): Promise<void> {
  log(`calling createVisualforcePage()`);

  // Using the Command palette, run SFDX: Create Visualforce Page
  const inputBox = await executeQuickPick('SFDX: Create Visualforce Page');

  // Set the name of the new Visualforce Page
  await inputBox.setText('FooPage');
  await inputBox.confirm();
  await inputBox.confirm();
  await pause(Duration.seconds(1));

  // Modify page content
  const workbench = getWorkbench();
  const textEditor = await getTextEditor(workbench, 'FooPage.page');
  const pageText = [
    `<apex:page controller="myController" tabStyle="Account">`,
    `\t<apex:form>`,
    `\t`,
    `\t\t<apex:pageBlock title="Congratulations {!$User.FirstName}">`,
    `\t\t\tYou belong to Account Name: <apex:inputField value="{!account.name}"/>`,
    `\t\t\t<apex:commandButton action="{!save}" value="save"/>`,
    `\t\t</apex:pageBlock>`,
    `\t</apex:form>`,
    `</apex:page>`
  ].join('\n');
  await overrideTextInFile(textEditor, pageText);
  await pause(Duration.seconds(1));
}
