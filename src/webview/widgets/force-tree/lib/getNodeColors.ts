export function getNodeFillColor(data: any, hasChildren: boolean): string {
  if (data.type === "export") {
    if (data.isDefault) {
      return "#ff6b6b"; // Red for default exports (same color regardless of type/object)
    } else {
      // Different colors for types vs objects
      return data.isTypeOnly ? "#9b59b6" : "#4ecdc4"; // Purple for types, teal for objects
    }
  }
  return hasChildren ? "#fff" : "#000"; // White for folders, black for files
}

export function getNodeStrokeColor(data: any, hasChildren: boolean): string {
  if (data.type === "export") {
    if (data.isDefault) {
      return "#c92a2a"; // Darker red border for default exports
    } else {
      // Different border colors for types vs objects
      return data.isTypeOnly ? "#7c3aed" : "#087f5b"; // Darker purple for types, darker teal for objects
    }
  }
  return hasChildren ? "#000" : "#fff"; // Black for folders, white for files
}

export function getNodeRadius(data: any): number {
  return data.type === "export" ? 2.5 : 3.5; // Smaller radius for export nodes
}

export function getNodeStrokeWidth(data: any): number {
  return data.type === "export" ? 1 : 1.5;
}

