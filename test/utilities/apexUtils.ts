/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { executeQuickPick } from './commandPrompt';
import { Duration, log, pause } from './miscellaneous';
import { getWorkbench } from './workbench';
import { getTextEditor } from './textEditorView';
import { retryOperation } from './retryUtils';
import { clickButtonOnModalDialog } from './modalDialog';
import { InputBox, QuickOpenBox } from 'vscode-extension-tester';

export async function createApexClass(name: string, classText: string, breakpoint?: number): Promise<void> {
  log(`calling createApexClass(${name})`);
  let inputBox: InputBox | QuickOpenBox;
  await retryOperation(async () => {
    // Using the Command palette, run SFDX: Create Apex Class to create the main class
    inputBox = await executeQuickPick('SFDX: Create Apex Class', Duration.seconds(2));
  });

  // Set the name of the new Apex Class
  await retryOperation(async () => {
    await inputBox.setText(name);
    await pause(Duration.seconds(1));
    await inputBox.confirm();
    await pause(Duration.seconds(1));
    await inputBox.confirm();
    await pause(Duration.seconds(1));
    await clickButtonOnModalDialog('Overwrite');
    await pause(Duration.seconds(1));
  });

  log(`Blank Apex Class ${name} created successfully.`);
  // Modify class content
  const workbench = getWorkbench();
  log('Getting text editor for the new Apex Class');
  const textEditor = await getTextEditor(workbench, name + '.cls');
  log('Done getting text editor for the new Apex Class');
  await pause(Duration.seconds(1));
  log(`Setting text for Apex Class ${name}`);
  await textEditor.setText(classText);
  log(`Done setting text for Apex Class ${name}`);
  await pause(Duration.seconds(1));
  await textEditor.save();
  await pause(Duration.seconds(1));
  if (breakpoint) {
    await textEditor.toggleBreakpoint(breakpoint);
  }
  await pause(Duration.seconds(1));
  log(`Apex Class ${name} modified successfully.`);
}

export async function createApexClassWithTest(name: string): Promise<void> {
  log(`calling createApexClassWithTest()`);
  const classText = [
    `public with sharing class ${name} {`,
    `\tpublic static void SayHello(string name){`,
    `\t\tSystem.debug('Hello, ' + name + '!');`,
    `\t}`,
    `}`
  ].join('\n');
  await createApexClass(name, classText, 3);

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
  await createApexClass(name + 'Test', testText, 6);
}

export async function createApexClassWithBugs(): Promise<void> {
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
  await createApexClass('AccountService', classText);

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
  await createApexClass('AccountServiceTest', testText);
}

export async function createAnonymousApexFile(): Promise<void> {
  log(`calling createAnonymousApexFile()`);
  const workbench = getWorkbench();

  // Using the Command palette, run File: New File...
  const inputBox = await executeQuickPick('Create: New File...', Duration.seconds(1));

  // Set the name of the new Anonymous Apex file
  await inputBox.setText('Anonymous.apex');
  await inputBox.confirm();
  await inputBox.confirm();

  const textEditor = await getTextEditor(workbench, 'Anonymous.apex');
  const fileContent = ["System.debug('¡Hola mundo!');", ''].join('\n');
  await textEditor.setText(fileContent);
  await textEditor.save();
  await pause(Duration.seconds(1));
}

export async function createApexController(): Promise<void> {
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
  await createApexClass('MyController', classText);
}
