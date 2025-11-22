import * as React from "react";
import { FileTree } from "../../../widgets/file-tree/ui/FileTree";
import { CodeViewer } from "../../../widgets/code-viewer/ui/CodeViewer";
import { ForceTree } from "../../../widgets/force-tree/ui/ForceTree";
import { FileStructure } from "../../../entities/file-structure/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../shared/ui/card";

export function StructurePage() {
  const structure: FileStructure = window.folderStructure || {
    name: "No structure",
    type: "folder",
  };

  return (
    <div className='mx-auto p-6 space-y-6'>
      <div className='flex flex-col lg:flex-row gap-6'>
        <div className='lg:w-1/2'>
          <Card>
            <CardHeader>
              <CardTitle>File Tree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='max-h-[70vh] overflow-auto'>
                <FileTree structure={structure} />
              </div>
            </CardContent>
          </Card>
        </div>
        <div className='lg:w-1/2'>
          <CodeViewer structure={structure} />
        </div>
      </div>
      <div className='w-full'>
        <Card>
          <CardHeader>
            <CardTitle>Force-Directed Tree Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ForceTree structure={structure} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
