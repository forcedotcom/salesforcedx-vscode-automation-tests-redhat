import { ActivityBar, BottomBarPanel, VSBrowser, WebDriver, Workbench } from 'vscode-extension-tester';
import { executeQuickPick } from './commandPrompt';
import { debug, Duration, isDuration, log, pause } from '../core/miscellaneous';
import { PredicateWithTimeout } from '../testing/predicates';

/**
 * Gets a reference to the VSCode workbench
 * @returns The workbench instance for interacting with the VSCode UI
 */
export function getWorkbench(): Workbench {
  debug('calling getWorkbench()');
  return new Workbench();
}

/**
 * Gets a reference to the WebDriver controlling the browser
 * @returns The WebDriver instance used for browser automation
 */
export function getBrowser(): WebDriver {
  debug('calling getBrowser()');
  return VSBrowser.instance.driver;
}

/**
 * Reloads the VSCode window
 * @param predicateOrWait - Either a predicate with timeout or a duration to wait after reload
 */
export async function reloadWindow(
  predicateOrWait: PredicateWithTimeout | Duration = Duration.milliseconds(0)
): Promise<void> {
  log(`Reloading window`);
  const prompt = await executeQuickPick('Developer: Reload Window');
  await handlePredicateOrWait(predicateOrWait, prompt);
}

/**
 * Closes the currently active editor tab
 */
export async function closeCurrentEditor(): Promise<void> {
  log(`Closing current editor`);
  await executeQuickPick('View: Close Editor');
  await pause(Duration.seconds(1));
}

/**
 * Closes all open editor tabs
 */
export async function closeAllEditors(): Promise<void> {
  log(`Closing all editors`);
  await executeQuickPick('View: Close All Editors');
  await pause(Duration.seconds(1));
}

/**
 * Enables all VSCode extensions
 */
export async function enableAllExtensions(): Promise<void> {
  log(`Enabling all extensions`);
  await executeQuickPick('Extensions: Enable All Extensions');
}

/**
 * Opens the Explorer view in the Activity Bar
 * @throws Error if the Explorer view cannot be opened
 */
export async function showExplorerView(): Promise<void> {
  log('Show Explorer');
  const control = await new ActivityBar().getViewControl('Explorer');
  if (!control) {
    throw new Error('Could not open Explorer view in activity bar');
  }
  await control.openView();
}

/**
 * Zooms the editor view in or out by a specified level
 * @param zoomIn - Direction to zoom, either 'In' or 'Out'
 * @param zoomLevel - Number of zoom steps to perform
 * @param wait - Duration to wait between zoom operations
 */
export async function zoom(
  zoomIn: 'In' | 'Out',
  zoomLevel: number,
  wait: Duration = Duration.seconds(1)
): Promise<void> {
  await zoomReset(wait);
  for (let level = 0; level < zoomLevel; level++) {
    await executeQuickPick(`View: Zoom ${zoomIn}`, wait);
  }
}

/**
 * Resets the editor zoom level to the default
 * @param wait - Duration to wait after resetting zoom
 */
export async function zoomReset(wait: Duration = Duration.seconds(1)): Promise<void> {
  await executeQuickPick('View: Reset Zoom', wait);
}

/**
 * Opens a new terminal in the bottom panel
 */
export async function openNewTerminal(): Promise<void> {
  await new BottomBarPanel().openTerminalView();
}

/**
 * Handles either waiting for a specified duration or until a predicate resolves
 * @param predicateOrWait - Either a duration to wait or a predicate with timeout
 * @param prompt - The prompt to pass to the predicate
 * @throws Error if the predicate fails or times out
 * @private
 */
async function handlePredicateOrWait(predicateOrWait: PredicateWithTimeout | Duration, prompt: unknown) {
  log('handlePredicateOrWait');
  if (isDuration(predicateOrWait)) {
    if (predicateOrWait.milliseconds > 0) {
      await pause(predicateOrWait);
    }
  } else {
    const { predicate, maxWaitTime } = predicateOrWait;
    const safePredicate = withFailsafe(predicate, maxWaitTime, prompt);

    try {
      const result = await safePredicate();
      if (result !== true) {
        throw new Error('Predicate did not resolve to true');
      }
    } catch (error) {
      log(`Predicate failed or timed out: ${(error as Error).message}`);
      throw error;
    }
  }
}

/**
 * Creates a failsafe version of a predicate that will timeout after a specified duration
 * @param predicate - The original predicate function
 * @param timeout - Maximum time to wait for the predicate to resolve
 * @param prompt - The prompt to pass to the predicate
 * @returns A failsafe predicate function that will reject if it times out
 * @private
 */
function withFailsafe(
  predicate: (...args: unknown[]) => Promise<boolean>,
  timeout: Duration,
  prompt: unknown
): () => Promise<boolean> {
  return async function () {
    const timeoutPromise = new Promise<boolean>((_, reject) =>
      setTimeout(() => reject(new Error('Predicate timed out')), timeout.milliseconds)
    );

    return Promise.race([predicate(prompt), timeoutPromise]);
  };
}
