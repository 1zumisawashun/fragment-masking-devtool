type Props = {
  label: string;
  value: unknown;
};

export function ValueNode({ label, value }: Props) {
  if (value !== null && typeof value === "object") {
    const entries = Array.isArray(value)
      ? value.map((item, index) => [String(index), item] as const)
      : Object.entries(value as Record<string, unknown>);

    return (
      <details open>
        <summary>{label}</summary>
        <ul>
          {entries.map(([key, childValue]) => (
            <li key={key}>
              <ValueNode label={key} value={childValue} />
            </li>
          ))}
        </ul>
      </details>
    );
  }

  return (
    <span>
      {label}: {JSON.stringify(value)}
    </span>
  );
}
