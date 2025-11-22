import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../shared/ui/card";
import { CopyButton } from "../../../features/copy-to-clipboard/ui/CopyButton";
import { formatAsTypeScript } from "../../../entities/file-structure/lib/format";
import { FileStructure } from "../../../entities/file-structure/types";

interface CodeViewerProps {
  structure: FileStructure;
}

export function CodeViewer({ structure }: CodeViewerProps) {
  const code = formatAsTypeScript(structure);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Repository Structure</CardTitle>
        <CopyButton text={code} />
      </CardHeader>
      <CardContent>
        <pre className="overflow-auto rounded-md bg-muted p-4 text-sm max-h-[70vh] font-mono">
          <code>{code}</code>
        </pre>
      </CardContent>
    </Card>
  );
}

