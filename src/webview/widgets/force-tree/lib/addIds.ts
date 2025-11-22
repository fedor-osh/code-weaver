import { FileStructure } from "../../../entities/file-structure/types";

export interface FileStructureWithId extends FileStructure {
  id: string;
  children?: FileStructureWithId[];
}

let idCounter = 0;

export function addIdsToStructure(
  fs: FileStructure,
  parentPath: string = ""
): FileStructureWithId {
  const currentPath = parentPath ? `${parentPath}/${fs.name}` : fs.name;
  const id = `file-${idCounter++}`;

  const result: FileStructureWithId = {
    ...fs,
    id,
    children: fs.children?.map((child) =>
      addIdsToStructure(child, currentPath)
    ),
  };

  return result;
}

export function resetIdCounter() {
  idCounter = 0;
}
