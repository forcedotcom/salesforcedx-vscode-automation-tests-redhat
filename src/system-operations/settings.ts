/*
 * Copyright (c) 2024, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { By, Setting, SettingsEditor } from 'vscode-extension-tester';
import { executeQuickPick } from '../ui-interaction/commandPrompt';
import { debug, Duration, findElementByText, pause } from '../core/miscellaneous';
import { getBrowser } from '../ui-interaction/workbench';

/**
 * Finds a setting in VSCode settings UI and checks its value
 * @param id - The ID of the setting to find
 * @returns Object containing the setting and its current value
 * @throws Error if the setting cannot be found
 * @private
 */
async function findAndCheckSetting(id: string): Promise<{ checkButton: Setting; checkButtonValue: string | null }> {
  debug(`enter findAndCheckSetting for id: ${id}`);
  await executeQuickPick('Preferences: Clear Settings Search Results', Duration.seconds(2));
  const input = await getBrowser().findElement(By.css('div.suggest-input-container'));
  await input.click();
  const textArea = await getBrowser().findElement(By.css('textarea.inputarea.monaco-mouse-cursor-text'));
  await textArea.sendKeys(id);
  await pause(Duration.seconds(2));
  let checkButton: Setting | null = null;
  let checkButtonValue: string | null = null;

  await getBrowser().wait(
    async () => {
      checkButton = (await findElementByText('div', 'aria-label', id)) as Setting;
      if (checkButton) {
        checkButtonValue = await checkButton.getAttribute('aria-checked');
        debug(`found setting checkbox with value "${checkButtonValue}"`);
        return true;
      }
      return false;
    },
    5000,
    `Could not find setting with name: ${id}`
  );

  if (!checkButton) {
    throw new Error(`Could not find setting with name: ${id}`);
  }

  debug(`findAndCheckSetting result for ${id} found ${!!checkButton} value: ${checkButtonValue}`);
  return { checkButton, checkButtonValue };
}

/**
 * Opens the workspace settings editor
 */
export async function inWorkspaceSettings<T>(): Promise<void> {
  await executeQuickPick('Preferences: Open Workspace Settings', Duration.seconds(5));
}

/**
 * Opens the user settings editor
 */
export async function inUserSettings<T>(): Promise<void> {
  await executeQuickPick('Preferences: Open User Settings', Duration.seconds(5));
}

/**
 * Toggles a boolean setting to the specified state
 * @param id - The ID of the setting to toggle
 * @param finalState - The desired final state (true for enabled, false for disabled)
 * @param settingsType - Whether to modify user or workspace settings
 * @returns The final state of the setting after toggling
 * @private
 */
async function toggleBooleanSetting(
  id: string,
  finalState: boolean | undefined,
  settingsType: 'user' | 'workspace'
): Promise<boolean> {
  const settingsFunction = settingsType === 'workspace' ? inWorkspaceSettings : inUserSettings;
  await settingsFunction();
  let result = await findAndCheckSetting(id);

  if (finalState !== undefined) {
    if ((finalState && result.checkButtonValue === 'true') || (!finalState && result.checkButtonValue === 'false')) {
      return true;
    }
  }
  await result.checkButton.click();
  result = await findAndCheckSetting(id);
  return result.checkButtonValue === 'true';
}

/**
 * Enables a boolean setting
 * @param id - The ID of the setting to enable
 * @param settingsType - Whether to modify user or workspace settings, defaults to workspace
 * @returns True if the setting was successfully enabled
 */
export async function enableBooleanSetting(
  id: string,
  settingsType: 'user' | 'workspace' = 'workspace'
): Promise<boolean> {
  debug(`enableBooleanSetting ${id}`);
  return toggleBooleanSetting(id, true, settingsType);
}

/**
 * Disables a boolean setting
 * @param id - The ID of the setting to disable
 * @param settingsType - Whether to modify user or workspace settings, defaults to workspace
 * @returns True if the setting was successfully disabled
 */
export async function disableBooleanSetting(
  id: string,
  settingsType: 'user' | 'workspace' = 'workspace'
): Promise<boolean> {
  debug(`disableBooleanSetting ${id}`);
  return toggleBooleanSetting(id, false, settingsType);
}

/**
 * Checks if a boolean setting is enabled
 * @param id - The ID of the setting to check
 * @param settingsType - Whether to check user or workspace settings, defaults to workspace
 * @returns True if the setting is enabled, false otherwise
 */
export async function isBooleanSettingEnabled(
  id: string,
  settingsType: 'user' | 'workspace' = 'workspace'
): Promise<boolean> {
  const settingsFunction = settingsType === 'workspace' ? inWorkspaceSettings : inUserSettings;
  await settingsFunction();
  const { checkButtonValue } = await findAndCheckSetting(id);
  return checkButtonValue === 'true';
}

/**
 * Sets the value of a specific setting in the settings editor.
 *
 * @param id - The unique identifier of the setting to be updated.
 * @param value - The new value to set for the specified setting.
 * @param isWorkspace - True if the setting is a workspace setting; false if it's a user setting.
 * @returns A promise that resolves when the setting value has been updated.
 */
export const setSettingValue = async (id: string, value: string | boolean, isWorkspace: boolean): Promise<void> => {
  await (isWorkspace ? inWorkspaceSettings() : inUserSettings());
  const settingsEditor = new SettingsEditor();
  const logLevelSetting = await settingsEditor.findSettingByID(id);
  await logLevelSetting?.setValue(value);
};
