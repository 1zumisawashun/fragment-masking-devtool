import * as ts from "typescript";

export const TRACK_MERGE_CALL_NAME = "__fragmentMockTrackMerge";
export const PROVENANCE_SUFFIX = "__provenance";

export type SpreadTransformResult = {
  transformedSource: string;
  // Maps each transformed top-level const's name to the name of the
  // provenance variable introduced alongside it (`<name>__provenance`).
  provenanceVariableNames: Map<string, string>;
};

// v1 scope (per issue #1): only "simple identifier spreads directly under an
// object literal" (`{ ...a, ...b, c: 1 }`) get provenance tracking. A spread
// of anything else (a call, a conditional, ...) is left untouched — the
// declaration still evaluates normally, its provenance is just unknown.
export function transformSpreadProvenance(
  fileName: string,
  sourceText: string,
): SpreadTransformResult {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter();
  const provenanceVariableNames = new Map<string, string>();

  const statements = sourceFile.statements.map((statement) => {
    if (!ts.isVariableStatement(statement)) return statement;
    if (!(statement.declarationList.flags & ts.NodeFlags.Const)) return statement;

    let transformedAny = false;
    const declarations = statement.declarationList.declarations.map((declaration) => {
      const transformed = transformDeclaration(declaration, printer, sourceFile);
      if (transformed) {
        transformedAny = true;
        provenanceVariableNames.set(transformed.name, transformed.provenanceName);
        return transformed.declaration;
      }
      return declaration;
    });

    if (!transformedAny) return statement;

    return ts.factory.updateVariableStatement(
      statement,
      statement.modifiers,
      ts.factory.updateVariableDeclarationList(statement.declarationList, declarations),
    );
  });

  const transformedSourceFile = ts.factory.updateSourceFile(sourceFile, statements);
  const transformedSource = printer.printFile(transformedSourceFile);

  return { transformedSource, provenanceVariableNames };
}

function transformDeclaration(
  declaration: ts.VariableDeclaration,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): { declaration: ts.VariableDeclaration; name: string; provenanceName: string } | undefined {
  if (!ts.isIdentifier(declaration.name)) return undefined;
  if (!declaration.initializer || !ts.isObjectLiteralExpression(declaration.initializer)) {
    return undefined;
  }

  const objectLiteral = declaration.initializer;
  const spreadAssignments = objectLiteral.properties.filter(ts.isSpreadAssignment);
  if (spreadAssignments.length === 0) return undefined;
  if (!spreadAssignments.every((assignment) => ts.isIdentifier(assignment.expression))) {
    return undefined;
  }

  const name = declaration.name.text;
  const provenanceName = `${name}${PROVENANCE_SUFFIX}`;

  const sourceEntries = objectLiteral.properties.map((property) => {
    if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression)) {
      const label = property.expression.text;
      return ts.factory.createObjectLiteralExpression([
        ts.factory.createPropertyAssignment("label", ts.factory.createStringLiteral(label)),
        ts.factory.createPropertyAssignment("value", ts.factory.createIdentifier(label)),
      ]);
    }

    // A non-spread property mixed into the literal (e.g. `c: 1`) has no
    // named source to point to, so it becomes its own anonymous source,
    // labeled by its own printed text.
    const label = printer.printNode(ts.EmitHint.Unspecified, property, sourceFile);
    return ts.factory.createObjectLiteralExpression([
      ts.factory.createPropertyAssignment("label", ts.factory.createStringLiteral(label)),
      ts.factory.createPropertyAssignment(
        "value",
        ts.factory.createObjectLiteralExpression([property]),
      ),
    ]);
  });

  const trackMergeCall = ts.factory.createCallExpression(
    ts.factory.createIdentifier(TRACK_MERGE_CALL_NAME),
    undefined,
    [ts.factory.createArrayLiteralExpression(sourceEntries, true)],
  );

  const bindingPattern = ts.factory.createObjectBindingPattern([
    ts.factory.createBindingElement(undefined, "result", name),
    ts.factory.createBindingElement(undefined, "provenance", provenanceName),
  ]);

  const newDeclaration = ts.factory.updateVariableDeclaration(
    declaration,
    bindingPattern,
    undefined,
    undefined,
    trackMergeCall,
  );

  return { declaration: newDeclaration, name, provenanceName };
}
