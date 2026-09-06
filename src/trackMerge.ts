export type Provenance = {
  value: unknown;
  path: string[];
  sourceLabel: string;
  overriddenBy?: string[];
};

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

function mergeAndTrack(
  target: unknown,
  source: unknown,
  label: string,
  path: string[],
  provenance: Map<string, Provenance>,
): unknown {
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    const pathKey = path.join(".");
    const existing = provenance.get(pathKey);
    if (existing) {
      existing.overriddenBy = [...(existing.overriddenBy ?? []), label];
    }
    provenance.set(pathKey, {
      value: source,
      path,
      sourceLabel: label,
      overriddenBy: existing?.overriddenBy,
    });
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
