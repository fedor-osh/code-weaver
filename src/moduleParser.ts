import * as fs from "fs";
import * as path from "path";
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

/**
 * Finds and loads the appropriate tsconfig.json for a given file path
 */
function loadCompilerOptions(filePath: string): ts.CompilerOptions {
  // Try to find workspace root by looking for tsconfig.json
  let workspaceRoot = path.dirname(filePath);
  let configPath: string | undefined;

  // Walk up the directory tree to find tsconfig files
  let currentDir = path.dirname(filePath);
  const root = path.parse(filePath).root;

  while (currentDir !== root) {
    const webviewConfigPath = path.join(currentDir, "tsconfig.webview.json");
    const mainConfigPath = path.join(currentDir, "tsconfig.app.json");

    // Check if file is in webview directory, use tsconfig.webview.json
    const normalizedFilePath = path.normalize(filePath);
    const webviewDir = path.join(currentDir, "src", "webview");
    const normalizedWebviewDir = path.normalize(webviewDir);

    if (
      normalizedFilePath.startsWith(normalizedWebviewDir) &&
      fs.existsSync(webviewConfigPath)
    ) {
      configPath = webviewConfigPath;
      workspaceRoot = currentDir;
      break;
    }

    // Check for main tsconfig.json
    if (fs.existsSync(mainConfigPath)) {
      configPath = mainConfigPath;
      workspaceRoot = currentDir;
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  if (configPath) {
    const configFile = ts.readConfigFile(configPath, (file) =>
      fs.readFileSync(file, "utf-8")
    );
    if (configFile.config) {
      const parsedConfig = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );
      return parsedConfig.options;
    }
  }

  // Default options if no config found
  return {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
  };
}

/**
 * Resolves a module name using TypeScript's module resolution
 */
function resolveModuleName(
  moduleName: string,
  containingFile: string,
  compilerOptions: ts.CompilerOptions
): string {
  // Skip resolution for relative paths and absolute paths
  if (moduleName.startsWith(".") || path.isAbsolute(moduleName)) {
    return moduleName;
  }

  // Skip if no path mappings configured
  if (!compilerOptions.paths) {
    return moduleName;
  }

  // Find workspace root by looking for tsconfig.json
  let workspaceRoot = path.dirname(containingFile);
  let currentDir = path.dirname(containingFile);
  const root = path.parse(containingFile).root;

  while (currentDir !== root) {
    const configPath = path.join(currentDir, "tsconfig.json");
    if (fs.existsSync(configPath)) {
      workspaceRoot = currentDir;
      break;
    }
    currentDir = path.dirname(currentDir);
  }

  // Create a module resolution host
  const host: ts.ModuleResolutionHost = {
    fileExists: (fileName: string) => {
      try {
        return fs.statSync(fileName).isFile();
      } catch {
        return false;
      }
    },
    readFile: (fileName: string) => {
      try {
        return fs.readFileSync(fileName, "utf-8");
      } catch {
        return undefined;
      }
    },
    getCurrentDirectory: () => workspaceRoot,
  };

  // Ensure baseUrl is set for path resolution
  const optionsWithBaseUrl: ts.CompilerOptions = {
    ...compilerOptions,
    baseUrl: compilerOptions.baseUrl || workspaceRoot,
  };

  // Resolve the module name
  const resolved = ts.resolveModuleName(
    moduleName,
    containingFile,
    optionsWithBaseUrl,
    host
  );

  if (resolved.resolvedModule?.resolvedFileName) {
    const resolvedPath = resolved.resolvedModule.resolvedFileName;

    // Skip if resolved to node_modules or outside workspace
    if (resolvedPath.includes("node_modules")) {
      return moduleName;
    }

    // Convert absolute path to relative path from workspace root
    if (path.isAbsolute(resolvedPath)) {
      try {
        const relativePath = path.relative(workspaceRoot, resolvedPath);
        // Normalize to use forward slashes and ensure it's a valid relative path
        if (!relativePath.startsWith("..")) {
          return relativePath.replace(/\\/g, "/");
        }
      } catch {
        // If relative path calculation fails, return original
        return moduleName;
      }
    }

    return resolvedPath.replace(/\\/g, "/");
  }

  // If resolution failed, return original module name
  return moduleName;
}

export function parseModule(filePath: string): ModuleInfo | null {
  try {
    const sourceCode = fs.readFileSync(filePath, "utf-8");
    const ext = filePath.toLowerCase();
    const isJSX = ext.endsWith(".jsx") || ext.endsWith(".tsx");
    const isJS =
      ext.endsWith(".js") || ext.endsWith(".mjs") || ext.endsWith(".cjs");

    // Load compiler options for module resolution
    const compilerOptions = loadCompilerOptions(filePath);

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
          const originalFrom = moduleSpecifier.text;
          // Resolve module name to handle path aliases
          const resolvedFrom = resolveModuleName(
            originalFrom,
            filePath,
            compilerOptions
          );
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

          if (importNames.length > 0 || resolvedFrom) {
            imports.push({
              from: resolvedFrom,
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
          const originalFrom = moduleSpecifier.text;
          // Resolve module name to handle path aliases
          const resolvedFrom = resolveModuleName(
            originalFrom,
            filePath,
            compilerOptions
          );
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
            name: `from '${resolvedFrom}'`,
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
