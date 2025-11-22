import { FileStructure } from "../types";

export function formatAsTypeScript(
  obj: FileStructure,
  indent: number = 0
): string {
  const spaces = "  ".repeat(indent);
  const type = obj.type === "folder" ? "folder" : "file";

  if (obj.type === "file") {
    const parts: string[] = [
      `${spaces}  name: '${obj.name}',`,
      `${spaces}  type: '${type}',`,
    ];

    if (obj.language) {
      parts.push(`${spaces}  language: '${obj.language}',`);
    }

    if (obj.imports && obj.imports.length > 0) {
      const importsStr = obj.imports
        .map((imp) => {
          return `${spaces}    { from: '${imp.from}', imports: [${imp.imports
            .map((i) => `'${i}'`)
            .join(", ")}]${imp.isTypeOnly ? ", isTypeOnly: true" : ""} }`;
        })
        .join(",\n");
      parts.push(`${spaces}  imports: [\n${importsStr}\n${spaces}  ],`);
    }

    if (obj.exports && obj.exports.length > 0) {
      const exportsStr = obj.exports
        .map((exp) => {
          return `${spaces}    { name: '${exp.name}'${
            exp.isDefault ? ", isDefault: true" : ""
          }${exp.isTypeOnly ? ", isTypeOnly: true" : ""} }`;
        })
        .join(",\n");
      parts.push(`${spaces}  exports: [\n${exportsStr}\n${spaces}  ],`);
    }

    return `${spaces}{\n${parts.join("\n")}\n${spaces}}`;
  }

  if (obj.children && obj.children.length > 0) {
    const childrenStr = obj.children
      .map((child) => formatAsTypeScript(child, indent + 1))
      .join(",\n");

    return `${spaces}{\n${spaces}  name: '${obj.name}',\n${spaces}  type: '${type}',\n${spaces}  children: [\n${childrenStr}\n${spaces}  ],\n${spaces}}`;
  }

  return `${spaces}{\n${spaces}  name: '${obj.name}',\n${spaces}  type: '${type}',\n${spaces}  children: [],\n${spaces}}`;
}

