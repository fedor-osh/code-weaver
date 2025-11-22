export function getLinkStrokeColor(targetData: any): string {
  if (targetData.type === "export") {
    if (targetData.isDefault) {
      return "#ff6b6b"; // Red for default exports
    } else {
      return targetData.isTypeOnly ? "#9b59b6" : "#4ecdc4"; // Purple for types, teal for objects
    }
  }
  return "#999"; // Gray for folder/file links
}

