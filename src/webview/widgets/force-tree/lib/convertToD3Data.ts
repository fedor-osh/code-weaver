import { FileStructureWithId } from "./addIds";

export function convertToD3Data(fs: FileStructureWithId): any {
  const data: any = {
    name: fs.name,
    path: fs.path,
    type: fs.type,
    imports: fs.imports,
    exports: fs.exports,
    id: fs.id, // Preserve the ID
  };

  const children: any[] = [];

  // Add folder/file children
  if (fs.children && fs.children.length > 0) {
    children.push(...fs.children.map(convertToD3Data));
  }

  // For file nodes, add export nodes as children
  if (fs.type === "file" && fs.exports && fs.exports.length > 0) {
    fs.exports.forEach((exp) => {
      const exportId = `${fs.id}-export-${exp.name}`;
      children.push({
        name: exp.name,
        type: "export",
        isDefault: exp.isDefault,
        isTypeOnly: exp.isTypeOnly,
        parentFile: fs.name,
        parentFileId: fs.id,
        id: exportId, // Add ID for export nodes
      });
    });
  }

  if (children.length > 0) {
    data.children = children;
  }

  return data;
}

