import { FileStructure } from "../../../entities/file-structure/types";

export function convertToD3Data(fs: FileStructure): any {
  const data: any = {
    name: fs.name,
    type: fs.type,
    imports: fs.imports,
    exports: fs.exports,
  };

  const children: any[] = [];

  // Add folder/file children
  if (fs.children && fs.children.length > 0) {
    children.push(...fs.children.map(convertToD3Data));
  }

  // For file nodes, add export nodes as children
  if (fs.type === "file" && fs.exports && fs.exports.length > 0) {
    fs.exports.forEach((exp) => {
      children.push({
        name: exp.name,
        type: "export",
        isDefault: exp.isDefault,
        isTypeOnly: exp.isTypeOnly,
        parentFile: fs.name,
      });
    });
  }

  if (children.length > 0) {
    data.children = children;
  }

  return data;
}

