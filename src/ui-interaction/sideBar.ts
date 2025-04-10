/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  By,
  DefaultTreeItem,
  Locator,
  TreeItem,
  ViewItem,
  ViewSection,
  WebElement,
  Workbench
} from 'vscode-extension-tester';
import { debug, Duration, log, pause } from '../core/miscellaneous';
import { expect } from 'chai';
import { getWorkbench, reloadWindow, showExplorerView } from './workbench';

/**
 * Expands a project in the sidebar explorer view
 * @param workbench - The VSCode workbench instance
 * @param projectName - The name of the project to expand
 * @returns The ViewSection representing the expanded project
 * @throws Assertion error if sidebar is not displayed
 */
export async function expandProjectInSideBar(workbench: Workbench, projectName: string): Promise<ViewSection> {
  debug('expandProjectInSideBar()');
  await showExplorerView();

  const sidebar = workbench.getSideBar();
  expect(await sidebar.isDisplayed()).to.equal(true);

  const content = sidebar.getContent();
  const treeViewSection = await content.getSection(projectName);
  await treeViewSection.expand();
  return treeViewSection;
}

/**
 * Gets the visible items from a project in the sidebar
 * @param workbench - The VSCode workbench instance
 * @param projectName - The name of the project to get items from
 * @returns Array of visible item labels in the project
 */
export async function getVisibleItemsFromSidebar(workbench: Workbench, projectName: string): Promise<string[]> {
  debug('getVisibleItemsFromSidebar()');
  const treeViewSection = await expandProjectInSideBar(workbench, projectName);

  // Warning, we can only retrieve the items which are visible.
  const visibleItems = (await treeViewSection.getVisibleItems()) as DefaultTreeItem[];
  const visibleItemsLabels = await Promise.all(visibleItems.map(item => item.getLabel().then(label => label)));

  return visibleItemsLabels;
}

/**
 * Gets visible tree view items filtered by a search string
 * @param workbench - The VSCode workbench instance
 * @param projectName - The name of the project to get items from
 * @param searchString - The string to filter items by (items starting with this string will be included)
 * @returns Array of DefaultTreeItems that match the filter criteria
 */
export async function getFilteredVisibleTreeViewItems(
  workbench: Workbench,
  projectName: string,
  searchString: string
): Promise<DefaultTreeItem[]> {
  debug('getFilteredVisibleTreeViewItems()');
  const treeViewSection = await expandProjectInSideBar(workbench, projectName);

  // Warning, we can only retrieve the items which are visible.
  const visibleItems = (await treeViewSection.getVisibleItems()) as DefaultTreeItem[];
  const filteredItems = await visibleItems.reduce(
    async (previousPromise: Promise<DefaultTreeItem[]>, currentItem: DefaultTreeItem) => {
      const results = await previousPromise;
      const label = await currentItem.getLabel();
      if (label.startsWith(searchString)) {
        results.push(currentItem);
      }

      return results;
    },
    Promise.resolve([])
  );

  return filteredItems;
}

/**
 * Gets visible tree view item labels filtered by a search string
 * @param workbench - The VSCode workbench instance
 * @param projectName - The name of the project to get items from
 * @param searchString - The string to filter items by (items starting with this string will be included)
 * @returns Array of label strings that match the filter criteria
 */
export async function getFilteredVisibleTreeViewItemLabels(
  workbench: Workbench,
  projectName: string,
  searchString: string
): Promise<string[]> {
  const treeViewSection = await expandProjectInSideBar(workbench, projectName);

  // Warning, we can only retrieve the items which are visible.
  const visibleItems = (await treeViewSection.getVisibleItems()) as DefaultTreeItem[];
  const filteredItems = (await visibleItems.reduce(
    async (previousPromise: Promise<string[]>, currentItem: ViewItem) => {
      const results = await previousPromise;
      const label = await (currentItem as TreeItem).getLabel();
      if (label.startsWith(searchString)) {
        results.push(label);
      }

      return results;
    },
    Promise.resolve([])
  )) as string[];

  return filteredItems;
}

/**
 * Finds a child item with the specified name in a tree item
 * @param defaultTreeItem - The parent tree item to search in
 * @param name - The exact name of the child item to find
 * @returns The child TreeItem if found, undefined otherwise
 */
export async function getVisibleChild(defaultTreeItem: DefaultTreeItem, name: string): Promise<TreeItem | undefined> {
  const children = await getVisibleChildren(defaultTreeItem);
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const label = await child.getLabel();
    if (label === name) {
      return child;
    }
  }

  return undefined;
}

/**
 * Gets all visible children of a tree item
 * Similar to DefaultTreeItem.getChildren() but uses getVisibleItems()
 * @param defaultTreeItem - The parent tree item
 * @returns Array of visible child TreeItems
 */
export async function getVisibleChildren(defaultTreeItem: DefaultTreeItem): Promise<TreeItem[]> {
  console.log(`${defaultTreeItem}`);
  // const rows = await getVisibleItems(
  //   defaultTreeItem,
  //   defaultTreeItem.locatorMap.DefaultTreeSection.itemRow as string
  // );

  // const items = await Promise.all(
  //   rows.map(async (row) =>
  //     new DefaultTreeItem(
  //       defaultTreeItem.locatorMap,
  //       // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
  //       row as any,
  //       defaultTreeItem.viewPart
  //     ).wait()
  //   )
  // );

  return [];
}

/**
 * Gets all visible items within a tree
 * @param treeItem - The tree item to start from
 * @param locator - The locator to find items
 * @returns Array of WebElements representing all visible items in the tree
 */
export async function getVisibleItems(treeItem: TreeItem, locator: Locator): Promise<WebElement[]> {
  await treeItem.expand();
  const rows = await treeItem.findElement(By.xpath('..')).findElements(locator);

  return [...rows.values()];
}

/**
 * Verifies that a project has been loaded
 * @param projectName - The name of the project to verify
 * @throws Error if the project or force-app folder cannot be found
 */
export async function verifyProjectLoaded(projectName: string) {
  log(`${projectName} - Verifying project was created...`);

  // Reload the VS Code window
  await pause(Duration.seconds(5));
  const workbench = getWorkbench();
  await reloadWindow(Duration.seconds(10));
  await showExplorerView();

  const sidebar = await workbench.getSideBar().wait();
  const content = await sidebar.getContent().wait();
  const treeViewSection = await content.getSection(projectName);
  if (!treeViewSection) {
    throw new Error(
      'In verifyProjectLoaded(), getSection() returned a treeViewSection with a value of null (or undefined)'
    );
  }

  const forceAppTreeItem = (await treeViewSection.findItem('force-app')) as DefaultTreeItem;
  if (!forceAppTreeItem) {
    throw new Error(
      'In verifyProjectLoaded(), findItem() returned a forceAppTreeItem with a value of null (or undefined)'
    );
  }

  await (await forceAppTreeItem.wait()).expand();
  log(`${projectName} - Verifying project complete`);
}
