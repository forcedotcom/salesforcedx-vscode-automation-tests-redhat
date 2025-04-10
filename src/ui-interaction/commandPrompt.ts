/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { debug, Duration, log, pause } from '../core/miscellaneous';
import { getBrowser, getWorkbench } from './workbench';
import { By, InputBox, Key, QuickOpenBox, Workbench } from 'vscode-extension-tester';

/**
 * Opens the command prompt and enters a command
 * @param workbench - The VSCode workbench instance
 * @param command - The command to enter in the prompt
 * @returns The InputBox or QuickOpenBox representing the command prompt
 */
export async function openCommandPromptWithCommand(
  workbench: Workbench,
  command: string
): Promise<InputBox | QuickOpenBox> {
  const prompt = await (await workbench.openCommandPrompt()).wait();

  await (await prompt.wait()).setText(`>${command}`);

  return prompt;
}

/**
 * Runs a command from the command prompt
 * @param workbench - The VSCode workbench instance
 * @param command - The command to run
 * @param durationInSeconds - Optional duration to wait after running the command
 * @returns The InputBox or QuickOpenBox representing the command prompt
 */
export async function runCommandFromCommandPrompt(
  workbench: Workbench,
  command: string,
  durationInSeconds: Duration = Duration.seconds(0)
): Promise<InputBox | QuickOpenBox> {
  const prompt = await (await openCommandPromptWithCommand(workbench, command)).wait();
  await selectQuickPickItem(prompt, command);

  if (durationInSeconds.milliseconds > 0) {
    await pause(durationInSeconds);
  }

  return prompt;
}

/**
 * Selects a quick pick option with the specified text
 * @param prompt - The command prompt
 * @param text - The text of the quick pick option to select
 */
export async function selectQuickPickWithText(prompt: InputBox | QuickOpenBox, text: string) {
  // Set the text in the command prompt.  Only selectQuickPick() needs to be called, but setting
  // the text in the command prompt is a nice visual feedback to anyone watching the tests run.
  await prompt.setText(text);
  await pause(Duration.seconds(1));

  await prompt.selectQuickPick(text);
  await pause(Duration.seconds(1));
  // After the text has been entered and selectQuickPick() is called, you might see the last few characters
  // in the input box be deleted.  This is b/c selectQuickPick() calls resetPosition(), which for some reason
  // deletes the last two characters.  This doesn't seem to affect the outcome though.
}

/**
 * Selects a quick pick item with the exact text
 * @param prompt - The command prompt
 * @param text - The exact text of the quick pick item to select
 * @throws Error if the prompt is undefined or if the quick pick item is not found
 */
export async function selectQuickPickItem(prompt: InputBox | QuickOpenBox | undefined, text: string): Promise<void> {
  if (!prompt) {
    throw new Error('Prompt cannot be undefined');
  }
  const quickPick = await prompt.findQuickPick(text);
  if (!quickPick || (await quickPick.getLabel()) !== text) {
    throw new Error(`Quick pick item ${text} was not found`);
  }
  await quickPick.select();
  await pause(Duration.seconds(1));
}

/**
 * Finds a quick pick item in the command prompt
 * @param inputBox - The command prompt
 * @param quickPickItemTitle - The text to search for in quick pick items
 * @param useExactMatch - If true, looks for exact match; if false, checks if item contains the text
 * @param selectTheQuickPickItem - If true, selects the item when found
 * @returns True if the item was found, false otherwise
 */
export async function findQuickPickItem(
  inputBox: InputBox | QuickOpenBox | undefined,
  quickPickItemTitle: string,
  useExactMatch: boolean,
  selectTheQuickPickItem: boolean
): Promise<boolean> {
  if (!inputBox) {
    return false;
  }
  // Type the text into the filter.  Do this in case the pick list is long and
  // the target item is not visible (and one needs to scroll down to see it).
  await inputBox.setText(quickPickItemTitle);
  await pause(Duration.seconds(1));

  let itemWasFound = false;
  const quickPicks = await inputBox.getQuickPicks();
  for (const quickPick of quickPicks) {
    const label = await quickPick.getLabel();
    if (useExactMatch && label === quickPickItemTitle) {
      itemWasFound = true;
    } else if (!useExactMatch && label.includes(quickPickItemTitle)) {
      itemWasFound = true;
    }

    if (itemWasFound) {
      if (selectTheQuickPickItem) {
        await quickPick.select();
        await pause(Duration.seconds(1));
      }

      return true;
    }
  }

  return false;
}

/**
 * Waits for a quick pick item to appear in the command prompt
 * @param prompt - The command prompt
 * @param pickListItem - The text of the quick pick item to wait for
 * @param options - Optional configuration including timeout and error message
 */
export async function waitForQuickPick(
  prompt: InputBox | QuickOpenBox | undefined,
  pickListItem: string,
  options: { msg?: string; timeout?: Duration } = { timeout: Duration.milliseconds(10_000) }
) {
  await getBrowser().wait(
    async () => {
      try {
        await findQuickPickItem(prompt, pickListItem, false, true);
        return true;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_) {
        return false;
      }
    },
    options.timeout?.milliseconds,
    options.msg ?? `Expected to find option ${pickListItem} before ${options.timeout} milliseconds`,
    500 // Check every 500 ms
  );
}

/**
 * Runs exact command from command palette
 * @param command - The command to execute
 * @param wait - Duration to wait after executing the command; default is 1 second
 * @returns The command prompt interface
 * @throws Error if the command is not found or execution fails
 */
export async function executeQuickPick(
  command: string,
  wait: Duration = Duration.seconds(1)
): Promise<InputBox | QuickOpenBox> {
  debug(`executeQuickPick command: ${command}`);
  try {
    const workbench = getWorkbench();
    const prompt = await workbench.openCommandPrompt();
    await prompt.setText(`>${command}`);
    await prompt.selectQuickPick(command);
    await pause(wait);
    return prompt;
  } catch (error) {
    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else {
      throw new Error(`Unknown error: ${error}`);
    }

    if (errorMessage.includes('Command not found')) {
      throw new Error(`Command not found: ${command}`);
    } else {
      throw error;
    }
  }
}

/**
 * Clicks the OK button in a file path dialog
 * Also handles the Overwrite confirmation if a folder already exists
 * @throws Error if the OK button is not found
 */
export async function clickFilePathOkButton(): Promise<void> {
  const browser = getBrowser();
  const okButton = await browser.findElement(
    By.css('*:not([style*="display: none"]).quick-input-action .monaco-button')
  );

  if (!okButton) {
    throw new Error('Ok button not found');
  }

  await pause(Duration.milliseconds(500));
  await okButton.sendKeys(Key.ENTER);
  await pause(Duration.seconds(1));

  const buttons = await browser.findElements(By.css('a.monaco-button.monaco-text-button'));
  for (const item of buttons) {
    const text = await item.getText();
    if (text.includes('Overwrite')) {
      log('clickFilePathOkButton() - folder already exists');
      await browser.wait(
        async () => (await item.isDisplayed()) && (await item.isEnabled()),
        Duration.seconds(5).milliseconds,
        `Overwrite button not clickable within 5 seconds`
      );
      await item.click();
      break;
    }
  }
  await pause(Duration.seconds(2));
}

/**
 * Checks if a VSCode command is available.
 * @param commandName - Name of the VSCode command to check
 * @returns boolean - true if the command is available, false otherwise
 */
export const isCommandAvailable = async (commandName: string): Promise<boolean> => {
  log('Checking if command is available: ' + commandName);
  const workbench = getWorkbench();
  const prompt = await workbench.openCommandPrompt();
  await prompt.setText(`>${commandName}`);
  const availableCommands = await prompt.getQuickPicks();
  for (const item of availableCommands) {
    if ((await item.getLabel()) === commandName) {
      return true;
    }
  }
  return false;
};
