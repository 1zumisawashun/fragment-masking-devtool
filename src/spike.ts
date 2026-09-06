import { trackMerge } from "./trackMerge.js";

const mockA = { id: 1, status: { detail: "from-a" } };
const mockBase = { staffId: 99, status: { detail: "from-base" } };

const { result, provenance } = trackMerge([
  { label: "mockA", value: mockA },
  { label: "mockBase", value: mockBase },
]);

console.log("result:", JSON.stringify(result, null, 2));
console.log("provenance:");
for (const [path, entry] of provenance) {
  console.log(` ${path || "(root)"}:`, entry);
}
