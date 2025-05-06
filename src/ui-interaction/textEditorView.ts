import { EditorView, TextEditor, Workbench } from 'vscode-extension-tester';
import { executeQuickPick } from './commandPrompt';
import { Duration, log, openFile, pause } from '../core/miscellaneous';
import { getBrowser } from './workbench';

/**
 * Gets a text editor for a specific file
 * @param workbench - The VSCode workbench instance
 * @param fileName - Name of the file to open and edit
 * @returns A TextEditor instance for the specified file
 */
export async function getTextEditor(workbench: Workbench, fileName: string): Promise<TextEditor> {
  log(`calling getTextEditor(${fileName})`);
  const inputBox = await executeQuickPick('Go to File...', Duration.seconds(1));
  await inputBox.setText(fileName);
  await inputBox.confirm();
  await pause(Duration.seconds(1));
  const editorView = workbench.getEditorView();
  const textEditor = (await editorView.openEditor(fileName)) as TextEditor;
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
  options: { msg?: string; timeout?: Duration } = { timeout: Duration.milliseconds(10_000) }
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
