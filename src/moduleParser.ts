import * as fs from "fs";
import * as ts from "typescript";

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

export interface ModuleInfo {
  imports: ImportInfo[];
  exports: ExportInfo[];
}

export function parseModule(filePath: string): ModuleInfo | null {
  try {
    const sourceCode = fs.readFileSync(filePath, "utf-8");
    const ext = filePath.toLowerCase();
    const isJSX = ext.endsWith(".jsx") || ext.endsWith(".tsx");
    const isJS =
      ext.endsWith(".js") || ext.endsWith(".mjs") || ext.endsWith(".cjs");

    // Set appropriate language version for JSX files
    const languageVersion = isJSX
      ? ts.ScriptTarget.Latest
      : ts.ScriptTarget.Latest;

    const sourceFile = ts.createSourceFile(
      filePath,
      sourceCode,
      languageVersion,
      true,
      isJSX ? ts.ScriptKind.JSX : isJS ? ts.ScriptKind.JS : ts.ScriptKind.TS
    );

    const imports: ImportInfo[] = [];
    const exports: ExportInfo[] = [];

    function visit(node: ts.Node) {
      // Handle import declarations
      if (ts.isImportDeclaration(node)) {
        const importClause = node.importClause;
        const moduleSpecifier = node.moduleSpecifier;

        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const from = moduleSpecifier.text;
          const importNames: string[] = [];
          const isTypeOnly = node.importClause?.isTypeOnly || false;

          if (importClause) {
            // Default import
            if (importClause.name) {
              importNames.push(importClause.name.text);
            }

            // Named imports
            if (importClause.namedBindings) {
              if (ts.isNamespaceImport(importClause.namedBindings)) {
                importNames.push(
                  `* as ${importClause.namedBindings.name.text}`
                );
              } else if (ts.isNamedImports(importClause.namedBindings)) {
                importClause.namedBindings.elements.forEach((element) => {
                  const name = element.name.text;
                  const alias = element.propertyName
                    ? element.propertyName.text
                    : null;
                  importNames.push(alias ? `${alias} as ${name}` : name);
                });
              }
            }
          }

          if (importNames.length > 0 || from) {
            imports.push({
              from,
              imports: importNames.length > 0 ? importNames : ["default"],
              isTypeOnly,
            });
          }
        }
      }

      // Handle export declarations
      if (ts.isExportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          // Re-export from another module
          const from = moduleSpecifier.text;
          const exportSpecifiers: string[] = [];

          if (node.exportClause) {
            if (ts.isNamedExports(node.exportClause)) {
              node.exportClause.elements.forEach((element) => {
                const name = element.name.text;
                const alias = element.propertyName
                  ? element.propertyName.text
                  : null;
                exportSpecifiers.push(alias ? `${alias} as ${name}` : name);
              });
            } else if (ts.isNamespaceExport(node.exportClause)) {
              exportSpecifiers.push(`* as ${node.exportClause.name.text}`);
            }
          } else {
            // Export * from
            exportSpecifiers.push("*");
          }

          exports.push({
            name: `from '${from}'`,
            isTypeOnly: node.isTypeOnly || false,
          });
        } else if (node.exportClause) {
          // Named exports
          if (ts.isNamedExports(node.exportClause)) {
            node.exportClause.elements.forEach((element) => {
              const name = element.name.text;
              const alias = element.propertyName
                ? element.propertyName.text
                : null;
              exports.push({
                name: alias ? `${alias} as ${name}` : name,
                isTypeOnly: node.isTypeOnly || false,
              });
            });
          }
        }
      }

      // Handle export assignments (export =)
      if (ts.isExportAssignment(node)) {
        exports.push({
          name: "default",
          isDefault: true,
        });
      }

      // Handle variable statements with export keyword
      if (
        ts.isVariableStatement(node) &&
        node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        node.declarationList.declarations.forEach((declaration) => {
          if (ts.isIdentifier(declaration.name)) {
            exports.push({
              name: declaration.name.text,
            });
          }
        });
      }

      // Handle function declarations with export keyword
      if (
        ts.isFunctionDeclaration(node) &&
        node.name &&
        node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const isDefault = node.modifiers.some(
          (mod) => mod.kind === ts.SyntaxKind.DefaultKeyword
        );
        exports.push({
          name: node.name.text,
          isDefault,
        });
      }

      // Handle class declarations with export keyword
      if (
        ts.isClassDeclaration(node) &&
        node.name &&
        node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        const isDefault = node.modifiers.some(
          (mod) => mod.kind === ts.SyntaxKind.DefaultKeyword
        );
        exports.push({
          name: node.name.text,
          isDefault,
        });
      }

      // Handle interface/type declarations with export keyword
      if (
        (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
        node.name &&
        node.modifiers?.some((mod) => mod.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        exports.push({
          name: node.name.text,
          isTypeOnly: true,
        });
      }

      ts.forEachChild(node, visit);
    }

    visit(sourceFile);

    return {
      imports,
      exports,
    };
  } catch (error) {
    // If parsing fails, return null
    return null;
  }
}
