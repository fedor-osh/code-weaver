import * as React from "react";

interface FileStructure {
  name: string;
  type: "file" | "folder";
  children?: FileStructure[];
}

declare global {
  interface Window {
    folderStructure: FileStructure;
  }
}

const App: React.FC = () => {
  const structure = window.folderStructure || {
    name: "No structure",
    type: "folder",
  };

  const formatAsTypeScript = (
    obj: FileStructure,
    indent: number = 0
  ): string => {
    const spaces = "  ".repeat(indent);
    const type = obj.type === "folder" ? "folder" : "file";

    if (obj.type === "file") {
      return `${spaces}{\n${spaces}  name: '${obj.name}',\n${spaces}  type: '${type}',\n${spaces}}`;
    }

    if (obj.children && obj.children.length > 0) {
      const childrenStr = obj.children
        .map((child) => formatAsTypeScript(child, indent + 1))
        .join(",\n");

      return `${spaces}{\n${spaces}  name: '${obj.name}',\n${spaces}  type: '${type}',\n${spaces}  children: [\n${childrenStr}\n${spaces}  ],\n${spaces}}`;
    }

    return `${spaces}{\n${spaces}  name: '${obj.name}',\n${spaces}  type: '${type}',\n${spaces}  children: [],\n${spaces}}`;
  };

  const tsObject = formatAsTypeScript(structure);

  return (
    <div style={{ padding: "20px", fontFamily: "monospace" }}>
      <h1>Repository Structure</h1>
      <pre
        style={{
          background: "#f5f5f5",
          color: "#000",
          padding: "15px",
          borderRadius: "5px",
          overflow: "auto",
          maxHeight: "80vh",
          border: "1px solid #ddd",
        }}
      >
        {tsObject}
      </pre>
    </div>
  );
};

export default App;
