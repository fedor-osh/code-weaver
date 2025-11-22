export function getNodeFillColor(data: any, hasChildren: boolean): string {
  if (data.type === "export") {
    if (data.isDefault) {
      return "#ff6b6b"; // Red for default exports (same color regardless of type/object)
    } else {
      // Different colors for types vs objects
      return data.isTypeOnly ? "#9b59b6" : "#4ecdc4"; // Purple for types, teal for objects
    }
  }
  // Folders: hollow (no fill), Files: filled black
  return data.type === "folder" ? "none" : "#000";
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
  // Folders: black stroke for hollow circles, Files: black stroke for filled circles
  return "#000";
}

export function getNodeRadius(data: any): number {
  return data.type === "export" ? 2.5 : 3.5; // Smaller radius for export nodes
}

export function getNodeStrokeWidth(data: any): number {
  if (data.type === "export") {
    return 1;
  }
  // Folders: thicker stroke for visibility (hollow circles), Files: thinner stroke (filled circles)
  return data.type === "folder" ? 1.5 : 1;
}

