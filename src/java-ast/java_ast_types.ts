import { Range, Position } from 'vscode-languageserver-protocol';

// Base interface for any AST node from java-ast, likely an ANTLR RuleContext
export interface JavaAstNode {
  /** The type of the node, often corresponds to the grammar rule name */
  readonly kind: string; // Or a more specific enum/string literal union if known

  /** Text content of this node and its children */
  readonly text: string;

  /** Parent node in the AST */
  readonly parent?: JavaAstNode;

  /** Children of this node */
  readonly children?: JavaAstNode[];

  /** Start position in the source file */
  readonly start: Position; // Assuming it provides detailed position

  /** End position in the source file */
  readonly end: Position; // Assuming it provides detailed position

  /**
   * Allows accessing specific child rule contexts by name and index.
   * Example: expression(0) would get the first 'expression' child.
   * The return type is generic because child types vary.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // For specific rule accessors like typeName(), expression(), etc.
}

// --- Specific AST Node Types (Examples - will need to match java-ast's actual output) ---

export interface CompilationUnitNode extends JavaAstNode {
  readonly kind: 'CompilationUnit'; // Example kind
  // packageDeclaration?: PackageDeclarationNode;
  // importDeclaration?: ImportDeclarationNode[];
  typeDeclaration?: TypeDeclarationNode[];
}

export interface TypeDeclarationNode extends JavaAstNode {
  readonly kind: 'TypeDeclaration';
  // classDeclaration?: ClassDeclarationNode;
  // interfaceDeclaration?: InterfaceDeclarationNode;
  // enumDeclaration?: EnumDeclarationNode;
}

export interface ClassDeclarationNode extends JavaAstNode {
  readonly kind: 'ClassDeclaration';
  Identifier: () => TerminalNode; // Assuming Identifier() returns a terminal node for the class name
  // classBody: ClassBodyNode;
  // modifiers, superclass, interfaces etc.
}

export interface MethodDeclarationNode extends JavaAstNode {
  readonly kind: 'MethodDeclaration';
  Identifier: () => TerminalNode; // Method name
  // methodBody?: BlockNode;
  // parameters, returnType, modifiers, annotations etc.
}

export interface AnnotationNode extends JavaAstNode {
  readonly kind: 'Annotation';
  typeName: () => NameNode; // e.g., for @GetMapping
  // elementValuePairs, elementValue, etc.
}

export interface IfStatementNode extends JavaAstNode {
  readonly kind: 'IfStatement';
  expression: () => ExpressionNode; // The condition
  statement: () => StatementNode[]; // Then branch, and potentially else branch
}

export interface MethodInvocationNode extends JavaAstNode {
  readonly kind: 'MethodInvocation';
  methodName: () => NameNode; // Or similar for the method name
  argumentList?: () => ArgumentListNode;
}

// Represents a terminal node / token, like an Identifier or a keyword
export interface TerminalNode extends JavaAstNode {
  readonly kind: 'Terminal'; // Or specific token type names
  readonly symbol: { // ANTLR Token common properties
    readonly text: string;
    readonly type: number; // Token type ID
    readonly line: number;
    readonly charPositionInLine: number;
    readonly tokenIndex: number;
    readonly startIndex: number;
    readonly stopIndex: number;
  };
}

// Other common node types that would be useful (placeholders)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ExpressionNode extends JavaAstNode {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StatementNode extends JavaAstNode {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface BlockNode extends JavaAstNode {
  // blockStatements: StatementNode[];
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface NameNode extends JavaAstNode { // For qualified names etc.
  Identifier: () => TerminalNode[];
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ArgumentListNode extends JavaAstNode {
  // expression: ExpressionNode[];
}


// --- Data Structures for Extracted Information ---

/**
 * Information about a discovered REST endpoint.
 * (Potentially shared with or moved to llm_types.ts)
 */
export interface DiscoveredEndpoint {
  filePath: string;
  className: string;
  methodName?: string; // Optional if annotation is on class
  httpMethods: string[]; // e.g., ["GET", "POST"]
  path: string; // Full path including class and method
  startPosition: Position; // Start of the method or class declaration
  endPosition: Position; // End of the method or class declaration
  javadoc?: string; // Associated Javadoc
  annotations: Array<{
    name: string; // e.g., "GetMapping"
    value?: string; // e.g., "/users"
    attributes?: Record<string, string>; // Other annotation attributes
  }>;
}

/**
 * Information about control flow within a method.
 */
export interface ControlFlowInfo {
  conditionalCalls: Array<{
    condition: string; // Text representation of the condition
    methodName: string;
    targetClass?: string; // Optional, if identifiable
    sourceLocation: Range; // Location of the conditional call
  }>;
  // Could also include information about loops, try-catch blocks etc. if needed
}

// --- Visitor Pattern Interface ---

/**
 * Visitor interface for traversing the JavaAstNode structure.
 * Methods correspond to 'kind' or specific node types from java-ast.
 * Based on antlr4ts visitor pattern.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface AstVisitor<T = any> {
  visitChildren(node: JavaAstNode): T;

  // visitTerminal?(node: TerminalNode): T; // ANTLR specific
  // visitErrorNode?(node: any): T; // ANTLR specific

  // Example visit methods for specific node kinds (add as needed based on java-ast)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visitCompilationUnit?(node: CompilationUnitNode, ...args: any[]): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visitClassDeclaration?(node: ClassDeclarationNode, ...args: any[]): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visitMethodDeclaration?(node: MethodDeclarationNode, ...args: any[]): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visitAnnotation?(node: AnnotationNode, ...args: any[]): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visitIfStatement?(node: IfStatementNode, ...args: any[]): T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visitMethodInvocation?(node: MethodInvocationNode, ...args: any[]): T;
  
  // Fallback for nodes not explicitly handled, or a generic visit method
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  visitNode?(node: JavaAstNode, ...args: any[]): T;

  // More specific visit methods would be named e.g. visitMethodDeclarationContext
  // if following ANTLR naming conventions strictly.
  // The actual names will depend on the classes/interfaces provided by java-ast.
} 