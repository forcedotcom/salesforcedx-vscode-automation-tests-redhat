/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { Duration, log, pause } from '../core/miscellaneous';
import { getTextEditor } from '../ui-interaction/textEditorView';
import { getWorkbench } from '../ui-interaction/workbench';
import { createFolder, createOrOverwriteFile } from '../system-operations/fileSystem';

/**
 * Creates a Lightning Web Component with the specified name
 * Generates JS, HTML, and test files with sample content
 * Sets breakpoints in the test file
 *
 * @param name - The name of the LWC to create
 * @param folder - The folder where the LWC should be created
 */
export async function createLwc(name: string, folder: string): Promise<void> {
  log(`calling createLwc(${name})`);

  // Define JS content
  const jsText = [
    `import { LightningElement } from 'lwc';`,
    ``,
    `export default class ${name} extends LightningElement {`,
    `\tgreeting = 'World';`,
    `}`
  ].join('\n');

  // Define HTML content
  const htmlText = [
    `<template>`,
    `\t<lightning-card title="${name}" icon-name="custom:custom14">`,
    `\t\t<div class="slds-var-m-around_medium">Hello, {greeting}!</div>`,
    `\t</lightning-card>`,
    ``,
    `</template>`
  ].join('\n');

  // Define test content
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

  // Define metadata content
  const metaContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">`,
    `    <apiVersion>64.0</apiVersion>`,
    `    <isExposed>false</isExposed>`,
    `</LightningComponentBundle>`
  ].join('\n');

  // Create the file paths
  const componentFolder = join(folder, name);
  const testsFolder = join(componentFolder, '__tests__');
  const jsFilePath = join(componentFolder, `${name}.js`);
  const htmlFilePath = join(componentFolder, `${name}.html`);
  const testFilePath = join(testsFolder, `${name}.test.js`);
  const metaFilePath = join(componentFolder, `${name}.js-meta.xml`);

  try {
    // Create the component directory and __tests__ subdirectory
    createFolder(componentFolder);
    createFolder(testsFolder);

    // Write all the LWC files using fs.writeFile
    createOrOverwriteFile(jsFilePath, jsText);
    log(`LWC JavaScript file ${name}.js created successfully at ${jsFilePath}`);

    createOrOverwriteFile(htmlFilePath, htmlText);
    log(`LWC HTML file ${name}.html created successfully at ${htmlFilePath}`);

    createOrOverwriteFile(testFilePath, testText);
    log(`LWC test file ${name}.test.js created successfully at ${testFilePath}`);

    createOrOverwriteFile(metaFilePath, metaContent);
    log(`LWC metadata file ${name}.js-meta.xml created successfully at ${metaFilePath}`);
  } catch (error) {
    log(`Error creating LWC ${name}: ${error}`);
    throw error;
  }

  // Open the test file in the text editor and set breakpoints
  await pause(Duration.seconds(1));
  const workbench = getWorkbench();
  const textEditor = await getTextEditor(workbench, name + '.test.js');

  // Set breakpoints
  log('createLwc() - Setting breakpoints 17 and 25');
  await pause(Duration.seconds(5)); // wait for file to be saved and loaded
  log('createLwc() - Set breakpoints 17');
  await textEditor.toggleBreakpoint(17);
  log('createLwc() - Set breakpoints 25');
  await textEditor.toggleBreakpoint(25);
  log('createLwc() - Set breakpoints 17 and 25 done');
}

/**
 * Creates an Aura component with the specified name
 * Generates component markup with a simple contact form
 *
 * @param name - The name of the Aura component to create
 * @param folder - The folder where the Aura component should be created
 */
export async function createAura(name: string, folder: string): Promise<void> {
  log(`calling createAura(${name})`);

  // Define component content
  const componentText = [
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

  // Define metadata content
  const metaContent = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">`,
    `    <apiVersion>64.0</apiVersion>`,
    `    <description>A Lightning Component Bundle</description>`,
    `</AuraDefinitionBundle>`
  ].join('\n');

  // Define controller content
  const controllerText = [
    `({`,
    `\tmyAction : function(component, event, helper) {`,
    `\t\t`,
    `\t}`,
    `})`
  ].join('\n');

  // Define helper content
  const helperText = [
    `({`,
    `\thelperMethod : function() {`,
    `\t\t`,
    `\t}`,
    `})`
  ].join('\n');

  // Define renderer content
  const rendererText = [
    `({`,
    `\t`,
    `\t// Your renderer method overrides go here`,
    `\t`,
    `})`
  ].join('\n');

  // Define CSS content
  const cssText = [
    `.THIS {`,
    `}`
  ].join('\n');

  // Define design content
  const designText = [
    `<design:component >`,
    `\t`,
    `</design:component>`
  ].join('\n');

  // Define auradoc content
  const auradocText = [
    `<aura:documentation>`,
    `\t<aura:description>Documentation for ${name}</aura:description>`,
    `\t<aura:example name="ExampleName" ref="exampleComponentName" label="Label">`,
    `\t\tExample Description`,
    `\t</aura:example>`,
    `</aura:documentation>`
  ].join('\n');

  // Define SVG content
  const svgText = [
    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>`,
    `<svg width="120px" height="120px" viewBox="0 0 120 120" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
    `\t<g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">`,
    `\t\t<path d="M120,108 C120,114.6 114.6,120 108,120 L12,120 C5.4,120 0,114.6 0,108 L0,12 C0,5.4 5.4,0 12,0 L108,0 C114.6,0 120,5.4 120,12 L120,108 L120,108 Z" id="Shape" fill="#2A739E"/>`,
    `\t\t<path d="M77.7383308,20 L61.1640113,20 L44.7300055,63.2000173 L56.0543288,63.2000173 L40,99.623291 L72.7458388,54.5871812 L60.907727,54.5871812 L77.7383308,20 Z" id="Path-1" fill="#FFFFFF"/>`,
    `\t</g>`,
    `</svg>`
  ].join('\n');

  // Create the file paths
  const componentFolder = join(folder, name);
  const componentFilePath = join(componentFolder, `${name}.cmp`);
  const metaFilePath = join(componentFolder, `${name}.cmp-meta.xml`);
  const controllerFilePath = join(componentFolder, `${name}Controller.js`);
  const helperFilePath = join(componentFolder, `${name}Helper.js`);
  const rendererFilePath = join(componentFolder, `${name}Renderer.js`);
  const cssFilePath = join(componentFolder, `${name}.css`);
  const designFilePath = join(componentFolder, `${name}.design`);
  const auradocFilePath = join(componentFolder, `${name}.auradoc`);
  const svgFilePath = join(componentFolder, `${name}.svg`);

  try {
    // Create the component directory
    createFolder(componentFolder);

    // Write all the Aura component files using fs.writeFile
    createOrOverwriteFile(componentFilePath, componentText);
    log(`Aura component file ${name}.cmp created successfully at ${componentFilePath}`);

    createOrOverwriteFile(metaFilePath, metaContent);
    log(`Aura component metadata file ${name}.cmp-meta.xml created successfully at ${metaFilePath}`);

    createOrOverwriteFile(controllerFilePath, controllerText);
    log(`Aura controller file ${name}Controller.js created successfully at ${controllerFilePath}`);

    createOrOverwriteFile(helperFilePath, helperText);
    log(`Aura helper file ${name}Helper.js created successfully at ${helperFilePath}`);

    createOrOverwriteFile(rendererFilePath, rendererText);
    log(`Aura renderer file ${name}Renderer.js created successfully at ${rendererFilePath}`);

    createOrOverwriteFile(cssFilePath, cssText);
    log(`Aura CSS file ${name}.css created successfully at ${cssFilePath}`);

    createOrOverwriteFile(designFilePath, designText);
    log(`Aura design file ${name}.design created successfully at ${designFilePath}`);

    createOrOverwriteFile(auradocFilePath, auradocText);
    log(`Aura documentation file ${name}.auradoc created successfully at ${auradocFilePath}`);

    createOrOverwriteFile(svgFilePath, svgText);
    log(`Aura SVG file ${name}.svg created successfully at ${svgFilePath}`);
  } catch (error) {
    log(`Error creating Aura component ${name}: ${error}`);
    throw error;
  }

  // Open the file in the text editor
  await pause(Duration.seconds(1));
  const workbench = getWorkbench();
  await getTextEditor(workbench, name + '.cmp');
  await pause(Duration.seconds(1));
}
