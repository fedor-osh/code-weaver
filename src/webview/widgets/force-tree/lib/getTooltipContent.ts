import { ImportExportMap } from "./buildImportExportMap";

export function getTooltipContent(
  data: any,
  importExportMap?: ImportExportMap,
  allNodesMap?: Map<string, any>,
  isPinned: boolean = false,
  onUnpin?: () => void
): string {
  // Add unpin button if pinned
  let unpinButton = "";
  if (isPinned && onUnpin) {
    unpinButton = `<div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">
      <button 
        onclick="window.unpinTooltip()" 
        style="background: rgba(239, 68, 68, 0.8); color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold;"
        onmouseover="this.style.background='rgba(239, 68, 68, 1)'"
        onmouseout="this.style.background='rgba(239, 68, 68, 0.8)'"
      >Unpin</button>
    </div>`;
  }

  if (data.type === "export") {
    // Tooltip for export nodes
    const defaultLabel = data.isDefault ? " (default)" : "";
    const typeLabel = data.isTypeOnly ? " [type]" : "";
    let content = unpinButton;
    content += `<div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${data.name}${defaultLabel}${typeLabel}</div>`;
    content += `<div style="font-size: 11px; opacity: 0.9; margin-bottom: 8px;">From: ${data.parentFile}</div>`;

    // Show all files that import this export
    if (importExportMap) {
      const nodeId = data.id;
      const importingFiles = importExportMap.exportToFiles.get(nodeId);
      const reExportToFilesMap = importExportMap.exportToReExportToFiles?.get(nodeId);

      if (importingFiles && importingFiles.size > 0) {
        content += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">`;
        content += `<div style="font-weight: bold; margin-bottom: 4px; font-size: 12px;">Imported by (${importingFiles.size}):</div>`;

        // Get file names from IDs
        const directImports: string[] = [];
        const reExportImports: Map<string, string[]> = new Map();

        if (reExportToFilesMap && reExportToFilesMap.size > 0) {
          // Track files that import through re-exports
          reExportToFilesMap.forEach((importingFilesSet, reExportFileId) => {
            const reExportFileNode = allNodesMap?.get(reExportFileId);
            const reExportFileName = reExportFileNode?.data?.name || reExportFileId;
            const filesThroughReExport: string[] = [];

            importingFilesSet.forEach((fileId) => {
              const fileNode = allNodesMap?.get(fileId);
              if (fileNode) {
                filesThroughReExport.push(fileNode.data.name);
              }
            });

            if (filesThroughReExport.length > 0) {
              reExportImports.set(reExportFileName, filesThroughReExport);
            }
          });

          // Find direct imports (not through re-exports)
          importingFiles.forEach((fileId) => {
            let isDirectImport = true;
            reExportToFilesMap.forEach((importingFilesSet) => {
              if (importingFilesSet.has(fileId)) {
                isDirectImport = false;
              }
            });
            if (isDirectImport) {
              const fileNode = allNodesMap?.get(fileId);
              if (fileNode) {
                directImports.push(fileNode.data.name);
              }
            }
          });
        } else {
          // All imports are direct
          importingFiles.forEach((fileId) => {
            const fileNode = allNodesMap?.get(fileId);
            if (fileNode) {
              directImports.push(fileNode.data.name);
            }
          });
        }

        // Display direct imports
        if (directImports.length > 0) {
          directImports.forEach((fileName) => {
            content += `<div style="font-size: 11px; opacity: 0.9; margin-left: 8px; margin-bottom: 2px;">• ${fileName}</div>`;
          });
        }

        // Display imports through re-exports
        if (reExportImports.size > 0) {
          reExportImports.forEach((files, reExportFile) => {
            content += `<div style="font-size: 11px; opacity: 0.9; margin-left: 8px; margin-top: 4px; margin-bottom: 2px; font-style: italic;">via ${reExportFile}:</div>`;
            files.forEach((fileName) => {
              content += `<div style="font-size: 11px; opacity: 0.9; margin-left: 16px; margin-bottom: 2px;">• ${fileName}</div>`;
            });
          });
        }

        content += `</div>`;
      }
    }

    return content;
  } else {
    // Tooltip for file/folder nodes
    let content = unpinButton;
    content += `<div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${data.name}</div>`;

    // Show all exports from this file
    if (data.exports && data.exports.length > 0) {
      content += `<div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2);">`;
      content += `<div style="font-weight: bold; margin-bottom: 4px; font-size: 12px;">Exports (${data.exports.length}):</div>`;
      data.exports.forEach((exp: any) => {
        const defaultLabel = exp.isDefault ? " (default)" : "";
        const typeLabel = exp.isTypeOnly ? " [type]" : "";
        content += `<div style="font-size: 11px; opacity: 0.9; margin-left: 8px; margin-bottom: 2px;">• ${exp.name}${defaultLabel}${typeLabel}</div>`;
      });
      content += `</div>`;
    }

    // Show all imports to this file
    if (data.imports && data.imports.length > 0) {
      content += `<div style="margin-bottom: 8px;">`;
      content += `<div style="font-weight: bold; margin-bottom: 4px; font-size: 12px;">Imports (${data.imports.length}):</div>`;
      data.imports.forEach((imp: any) => {
        const typeLabel = imp.isTypeOnly ? " [type]" : "";
        const importsList = imp.imports && imp.imports.length > 0 
          ? `{ ${imp.imports.join(", ")} }` 
          : "*";
        content += `<div style="font-size: 11px; opacity: 0.9; margin-left: 8px; margin-bottom: 4px;">`;
        content += `<div>from "${imp.from}"${typeLabel}</div>`;
        content += `<div style="margin-left: 12px; opacity: 0.8;">${importsList}</div>`;
        content += `</div>`;
      });
      content += `</div>`;
    }

    // Show files that import exports from this file (if available)
    if (importExportMap && data.id) {
      const fileExports = importExportMap.fileToExports.get(data.id);
      if (fileExports && fileExports.size > 0) {
        // Get unique files that import any export from this file
        const importingFiles = new Set<string>();
        fileExports.forEach((exportId) => {
          const files = importExportMap.exportToFiles.get(exportId);
          if (files) {
            files.forEach((fileId) => importingFiles.add(fileId));
          }
        });

        if (importingFiles.size > 0) {
          content += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">`;
          content += `<div style="font-weight: bold; margin-bottom: 4px; font-size: 12px;">Exports imported by (${importingFiles.size}):</div>`;
          importingFiles.forEach((fileId) => {
            const fileNode = allNodesMap?.get(fileId);
            if (fileNode) {
              content += `<div style="font-size: 11px; opacity: 0.9; margin-left: 8px; margin-bottom: 2px;">• ${fileNode.data.name}</div>`;
            }
          });
          content += `</div>`;
        }
      }
    }

    return content;
  }
}

