/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { Duration, log, openFile, pause } from '../core/miscellaneous';
import { getWorkbench } from '../ui-interaction/workbench';
import { getTextEditor } from '../ui-interaction/textEditorView';
import { createFolder, createOrOverwriteFile } from '../system-operations/fileSystem';

/**
 * Creates an Apex class with the specified name and content
 * @param name - The name of the Apex class to create
 * @param classText - The content of the Apex class
 * @param breakpoint - Optional line number where a breakpoint should be set
 */
export async function createApexClass(name: string, folder: string, classText?: string, breakpoint?: number): Promise<void> {
  log(`calling createApexClass(${name})`);

  // Use provided classText or default template
  const content = classText || [
    `public with sharing class ${name} {`,
    `\tpublic ${name}() {`,
    ``,
    `\t}`,
    `}`
  ].join('\n');

  // Define metadata content
  const metaContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">`,
    `    <apiVersion>64.0</apiVersion>`,
    `    <status>Active</status>`,
    `</ApexClass>`
  ].join('\n');

  // Create the file paths (assuming we're in a Salesforce project structure)
  const filePath = join(folder, `${name}.cls`);
  const metaFilePath = join(folder, `${name}.cls-meta.xml`);

  try {
    // Ensure the folder exists before writing files
    createFolder(folder);

    // Write the Apex class file using fs.writeFile
    createOrOverwriteFile(filePath, content);
    log(`Apex Class ${name} created successfully at ${filePath}`);

    // Write the metadata file using fs.writeFile
    createOrOverwriteFile(metaFilePath, metaContent);
    log(`Apex Class metadata ${name}.cls-meta.xml created successfully at ${metaFilePath}`);
  } catch (error) {
    log(`Error creating Apex Class ${name}: ${error}`);
    throw error;
  }

  // Open the file in the text editor
  await pause(Duration.seconds(1));
  await openFile(filePath);

  // Handle breakpoint if specified
  if (breakpoint) {
    const workbench = getWorkbench();
    const textEditor = await getTextEditor(workbench, name + '.cls');
    log('createApexClass() - Setting breakpoints');
    await pause(Duration.seconds(5)); // wait for file to be saved and loaded

    log(`createApexClass() - Set breakpoint ${breakpoint}`);
    await textEditor.toggleBreakpoint(breakpoint);
  }

  await pause(Duration.seconds(1));
  log(`Apex Class ${name} modified successfully.`);
}

/**
 * Creates an Apex class and its corresponding test class
 * @param name - The name of the Apex class (test class will be named [name]Test)
 */
export async function createApexClassWithTest(name: string, folder: string): Promise<void> {
  log(`calling createApexClassWithTest()`);
  const classText = [
    `public with sharing class ${name} {`,
    `\tpublic static void SayHello(string name){`,
    `\t\tSystem.debug('Hello, ' + name + '!');`,
    `\t}`,
    `}`
  ].join('\n');
  await createApexClass(name, folder, classText, 3);

  const testText = [
    `@IsTest`,
    `public class ${name}Test {`,
    `\t@IsTest`,
    `\tstatic void validateSayHello() {`,
    `\t\tSystem.debug('Starting validate');`,
    `\t\t${name}.SayHello('Cody');`,
    ``,
    `\t\tSystem.assertEquals(1, 1, 'all good');`,
    `\t}`,
    `}`
  ].join('\n');
  await createApexClass(name + 'Test', folder, testText, 6);
}

/**
 * Creates an Account service Apex class with a bug and its corresponding test class
 * The bug is that the TickerSymbol is set to accountNumber instead of tickerSymbol
 */
export async function createApexClassWithBugs(folder: string): Promise<void> {
  log(`calling createApexClassWithBugs()`);
  const classText = [
    `public with sharing class AccountService {`,
    `\tpublic Account createAccount(String accountName, String accountNumber, String tickerSymbol) {`,
    `\t\tAccount newAcct = new Account(`,
    `\t\t\tName = accountName,`,
    `\t\t\tAccountNumber = accountNumber,`,
    `\t\t\tTickerSymbol = accountNumber`,
    `\t\t);`,
    `\t\treturn newAcct;`,
    `\t}`,
    `}`
  ].join('\n');
  await createApexClass('AccountService', folder, classText);

  const testText = [
    `@IsTest`,
    `private class AccountServiceTest {`,
    `\t@IsTest`,
    `\tstatic void should_create_account() {`,
    `\t\tString acctName = 'Salesforce';`,
    `\t\tString acctNumber = 'SFDC';`,
    `\t\tString tickerSymbol = 'CRM';`,
    `\t\tTest.startTest();`,
    `\t\tAccountService service = new AccountService();`,
    `\t\tAccount newAcct = service.createAccount(acctName, acctNumber, tickerSymbol);`,
    `\t\tinsert newAcct;`,
    `\t\tTest.stopTest();`,
    `\t\tList<Account> accts = [ SELECT Id, Name, AccountNumber, TickerSymbol FROM Account WHERE Id = :newAcct.Id ];`,
    `\t\tSystem.assertEquals(1, accts.size(), 'should have found new account');`,
    `\t\tSystem.assertEquals(acctName, accts[0].Name, 'incorrect name');`,
    `\t\tSystem.assertEquals(acctNumber, accts[0].AccountNumber, 'incorrect account number');`,
    `\t\tSystem.assertEquals(tickerSymbol, accts[0].TickerSymbol, 'incorrect ticker symbol');`,
    `\t}`,
    `}`
  ].join('\n');
  await createApexClass('AccountServiceTest', folder, testText);
}

/**
 * Creates an anonymous Apex file with a simple debug statement
 */
export async function createAnonymousApexFile(folder: string): Promise<void> {
  log(`calling createAnonymousApexFile()`);

  // Define the file content
  const fileContent = ["System.debug('¡Hola mundo!');", ''].join('\n');

  // Create the file path in the project root
  const filePath = join(folder, 'Anonymous.apex');

  try {
    // Write the Anonymous Apex file using fs.writeFile
    createOrOverwriteFile(filePath, fileContent);
    log(`Anonymous Apex file created successfully at ${filePath}`);
  } catch (error) {
    log(`Error creating Anonymous Apex file: ${error}`);
    throw error;
  }

  // Open the file in the text editor
  await pause(Duration.seconds(1));
  await openFile(filePath);

  await pause(Duration.seconds(1));
}

/**
 * Creates an Apex controller class for Visualforce pages
 */
export async function createApexController(folder: string): Promise<void> {
  log(`calling createApexController()`);
  const classText = [
    `public class MyController {`,
    `\tprivate final Account account;`,
    `\tpublic MyController() {`,
    `\t\taccount = [SELECT Id, Name, Phone, Site FROM Account `,
    `\t\tWHERE Id = :ApexPages.currentPage().getParameters().get('id')];`,
    `\t}`,
    `\tpublic Account getAccount() {`,
    `\t\treturn account;`,
    `\t}`,
    `\tpublic PageReference save() {`,
    `\t\tupdate account;`,
    `\t\treturn null;`,
    `\t}`,
    `}`
  ].join('\n');
  await createApexClass('MyController', folder, classText);
}
