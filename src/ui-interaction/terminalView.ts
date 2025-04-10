/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Duration, log, pause } from '../core/miscellaneous';
import { TerminalView, Workbench } from 'vscode-extension-tester';

/**
 * Gets the terminal view from the workbench
 * @param workbench - The VSCode workbench instance
 * @returns A promise that resolves to the terminal view
 */
export async function getTerminalView(workbench: Workbench): Promise<TerminalView> {
  const bottomBar = await workbench.getBottomBar().wait();
  const terminalView = await (await bottomBar.openTerminalView()).wait();

  return terminalView;
}

/**
 * Gets the text content from the terminal view
 * @param workbench - The VSCode workbench instance
 * @param seconds - Number of seconds to wait before getting the text (allows time for terminal output)
 * @returns A promise that resolves to the text content of the terminal
 */
export async function getTerminalViewText(workbench: Workbench, seconds: number): Promise<string> {
  await pause(Duration.seconds(seconds));
  const terminalView = await getTerminalView(workbench);

  return await terminalView.getText();
}

/**
 * Executes a command in the terminal
 * @param workbench - The VSCode workbench instance
 * @param command - The command to execute in the terminal
 * @returns A promise that resolves to the terminal view
 * @throws Error if the terminal view cannot be obtained
 */
export async function executeCommand(workbench: Workbench, command: string): Promise<TerminalView> {
  log(`Executing the command, "${command}"`);

  const terminalView = await (await getTerminalView(workbench)).wait();
  if (!terminalView) {
    throw new Error('In executeCommand(), the terminal view returned from getTerminalView() was null (or undefined)');
  }
  await pause(Duration.seconds(5));
  await terminalView.executeCommand(command);

  return terminalView;
}
