# Code Weaver

A VS Code extension that displays the repository folder and file structure as a TypeScript object.

## Features

- Scans the current workspace folder structure
- Displays the structure as a TypeScript object format
- React-based UI built with Vite for displaying the structure

## Development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Compile TypeScript extension code:

   ```bash
   npm run compile
   ```

3. Build React webview with Vite:

   ```bash
   npm run build:webview
   ```

   Or watch for changes:

   ```bash
   npm run watch:webview
   ```

4. Press `F5` in VS Code to open a new window with the extension loaded.

5. Run the command "Show Repository Structure" from the command palette (Cmd+Shift+P / Ctrl+Shift+P).

## Usage

1. Open a workspace folder in VS Code
2. Run the command `Code Weaver: Show Repository Structure` from the command palette
3. The extension will display the folder structure as a TypeScript object in a webview panel
