import * as React from "react";
import { ChevronRight, ChevronDown, File, Folder } from "lucide-react";
import { FileStructure } from "../../../entities/file-structure/types";
import { Badge } from "../../../shared/ui/badge";
import { cn } from "../../../shared/lib/utils";

interface FileTreeProps {
  structure: FileStructure;
  level?: number;
}

export function FileTree({ structure, level = 0 }: FileTreeProps) {
  const [expanded, setExpanded] = React.useState(level < 2);

  const isFolder = structure.type === "folder";
  const hasChildren = structure.children && structure.children.length > 0;

  return (
    <div className='select-none'>
      <div
        className={cn(
          "flex items-center gap-2 py-1 px-2 rounded-md hover:bg-accent cursor-pointer",
          level > 0 && "ml-4"
        )}
        onClick={() => isFolder && hasChildren && setExpanded(!expanded)}
      >
        {isFolder && hasChildren ? (
          expanded ? (
            <ChevronDown className='h-4 w-4 text-muted-foreground' />
          ) : (
            <ChevronRight className='h-4 w-4 text-muted-foreground' />
          )
        ) : (
          <div className='w-4' />
        )}
        {isFolder ? (
          <Folder className='h-4 w-4 text-blue-500' />
        ) : (
          <File className='h-4 w-4 text-muted-foreground' />
        )}
        <span className='text-sm font-medium'>{structure.name}</span>

        {structure.imports && structure.imports.length > 0 && (
          <Badge variant='outline' className='text-xs'>
            {structure.imports.length} import
            {structure.imports.length !== 1 ? "s" : ""}
          </Badge>
        )}
        {structure.exports && structure.exports.length > 0 && (
          <Badge variant='outline' className='text-xs'>
            {structure.exports.length} export
            {structure.exports.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      {isFolder && hasChildren && expanded && (
        <div className='mt-1'>
          {structure.children!.map((child, index) => (
            <FileTree key={index} structure={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
