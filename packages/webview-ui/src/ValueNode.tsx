type Props = {
  label: string;
  value: unknown;
  path: string;
  overriddenByPath: Map<string, string[]>;
};

export function ValueNode({ label, value, path, overriddenByPath }: Props) {
  const overriddenBy = overriddenByPath.get(path);

  if (value !== null && typeof value === "object") {
    const entries = Array.isArray(value)
      ? value.map((item, index) => [String(index), item] as const)
      : Object.entries(value as Record<string, unknown>);

    return (
      <details open>
        <summary>
          {label}
          {overriddenBy && <OverrideBadge overriddenBy={overriddenBy} />}
        </summary>
        <ul>
          {entries.map(([key, childValue]) => (
            <li key={key}>
              <ValueNode
                label={key}
                value={childValue}
                path={path ? `${path}.${key}` : key}
                overriddenByPath={overriddenByPath}
              />
            </li>
          ))}
        </ul>
      </details>
    );
  }

  return (
    <span>
      {label}: {JSON.stringify(value)}
      {overriddenBy && <OverrideBadge overriddenBy={overriddenBy} />}
    </span>
  );
}

function OverrideBadge({ overriddenBy }: { overriddenBy: string[] }) {
  return (
    <span title={`上書きされた由来: ${overriddenBy.join(", ")}`}>
      {" "}
      ⚠{overriddenBy.length}
    </span>
  );
}
