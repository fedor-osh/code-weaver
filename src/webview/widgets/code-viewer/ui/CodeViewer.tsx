import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/ui/card";
import { CopyButton } from "../../../features/copy-to-clipboard/ui/CopyButton";
import { formatAsTypeScript } from "../../../entities/file-structure/lib/format";
import {
  FileStructure,
  ImportInfo,
  ExportInfo,
} from "../../../entities/file-structure/types";
import { Badge } from "../../../shared/ui/badge";

interface CodeViewerProps {
  structure: FileStructure;
}

function formatDetailedStructure(
  obj: FileStructure,
  indent: number = 0
): string {
  const spaces = "  ".repeat(indent);
  const type = obj.type === "folder" ? "folder" : "file";

  if (obj.type === "file") {
    const parts: string[] = [
      `${spaces}  name: '${obj.name}',`,
      `${spaces}  path: '${obj.path}',`,
      `${spaces}  type: '${type}',`,
    ];

    if (obj.language) {
      parts.push(`${spaces}  language: '${obj.language}',`);
    }

    if (obj.imports && obj.imports.length > 0) {
      const importsStr = obj.imports
        .map((imp) => {
          const typeOnly = imp.isTypeOnly ? ", isTypeOnly: true" : "";
          return `${spaces}    { from: '${imp.from}', imports: [${imp.imports
            .map((i) => `'${i}'`)
            .join(", ")}]${typeOnly} }`;
        })
        .join(",\n");
      parts.push(`${spaces}  imports: [\n${importsStr}\n${spaces}  ],`);
    }

    if (obj.exports && obj.exports.length > 0) {
      const exportsStr = obj.exports
        .map((exp) => {
          const parts: string[] = [`name: '${exp.name}'`];
          if (exp.isDefault) parts.push("isDefault: true");
          if (exp.isTypeOnly) parts.push("isTypeOnly: true");
          return `${spaces}    { ${parts.join(", ")} }`;
        })
        .join(",\n");
      parts.push(`${spaces}  exports: [\n${exportsStr}\n${spaces}  ],`);
    }

    return `${spaces}{\n${parts.join("\n")}\n${spaces}}`;
  }

  if (obj.children && obj.children.length > 0) {
    const childrenStr = obj.children
      .map((child) => formatDetailedStructure(child, indent + 1))
      .join(",\n");

    return `${spaces}{\n${spaces}  name: '${obj.name}',\n${spaces}  path: '${obj.path}',\n${spaces}  type: '${type}',\n${spaces}  children: [\n${childrenStr}\n${spaces}  ],\n${spaces}}`;
  }

  return `${spaces}{\n${spaces}  name: '${obj.name}',\n${spaces}  path: '${obj.path}',\n${spaces}  type: '${type}',\n${spaces}  children: [],\n${spaces}}`;
}

function countItems(structure: FileStructure): {
  files: number;
  folders: number;
  totalImports: number;
  totalExports: number;
} {
  let files = 0;
  let folders = 0;
  let totalImports = 0;
  let totalExports = 0;

  function traverse(node: FileStructure) {
    if (node.type === "file") {
      files++;
      if (node.imports) {
        totalImports += node.imports.length;
      }
      if (node.exports) {
        totalExports += node.exports.length;
      }
    } else {
      folders++;
    }

    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  traverse(structure);
  return { files, folders, totalImports, totalExports };
}

export function CodeViewer({ structure }: CodeViewerProps) {
  const code = formatDetailedStructure(structure);
  const stats = countItems(structure);

  return (
    <Card className='w-full'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
        <CardTitle>Repository Structure</CardTitle>
        <CopyButton text={code} />
      </CardHeader>
      <CardContent>
        <div className='mb-4 flex flex-wrap gap-2'>
          <Badge variant='outline'>
            {stats.files} {stats.files === 1 ? "file" : "files"}
          </Badge>
          <Badge variant='outline'>
            {stats.folders} {stats.folders === 1 ? "folder" : "folders"}
          </Badge>
          <Badge variant='outline'>
            {stats.totalImports}{" "}
            {stats.totalImports === 1 ? "import" : "imports"}
          </Badge>
          <Badge variant='outline'>
            {stats.totalExports}{" "}
            {stats.totalExports === 1 ? "export" : "exports"}
          </Badge>
        </div>
        <pre className='overflow-auto rounded-md bg-muted p-4 text-sm max-h-[70vh] font-mono'>
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}
