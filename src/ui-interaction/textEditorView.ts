import { By, CodeLens, EditorView, Key, TextEditor, Workbench } from 'vscode-extension-tester';
import { executeQuickPick } from './commandPrompt';
import { Duration, log, openFile, pause } from '../core/miscellaneous';
import { getBrowser } from './workbench';
import { retryOperation } from '../retryUtils';
import * as fs from 'node:fs/promises';
import { createOrOverwriteFile } from '../system-operations/fileSystem';

/**
 * Gets a text editor for a specific file
 * @param workbench - The VSCode workbench instance
 * @param fileName - Name of the file to open and edit
 * @returns A TextEditor instance for the specified file
 */
export async function getTextEditor(workbench: Workbench, fileName: string): Promise<TextEditor> {
  log(`calling getTextEditor(${fileName})`);

  log('getTextEditor() - Attempting to open file');
  const inputBox = await executeQuickPick('Go to File...', Duration.seconds(1));
  log('getTextEditor() - executeQuickPick() - inputBox');
  await inputBox.setText(fileName);
  log(`getTextEditor() - executeQuickPick() - inputBox.setText(${fileName})`);
  await inputBox.confirm();
  log('getTextEditor() - executeQuickPick() - inputBox.confirm()');
  await pause(Duration.seconds(1));

  log('getTextEditor() - File opened, getting editor view');

  const editorView = workbench.getEditorView();

  // Add retry logic specifically around the openEditor call that fails
  const textEditor = await retryOperation(async () => {
    log('getTextEditor() - Attempting to open editor...');
    return (await editorView.openEditor(fileName)) as TextEditor;
  }, 3, 'Failed to open editor after retries');

  await pause(Duration.seconds(2));
  return textEditor;
}

/**
 * Checks if a file is open in the editor
 * @param workbench - The VSCode workbench instance
 * @param name - The name of the file to check
 * @param options - Optional configuration including timeout and error message
 * @throws Timeout error if the file isn't open within the specified timeout
 */
export async function checkFileOpen(
  workbench: Workbench,
  name: string,
  options: { msg?: string; timeout?: Duration } = { timeout: Duration.milliseconds(30_000) }
) {
  await getBrowser().wait(
    async () => {
      try {
        const editorView = workbench.getEditorView();
        const activeTab = await editorView.getActiveTab();
        if (activeTab != undefined && name == (await activeTab.getTitle())) {
          return true;
        } else return false;
      } catch (error) {
        return false;
      }
    },
    options.timeout?.milliseconds,
    options.msg ?? `Expected to find file ${name} open in TextEditor before ${options.timeout}`,
    500 // Check every 500 ms
  );
}

/**
 * Waits for a file to be open in the editor with a 30-second timeout
 * @param workbench - The VSCode workbench instance
 * @param fileName - Name of the file to wait for
 * @returns Promise that resolves when file is open or rejects on timeout
 */
export async function waitForFileOpen(workbench: Workbench, fileName: string): Promise<void> {
  const timeout = 20_000; // 20 seconds
  const checkInterval = 500; // Check every 500ms
  const startTime = Date.now();
  const endTime = startTime + timeout;
  let attemptCount = 0;

  log(`waitForFileOpen() - Starting wait for file: ${fileName}`);
  log(`waitForFileOpen() - Timeout: ${timeout}ms, Check interval: ${checkInterval}ms`);

  while (Date.now() < endTime) {
    attemptCount++;
    const currentTime = Date.now();
    const elapsedTime = currentTime - startTime;
    const remainingTime = endTime - currentTime;

    log(`waitForFileOpen() - Attempt ${attemptCount}, Elapsed: ${elapsedTime}ms, Remaining: ${remainingTime}ms`);

    try {
      const editorView = workbench.getEditorView();
      log(`waitForFileOpen() - Got editor view`);

      // Try to get the active tab with a shorter timeout
      let activeTab;
      try {
        // Use a promise race to implement our own timeout for getActiveTab
        activeTab = await Promise.race([
          editorView.getActiveTab(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('getActiveTab timeout')), 5000)
          )
        ]);
      } catch (tabError) {
        log(`waitForFileOpen() - getActiveTab failed: ${tabError}`);

        // Try alternative approach: check if any tabs exist
        try {
          const tabs = await editorView.getOpenTabs();
          log(`waitForFileOpen() - Found ${tabs.length} open tabs`);
          if (tabs.length > 0) {
            // Try to find our target file in the open tabs
            for (const tab of tabs) {
              try {
                const tabTitle = await tab.getTitle();
                log(`waitForFileOpen() - Checking tab: "${tabTitle}"`);
                if (tabTitle === fileName) {
                  log(`waitForFileOpen() - SUCCESS: Found target file in open tabs after ${elapsedTime}ms and ${attemptCount} attempts`);
                  return;
                }
              } catch (titleError) {
                log(`waitForFileOpen() - Error getting tab title: ${titleError}`);
              }
            }
          }
        } catch (tabsError) {
          log(`waitForFileOpen() - Error getting open tabs: ${tabsError}`);
        }

        // Continue to next iteration if all approaches failed
        log(`waitForFileOpen() - All tab approaches failed, continuing to wait...`);
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        continue;
      }

      if (activeTab) {
        const tabTitle = await activeTab.getTitle();
        log(`waitForFileOpen() - Active tab title: "${tabTitle}", Expected: "${fileName}"`);

        if (tabTitle === fileName) {
          log(`waitForFileOpen() - SUCCESS: File ${fileName} is now open in editor after ${elapsedTime}ms and ${attemptCount} attempts`);
          return; // File is open, success!
        } else {
          log(`waitForFileOpen() - File not matched, continuing to wait...`);
        }
      } else {
        log(`waitForFileOpen() - No active tab found, continuing to wait...`);
      }
    } catch (error) {
      // Continue checking if there's an error getting editor state
      log(`waitForFileOpen() - Error checking file open status (attempt ${attemptCount}): ${error}`);
    }

    // Wait before next check
    log(`waitForFileOpen() - Waiting ${checkInterval}ms before next check...`);
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  // If we reach here, timeout occurred
  const totalElapsed = Date.now() - startTime;
  const errorMsg = `Timeout: File ${fileName} was not found open in editor after ${totalElapsed}ms (${attemptCount} attempts)`;
  log(`waitForFileOpen() - TIMEOUT: ${errorMsg}`);
  throw new Error(errorMsg);
}

/**
 * Opens a file and retrieves its text content
 * @param filePath - The path to the file to open
 * @returns The text content of the file
 */
export async function attemptToFindTextEditorText(filePath: string): Promise<string> {
  await openFile(filePath);
  const fileName = filePath.substring(filePath.lastIndexOf(process.platform === 'win32' ? '\\' : '/') + 1);
  const editorView = new EditorView();
  const editor = await editorView.openEditor(fileName);
  return await editor.getText();
}

/**
 * Overwrites the entire content of a file using filesystem operations
 * @param textEditor - The text editor instance containing the file to modify
 * @param classText - The new content to write to the file
 * @throws Error if file write operation fails or content verification fails
 */
export async function overrideTextInFile(textEditor: TextEditor, classText: string) {
  // Use fs.writeFileSync() to write the new content to the file
  try {
    const filePath = await textEditor.getFilePath();
    // Write new content to file
    log(`overrideTextInFile() - Writing content to file: ${filePath}`);
    createOrOverwriteFile(filePath, classText);
    log(`overrideTextInFile() - Successfully wrote ${classText.length} characters to ${filePath}`);

    // Give the editor time to detect the file change and reload
    await pause(Duration.seconds(1));

    // Verify the write was successful by reading it back
    const writtenContent = await fs.readFile(filePath, 'utf8');
    const normalizeText = (str: string) => str.replace(/\s+/g, '');
    const normalizedWritten = normalizeText(writtenContent);
    const normalizedExpected = normalizeText(classText);

    if (normalizedWritten !== normalizedExpected) {
      throw new Error(`File write verification failed. Written content does not match expected content.`);
    }

    log('overrideTextInFile() - File content verified successfully');
  } catch (error) {
    log(`overrideTextInFile() - File system operation failed: ${error}`);
    throw new Error(`File system text replacement failed: ${error}`);
  }
}

export async function waitForAndGetCodeLens(textEditor: TextEditor, codeLensName: string): Promise<CodeLens> {
  log(`waitForAndGetCodeLens() - Waiting for code lens: ${codeLensName}`);
  return await retryOperation(async () => {
    const lens = await textEditor.getCodeLens(codeLensName);
    if (!lens) {
      log(`waitForAndGetCodeLens() - Code lens ${codeLensName} NOT FOUND`);
      throw new Error(`Code lens ${codeLensName} not found`);
    }
    log(`waitForAndGetCodeLens() - Code lens ${codeLensName} found`);
    return lens;
  }, 3);
}


/**
 * Wrapper function for moveCursor with fallback mechanism using inputarea monaco-mouse-cursor-text selector
 * @param textEditor - The text editor instance
 * @param line - The line number to move to
 * @param column - The column number to move to
 */
export const moveCursorWithFallback = async (textEditor: TextEditor, line: number, column: number) => {
  try {
    // First try the original moveCursor approach
    await textEditor.moveCursor(line, column);
    log(`moveCursorWithFallback() - Successfully moved cursor to line ${line}, column ${column} using original method`);
  } catch (error) {
    // Fallback when moveCursor fails due to .native-edit-context selector issues
    log(`moveCursorWithFallback() - Original moveCursor failed, trying fallback approach: ${String(error)}`);

    try {
      // Find the editor element using the fallback selector
      const browser = getBrowser();
      const editorElement = await browser.findElement(By.css('.inputarea.monaco-mouse-cursor-text'));

      if (!editorElement) {
        throw new Error('Could not find editor element using fallback selector .inputarea.monaco-mouse-cursor-text');
      }

      log('moveCursorWithFallback() - Found editor element using fallback selector');

      // Get current coordinates (fallback method)
      const getCurrentCoordinates = async () => {
        try {
          return await textEditor.getCoordinates();
        } catch (coordError) {
          log(`moveCursorWithFallback() - getCoordinates() failed: ${String(coordError)}`);
          // Return a default position if coordinates can't be retrieved
          return [1, 1];
        }
      };

      // Check if we're at the target line
      const isAtLine = async (targetLine: number) => {
        try {
          const coords = await getCurrentCoordinates();
          return coords[0] === targetLine;
        } catch {
          return false;
        }
      };

      // Check if we're at the target column
      const isAtColumn = async (targetColumn: number) => {
        try {
          const coords = await getCurrentCoordinates();
          return coords[1] === targetColumn;
        } catch {
          return false;
        }
      };

      // Move to target line (mimic moveCursorToLine)
      const coordinates = await getCurrentCoordinates();
      const lineGap = coordinates[0] - line;
      const lineKey = lineGap >= 0 ? Key.UP : Key.DOWN;

      for (let i = 0; i < Math.abs(lineGap); i++) {
        if (await isAtLine(line)) {
          break;
        }
        await editorElement.sendKeys(lineKey);
        await pause(Duration.milliseconds(50));
      }

      log(`moveCursorWithFallback() - Successfully moved cursor to line ${line} using fallback method`);

      // Move to target column (mimic moveCursorToColumn)
      const currentCoords = await getCurrentCoordinates();
      const columnGap = currentCoords[1] - column;
      const columnKey = columnGap >= 0 ? Key.LEFT : Key.RIGHT;

      for (let i = 0; i < Math.abs(columnGap); i++) {
        if (await isAtColumn(column)) {
          break;
        }
        await editorElement.sendKeys(columnKey);
        await pause(Duration.milliseconds(50));

        // Check if we moved to a different line (mimic original error handling)
        const newCoords = await getCurrentCoordinates();
        if (newCoords[0] !== currentCoords[0]) {
          throw new Error(`Column number ${column} is not accessible on line ${currentCoords[0]}`);
        }
      }

      log(`moveCursorWithFallback() - Successfully moved cursor to column ${column} using fallback method`);
    } catch (fallbackError) {
      log(`moveCursorWithFallback() - Fallback approach also failed: ${String(fallbackError)}`);
      throw new Error(`Failed to move cursor using both original and fallback methods: ${String(fallbackError)}`);
    }
  }
};

/** Replace a specific line in a file using fs operations
 * @param filePath - The path to the file to modify
 * @param lineNumber - The line number to replace (1-based index)
 * @param newContent - The new content to write
*/
export async function replaceLineInFile(filePath: string, lineNumber: number, newContent: string): Promise<void> {
  const fileContent = await fs.readFile(filePath, 'utf8');
  const lines = fileContent.split('\n');

  // Replace the specific line (1-based to 0-based index)
  lines[lineNumber - 1] = newContent;

  createOrOverwriteFile(filePath, lines.join('\n'));
}
