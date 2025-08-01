/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import fs from 'fs/promises';
import { join } from 'path';
import { Duration, log, pause } from '../core/miscellaneous';
import { getTextEditor } from '../ui-interaction/textEditorView';
import { getWorkbench } from '../ui-interaction/workbench';
import { createOrOverwriteFile } from '../system-operations/fileSystem';

/**
 * Creates a Visualforce page named 'FooPage' with a controller reference
 * The page includes a simple form with an account name input field and save button
 */
export async function createVisualforcePage(folder: string): Promise<void> {
  log(`calling createVisualforcePage()`);

  // Define the page content
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

  // Define metadata content
  const metaContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<ApexPage xmlns="http://soap.sforce.com/2006/04/metadata">`,
    `    <apiVersion>64.0</apiVersion>`,
    `    <availableInTouch>false</availableInTouch>`,
    `    <confirmationTokenRequired>false</confirmationTokenRequired>`,
    `    <label>FooPage</label>`,
    `</ApexPage>`
  ].join('\n');

  // Create the file paths
  const filePath = join(folder, 'FooPage.page');
  const metaFilePath = join(folder, 'FooPage.page-meta.xml');

  try {
    // Ensure the folder exists before writing files
    await fs.mkdir(folder, { recursive: true });

    // Write the Visualforce page file using fs.writeFile
    createOrOverwriteFile(filePath, pageText);
    log(`Visualforce page FooPage.page created successfully at ${filePath}`);

    // Write the metadata file using fs.writeFile
    createOrOverwriteFile(metaFilePath, metaContent);
    log(`Visualforce page metadata FooPage.page-meta.xml created successfully at ${metaFilePath}`);
  } catch (error) {
    log(`Error creating Visualforce page FooPage: ${error}`);
    throw error;
  }

  // Open the file in the text editor
  await pause(Duration.seconds(1));
  const workbench = getWorkbench();
  await getTextEditor(workbench, 'FooPage.page');
  await pause(Duration.seconds(1));
}
