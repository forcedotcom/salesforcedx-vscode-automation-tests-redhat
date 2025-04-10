/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { By, SideBarView, WebElement } from 'vscode-extension-tester';
import { executeQuickPick } from '../ui-interaction/commandPrompt';
import { Duration } from '../core/miscellaneous';
import { expect } from 'chai';

/**
 * Opens the Org Browser in the sidebar and refreshes metadata types
 * @param wait - Duration to wait after opening the browser
 */
export async function openOrgBrowser(wait: Duration = Duration.seconds(1)): Promise<void> {
  await executeQuickPick('View: Show Org Browser', wait);
  await executeQuickPick('SFDX: Refresh Types', Duration.seconds(30));
}

/**
 * Verifies that the Org Browser is open in the sidebar
 * @throws Assertion error if the Org Browser is not open with the expected title
 */
export async function verifyOrgBrowserIsOpen(): Promise<void> {
  const orgBrowser = new SideBarView();
  const titlePart = orgBrowser.getTitlePart();
  const title = await titlePart.getTitle();
  expect(title).to.equal('ORG BROWSER: METADATA');
}

/**
 * Finds a metadata type in the Org Browser
 * @param type - The name of the metadata type to find
 * @returns The WebElement of the found type or undefined if not found
 */
export async function findTypeInOrgBrowser(type: string): Promise<WebElement | undefined> {
  const orgBrowser = new SideBarView();
  const content = orgBrowser.getContent();
  const treeItems = await content.findElements(By.css('div.monaco-list-row'));
  let element;
  for (const item of treeItems) {
    const label = await item.getAttribute('aria-label');
    if (label.includes(type)) return item;
  }
  return element;
}
