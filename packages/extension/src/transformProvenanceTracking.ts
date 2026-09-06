import * as ts from "typescript";
import type { MergeFunctionConfig } from "./loadMergeFunctionsConfig.js";

export const TRACK_AND_ATTACH_CALL_NAME = "__fragmentMockTrackAndAttach";
export const GET_PROVENANCE_CALL_NAME = "__fragmentMockGetProvenance";

export type TransformResult = {
  transformedSource: string;
};

// v1 scope (per issue #1): only two shapes get provenance tracking —
// "simple identifier spreads directly under an object literal"
// (`{ ...a, ...b, c: 1 }`) and calls to functions named in
// `.fragmentmockrc.json`'s mergeFunctions (`merge(a, b)`,
// `maskFragments(fragments, data)`). Anything else (a spread of a call, a
// conditional, ...) is left untouched — its provenance is just unknown
// rather than an error. Recursion is likewise narrow: only into object
// literal property values and call arguments, not into arrays, arrow
// function bodies, conditionals, etc.
export function transformProvenanceTracking(
  fileName: string,
  sourceText: string,
  mergeFunctions: MergeFunctionConfig[],
): TransformResult {
  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter();
  const mergeFunctionsByName = new Map(mergeFunctions.map((config) => [config.name, config]));

  const statements = sourceFile.statements.map((statement) => {
    if (!ts.isVariableStatement(statement)) return statement;
    if (!(statement.declarationList.flags & ts.NodeFlags.Const)) return statement;

    const declarations = statement.declarationList.declarations.map((declaration) => {
      if (!declaration.initializer) return declaration;

      const transformedInitializer = transformExpression(
        declaration.initializer,
        mergeFunctionsByName,
        printer,
        sourceFile,
      );
      if (transformedInitializer === declaration.initializer) return declaration;

      return ts.factory.updateVariableDeclaration(
        declaration,
        declaration.name,
        declaration.exclamationToken,
        declaration.type,
        transformedInitializer,
      );
    });

    return ts.factory.updateVariableStatement(
      statement,
      statement.modifiers,
      ts.factory.updateVariableDeclarationList(statement.declarationList, declarations),
    );
  });

  const transformedSourceFile = ts.factory.updateSourceFile(sourceFile, statements);
  const transformedSource = printer.printFile(transformedSourceFile);

  return { transformedSource };
}

function transformExpression(
  expr: ts.Expression,
  mergeFunctionsByName: Map<string, MergeFunctionConfig>,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): ts.Expression {
  if (ts.isObjectLiteralExpression(expr)) {
    return transformObjectLiteral(expr, mergeFunctionsByName, printer, sourceFile);
  }
  if (ts.isCallExpression(expr)) {
    return transformCallExpression(expr, mergeFunctionsByName, printer, sourceFile);
  }
  return expr;
}

function transformObjectLiteral(
  expr: ts.ObjectLiteralExpression,
  mergeFunctionsByName: Map<string, MergeFunctionConfig>,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): ts.Expression {
  const originalProperties = expr.properties;
  const transformedProperties = originalProperties.map((property) =>
    ts.isPropertyAssignment(property)
      ? ts.factory.updatePropertyAssignment(
          property,
          property.name,
          transformExpression(property.initializer, mergeFunctionsByName, printer, sourceFile),
        )
      : property,
  );

  const spreadAssignments = originalProperties.filter(ts.isSpreadAssignment);
  const hasTrackableSpread =
    spreadAssignments.length > 0 &&
    spreadAssignments.every((assignment) => ts.isIdentifier(assignment.expression));

  if (!hasTrackableSpread) {
    return ts.factory.updateObjectLiteralExpression(expr, transformedProperties);
  }

  const entries = originalProperties.map((property, index) => {
    if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression)) {
      const label = property.expression.text;
      return createSourceEntry(label, ts.factory.createIdentifier(label));
    }

    // A non-spread property mixed into the literal (e.g. `c: 1`) has no
    // named source to point to, so it becomes its own anonymous source,
    // labeled by its own printed (pre-transform) text.
    const label = printer.printNode(ts.EmitHint.Unspecified, property, sourceFile);
    return createSourceEntry(
      label,
      ts.factory.createObjectLiteralExpression([transformedProperties[index]]),
    );
  });

  return createTrackAndAttachCall(entries);
}

function transformCallExpression(
  expr: ts.CallExpression,
  mergeFunctionsByName: Map<string, MergeFunctionConfig>,
  printer: ts.Printer,
  sourceFile: ts.SourceFile,
): ts.Expression {
  const transformedArgs = expr.arguments.map((arg) =>
    transformExpression(arg, mergeFunctionsByName, printer, sourceFile),
  );

  const config = ts.isIdentifier(expr.expression)
    ? mergeFunctionsByName.get(expr.expression.text)
    : undefined;

  if (config) {
    const sourceIndices =
      config.argsAreSources === "all"
        ? expr.arguments.map((_, index) => index)
        : config.argsAreSources.filter((index) => index >= 0 && index < expr.arguments.length);

    // A single source index is a passthrough/wrapper function (e.g.
    // `maskFragments(fragments, data)`, a documented runtime no-op over
    // `data`): the real call is kept so its actual runtime behavior is
    // preserved, and since it returns that same source arg unchanged, the
    // arg's own (already-transformed) provenance rides along for free.
    // Two or more source indices means the function itself IS the merge
    // point (like `merge`'s "all"), so — same as the spread case above —
    // the real call is replaced entirely by our own tracked equivalent.
    // Any other (non-source) args are dropped in that case: a merge-shaped
    // config is trusted to have named every argument that matters.
    if (sourceIndices.length >= 2) {
      const entries = sourceIndices.map((index) => {
        const originalArg = expr.arguments[index];
        const label = ts.isIdentifier(originalArg)
          ? originalArg.text
          : printer.printNode(ts.EmitHint.Unspecified, originalArg, sourceFile);
        return createSourceEntry(label, transformedArgs[index]);
      });
      return createTrackAndAttachCall(entries);
    }
  }

  return ts.factory.updateCallExpression(expr, expr.expression, expr.typeArguments, transformedArgs);
}

function createSourceEntry(label: string, value: ts.Expression): ts.ObjectLiteralExpression {
  return ts.factory.createObjectLiteralExpression([
    ts.factory.createPropertyAssignment("label", ts.factory.createStringLiteral(label)),
    ts.factory.createPropertyAssignment("value", value),
  ]);
}

function createTrackAndAttachCall(entries: ts.Expression[]): ts.CallExpression {
  return ts.factory.createCallExpression(
    ts.factory.createIdentifier(TRACK_AND_ATTACH_CALL_NAME),
    undefined,
    [ts.factory.createArrayLiteralExpression(entries, true)],
  );
}
