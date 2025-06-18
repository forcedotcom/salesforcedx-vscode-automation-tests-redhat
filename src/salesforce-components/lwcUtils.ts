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
 * Creates a Lightning Web Component with the specified name
 * Generates JS, HTML, and test files with sample content
 * Sets breakpoints in the test file
 *
 * @param name - The name of the LWC to create
 */
export async function createLwc(name: string): Promise<void> {
  log('createLwc() - calling getWorkbench()');
  const workbench = getWorkbench();

  log('createLwc() - Running SFDX: Create Lightning Web Component');
  // Using the Command palette, run SFDX: Create Lightning Web Component.
  const inputBox = await executeQuickPick('SFDX: Create Lightning Web Component', Duration.seconds(1));

  log('createLwc() - Set the name of the new component');
  // Set the name of the new component
  await inputBox.setText(name);
  await pause(Duration.seconds(1));
  await inputBox.confirm();
  await pause(Duration.seconds(1));
  await inputBox.confirm();
  await pause(Duration.seconds(1));

  log('createLwc() - Modify js content');
  // Modify js content
  let textEditor = await getTextEditor(workbench, name + '.js');
  await pause(Duration.seconds(1));
  const jsText = [
    `import { LightningElement } from 'lwc';`,
    ``,
    `export default class ${name} extends LightningElement {`,
    `\tgreeting = 'World';`,
    `}`
  ].join('\n');
  await overrideTextInFile(textEditor, jsText);
  await pause(Duration.seconds(1));
  await textEditor.save();
  await pause(Duration.seconds(1));

  log('createLwc() - Modify html content');
  log('');
  // Modify html content
  textEditor = await getTextEditor(workbench, name + '.html');
  const htmlText = [
    `<template>`,
    `\t<lightning-card title="${name}" icon-name="custom:custom14">`,
    `\t\t<div class="slds-var-m-around_medium">Hello, {greeting}!</div>`,
    `\t</lightning-card>`,
    ``,
    `</template>`
  ].join('\n');
  await overrideTextInFile(textEditor, htmlText);
  await textEditor.save();
  await pause(Duration.seconds(1));

  log('createLwc() - Modify test content');
  log('');
  textEditor = await getTextEditor(workbench, name + '.test.js');
  const nameCapitalized = name.charAt(0).toUpperCase() + name.slice(1);
  const testText = [
    `import { createElement } from 'lwc';`,
    `import ${nameCapitalized} from 'c/${name}';`,
    '',
    `describe('c-${name}', () => {`,
    `    afterEach(() => {`,
    `        while (document.body.firstChild) {`,
    `            document.body.removeChild(document.body.firstChild);`,
    `        }`,
    `    });`,
    ``,
    `    it('displays greeting', () => {`,
    `        const element = createElement('c-${name}', {`,
    `            is: ${nameCapitalized}`,
    `        });`,
    `        document.body.appendChild(element);`,
    `        const div = element.shadowRoot.querySelector('div');`,
    `        expect(div.textContent).toBe('Hello, World!');`,
    `    });`,
    ``,
    `    it('is defined', async () => {`,
    `        const element = createElement('c-${name}', {`,
    `            is: ${nameCapitalized}`,
    `        });`,
    `        document.body.appendChild(element);`,
    `        await expect(element).toBeDefined();`,
    `    });`,
    `});`
  ].join('\n');
  await overrideTextInFile(textEditor, testText);
  await textEditor.save();
  await pause(Duration.seconds(1));

  // Set breakpoints
  await textEditor.toggleBreakpoint(17);
  await textEditor.toggleBreakpoint(25);
}

/**
 * Creates an Aura component with the specified name
 * Generates component markup with a simple contact form
 *
 * @param name - The name of the Aura component to create
 */
export async function createAura(name: string): Promise<void> {
  const workbench = getWorkbench();

  log('createAura() - Running SFDX: Create Aura Component');
  const inputBox = await executeQuickPick('SFDX: Create Aura Component', Duration.seconds(1));

  log('createAura() - Set the name of the new component');
  // Set the name of the new component
  await inputBox.setText(name);
  await pause(Duration.seconds(1));
  await inputBox.confirm();
  await pause(Duration.seconds(1));
  await inputBox.confirm();
  await pause(Duration.seconds(1));

  log('createAura() - Modify html content');
  // Modify html content
  const textEditor = await getTextEditor(workbench, name + '.cmp');
  await pause(Duration.seconds(1));
  const htmlText = [
    '<aura:component>',
    '\t',
    '\t<aura:attribute name="simpleNewContact" type="Object"/>',
    '\t<div class="slds-page-header" role="banner">',
    '\t\t<h1 class="slds-m-right_small">Create New Contact</h1>',
    '\t</div>',
    '\t<aura:if isTrue="{!not(empty(v.simpleNewContact))}">',
    '\t\t{!v.simpleNewContact}',
    '\t</aura:if>',
    '</aura:component>'
  ].join('\n');
  await overrideTextInFile(textEditor, htmlText);
  await pause(Duration.seconds(1));
  await textEditor.save();
  await pause(Duration.seconds(1));
}
