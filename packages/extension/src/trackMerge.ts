export type Provenance = {
  value: unknown;
  path: string[];
  sourceLabel: string;
  overriddenBy?: string[];
};

const PROVENANCE_KEY = Symbol("fragmentMockProvenance");

export function trackMerge(sources: { label: string; value: unknown }[]): {
  result: unknown;
  provenance: Map<string, Provenance>;
} {
  const provenance = new Map<string, Provenance>();
  let result: unknown = {};

  for (const { label, value } of sources) {
    result = mergeAndTrack(result, value, label, [], provenance);
  }

  return { result, provenance };
}

// Attaches a merge's provenance to its own result via a hidden (non-enumerable
// symbol-keyed) property, so the result can be handed to a *further* merge —
// as a plain value, indistinguishable from any other — while still letting
// mergeAndTrack recover and inherit its original per-path provenance instead
// of treating the whole thing as one opaque leaf. This is what lets nested
// merge calls (`merge(a, merge(b, c))`) compose correctly.
export function attachProvenance<T>(value: T, provenance: Map<string, Provenance>): T {
  if (value !== null && typeof value === "object") {
    Object.defineProperty(value, PROVENANCE_KEY, {
      value: provenance,
      enumerable: false,
      configurable: true,
    });
  }
  return value;
}

export function getProvenance(value: unknown): Map<string, Provenance> | undefined {
  if (value === null || typeof value !== "object") return undefined;
  return (value as Record<PropertyKey, unknown>)[PROVENANCE_KEY] as Map<string, Provenance> | undefined;
}

export function trackAndAttach(sources: { label: string; value: unknown }[]): unknown {
  const { result, provenance } = trackMerge(sources);
  return attachProvenance(result, provenance);
}

function mergeAndTrack(
  target: unknown,
  source: unknown,
  label: string,
  path: string[],
  provenance: Map<string, Provenance>,
): unknown {
  const nestedProvenance = getProvenance(source);
  if (nestedProvenance) {
    // `source` is itself a previously-tracked merge result: replay its own
    // per-path entries (keeping their true sourceLabel) instead of
    // attributing every leaf under it to this call's own `label`.
    for (const [relativePath, entry] of nestedProvenance) {
      const fullPath = relativePath ? [...path, ...relativePath.split(".")] : path;
      const pathKey = fullPath.join(".");
      const existing = provenance.get(pathKey);
      const priorLosers = existing
        ? [...(existing.overriddenBy ?? []), existing.sourceLabel]
        : [];
      const overriddenBy = [...priorLosers, ...(entry.overriddenBy ?? [])];
      provenance.set(pathKey, {
        value: entry.value,
        path: fullPath,
        sourceLabel: entry.sourceLabel,
        overriddenBy: overriddenBy.length > 0 ? overriddenBy : undefined,
      });
    }
    return source;
  }

  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    const pathKey = path.join(".");
    const existing = provenance.get(pathKey);
    // overriddenBy accumulates every label that previously held this path (the
    // losers). The current entry's own label is never included in its own
    // overriddenBy — only later entries carry it forward once they, in turn,
    // get overridden.
    const overriddenBy = existing
      ? [...(existing.overriddenBy ?? []), existing.sourceLabel]
      : undefined;
    provenance.set(pathKey, { value: source, path, sourceLabel: label, overriddenBy });
    return source;
  }

  const merged: Record<string, unknown> = { ...(target as Record<string, unknown>) };
  for (const key of Object.keys(source)) {
    merged[key] = mergeAndTrack(
      (target as Record<string, unknown> | undefined)?.[key],
      (source as Record<string, unknown>)[key],
      label,
      [...path, key],
      provenance,
    );
  }
  return merged;
}
