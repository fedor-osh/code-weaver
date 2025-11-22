export type FileLanguage = "ts" | "tsx" | "js" | "jsx";

export interface ImportInfo {
  from: string;
  imports: string[];
  isTypeOnly?: boolean;
}

export interface ExportInfo {
  name: string;
  isTypeOnly?: boolean;
  isDefault?: boolean;
}

export interface FileStructure {
  name: string;
  path: string;
  type: "file" | "folder";
  language?: FileLanguage;
  imports?: ImportInfo[];
  exports?: ExportInfo[];
  children?: FileStructure[];
}

declare global {
  interface Window {
    folderStructure: FileStructure;
  }
}

