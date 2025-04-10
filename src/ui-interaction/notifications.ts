/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Duration, log } from '../core/miscellaneous';
import { getBrowser, getWorkbench } from './workbench';
import { executeQuickPick } from './commandPrompt';
import { By } from 'vscode-extension-tester';

/**
 * Waits for a notification with the specified message to disappear
 * @param notificationMessage - Regular expression to match the notification message
 * @param durationInSeconds - Maximum duration to wait for the notification to go away
 */
export async function waitForNotificationToGoAway(
  notificationMessage: RegExp,
  durationInSeconds: Duration
): Promise<void> {
  await findNotification(notificationMessage, false, durationInSeconds, true);
}

/**
 * Checks if a notification with the specified message is present
 * @param notificationMessage - Regular expression to match the notification message
 * @returns True if the notification is present, false otherwise
 */
export async function notificationIsPresent(notificationMessage: RegExp): Promise<boolean> {
  const notification = await findNotification(notificationMessage, true, Duration.milliseconds(500));

  return notification ? true : false;
}

/**
 * Checks if a notification with the specified message is present within a timeout period
 * @param notificationMessage - Regular expression to match the notification message
 * @param durationInSeconds - Maximum duration to wait for the notification to appear
 * @returns True if the notification is present within the timeout, false otherwise
 */
export async function notificationIsPresentWithTimeout(
  notificationMessage: RegExp,
  durationInSeconds: Duration
): Promise<boolean> {
  const notification = await findNotification(notificationMessage, true, durationInSeconds);

  return notification ? true : false;
}

/**
 * Checks if a notification with the specified message is absent
 * @param notificationMessage - Regular expression to match the notification message
 * @returns True if the notification is absent, false otherwise
 */
export async function notificationIsAbsent(notificationMessage: RegExp): Promise<boolean> {
  const notification = await findNotification(notificationMessage, false, Duration.milliseconds(500));

  return notification ? false : true;
}

/**
 * Checks if a notification with the specified message is absent within a timeout period
 * @param notificationMessage - Regular expression to match the notification message
 * @param durationInSeconds - Maximum duration to wait for the notification to be absent
 * @returns True if the notification is absent within the timeout, false otherwise
 */
export async function notificationIsAbsentWithTimeout(
  notificationMessage: RegExp,
  durationInSeconds: Duration
): Promise<boolean> {
  const notification = await findNotification(notificationMessage, false, durationInSeconds);

  return notification ? false : true;
}

/**
 * Dismisses a notification with the specified message
 * @param notificationMessage - Regular expression to match the notification message
 * @param timeout - Maximum duration to wait for the notification to appear before dismissing
 */
export async function dismissNotification(notificationMessage: RegExp, timeout = Duration.seconds(1)): Promise<void> {
  const notification = await findNotification(notificationMessage, true, timeout, true);
  notification?.close();
}

/**
 * Accepts a notification by clicking an action button
 * @param notificationMessage - The notification message to look for
 * @param actionName - The name of the action button to click
 * @param timeout - Maximum duration to wait for the notification
 * @returns True if the action was successfully clicked, false otherwise
 */
export async function acceptNotification(
  notificationMessage: string,
  actionName: string,
  timeout: Duration
): Promise<boolean> {
  console.log(`${notificationMessage}, ${actionName}, ${timeout}`);
  await executeQuickPick('Notifications: Show Notifications', Duration.seconds(1));

  const actionButtons = await getBrowser().findElements(
    By.css(`div.notification-list-item-buttons-container > a.monaco-button.monaco-text-button`)
  );
  for (const button of actionButtons) {
    if ((await button.getText()).includes(actionName)) {
      log(`button ${actionName} found`);
      await button.click();
      return true;
    }
  }
  return false;
}

/**
 * Dismisses all notifications in the notifications center
 */
export async function dismissAllNotifications(): Promise<void> {
  log(`calling dismissAllNotifications()`);
  await executeQuickPick('Notifications: Clear All Notifications');
}

/**
 * Finds a notification with the specified message
 * @param message - Regular expression to match the notification message
 * @param shouldBePresent - If true, looks for the notification to be present; if false, waits for it to be absent
 * @param timeout - Maximum duration to wait for the notification state to match shouldBePresent
 * @param throwOnTimeout - If true, throws an error if the timeout is reached; if false, returns null
 * @returns The notification object if found and shouldBePresent is true, or null in other cases
 * @throws Error if throwOnTimeout is true and the timeout is reached
 * @private
 */
async function findNotification(
  message: RegExp,
  shouldBePresent: boolean,
  timeout: Duration = Duration.milliseconds(500),
  throwOnTimeout = false // New parameter to control throwing on timeout
): Promise<Notification | null> {
  const workbench = getWorkbench();
  const timeoutMessage = `Notification with message "${message}" ${shouldBePresent ? 'not found' : 'still present'} within the specified timeout of ${timeout.seconds} seconds.`;

  const getMatchingNotification = async (): Promise<Notification | null> => {
    await workbench.openNotificationsCenter();
    const notifications = await workbench.getNotifications();
    for (const notification of notifications) {
      const notificationMessage = await notification.getMessage();
      if (message.test(notificationMessage)) {
        return notification as unknown as Notification;
      }
    }
    return null;
  };

  try {
    const endTime = Date.now() + timeout.milliseconds;
    let foundNotification: Notification | null = null;

    // Retry until timeout is reached or the notification status matches `shouldBePresent`
    do {
      foundNotification = await getMatchingNotification();
      if (foundNotification) {
        return foundNotification;
      }
      await new Promise(res => setTimeout(res, 100)); // Short delay before retrying
    } while (Date.now() < endTime);

    // Throw or return based on `throwOnTimeout`
    if (throwOnTimeout) {
      throw new Error(timeoutMessage);
    }
    return null;
  } catch (error) {
    if (throwOnTimeout) {
      throw error;
    }
    return null;
  }
}
