import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { getFolderStructure } from "./folderScanner";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "codeWeaver.showStructure",
    () => {
      FolderStructurePanel.createOrShow(context.extensionUri);
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

class FolderStructurePanel {
  public static currentPanel: FolderStructurePanel | undefined;
  public static readonly viewType = "codeWeaverStructure";

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        "Please open a workspace folder to view the repository structure."
      );
      return;
    }

    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (FolderStructurePanel.currentPanel) {
      FolderStructurePanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      FolderStructurePanel.viewType,
      "Repository Structure",
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, "out", "webview"),
        ],
      }
    );

    FolderStructurePanel.currentPanel = new FolderStructurePanel(
      panel,
      extensionUri
    );
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._update();

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "refresh":
            this._update();
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public dispose() {
    FolderStructurePanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return this._getErrorHtml("No workspace folder found");
    }

    const folderStructure = getFolderStructure(workspaceFolder.uri.fsPath);
    const structureJson = JSON.stringify(folderStructure, null, 2);

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "webview.js")
    );
    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "webview.css")
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Repository Structure</title>
        <link rel="stylesheet" href="${cssUri}">
      </head>
      <body>
        <div id="root"></div>
        <script>
          window.folderStructure = ${structureJson};
        </script>
        <script type="module" src="${scriptUri}"></script>
      </body>
      </html>`;
  }

  private _getErrorHtml(message: string): string {
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "webview.js")
    );
    const cssUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "webview", "webview.css")
    );

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Error</title>
        <link rel="stylesheet" href="${cssUri}">
      </head>
      <body>
        <div style="padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
          <h1 style="color: #d32f2f;">Error</h1>
          <p style="font-size: 16px; line-height: 1.5;">${message}</p>
          <p style="margin-top: 20px; color: #666;">
            Please open a workspace folder in VS Code and try again.
          </p>
        </div>
      </body>
      </html>`;
  }
}
