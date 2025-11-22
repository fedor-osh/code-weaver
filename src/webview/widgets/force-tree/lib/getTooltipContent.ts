export function getTooltipContent(data: any): string {
  if (data.type === "export") {
    // Tooltip for export nodes
    const defaultLabel = data.isDefault ? " (default)" : "";
    const typeLabel = data.isTypeOnly ? " [type]" : "";
    let content = `<div style="font-weight: bold; margin-bottom: 4px;">${data.name}${defaultLabel}${typeLabel}</div>`;
    content += `<div style="font-size: 11px; opacity: 0.9;">From: ${data.parentFile}</div>`;
    return content;
  } else {
    // Tooltip for file/folder nodes
    const importCount = data.imports?.length || 0;
    const exportCount = data.exports?.length || 0;

    let content = `<div style="font-weight: bold; margin-bottom: 4px;">${data.name}</div>`;

    if (importCount > 0 || exportCount > 0) {
      content += `<div style="font-size: 11px; opacity: 0.9;">`;
      if (importCount > 0) {
        content += `Imports: ${importCount}`;
      }
      if (importCount > 0 && exportCount > 0) {
        content += " • ";
      }
      if (exportCount > 0) {
        content += `Exports: ${exportCount}`;
      }
      content += `</div>`;
    }
    return content;
  }
}

