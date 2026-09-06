import { merge } from "es-toolkit";
import { maskFragments } from "gql.tada/testing";
import { StaffBaseFragment, StaffStatusFragment } from "./fragments.js";

const staffBaseMock = {
  id: "staff-1",
  staffId: "S001",
  status: { detail: "from-base" },
};

const staffStatusMock = {
  status: { detail: "from-status" },
  scheduledAt: "2026-09-10T10:00:00Z",
};

// Pattern: simple object-literal spread ({...a, ...b})
export const staffSpreadMock = {
  ...staffBaseMock,
  ...staffStatusMock,
};

// es-toolkit's merge() mutates and returns its first argument, so each
// pattern below merges into a fresh clone of staffBaseMock rather than the
// shared module-level object — otherwise every merge() call after the first
// would silently operate on an already-mutated target, and staffMergeMock /
// staffMaskedMock / staffMaskedNestedMock would all collapse into the same
// object reference instead of being independently traceable patterns.

// Pattern: merge() (es-toolkit)
export const staffMergeMock = merge(structuredClone(staffBaseMock), staffStatusMock);

// Pattern: maskFragments(fragments, data) — maskFragments() itself is a
// runtime no-op passthrough (gql.tada/testing), so the interesting work
// here is entirely the merge() feeding it.
export const staffMaskedMock = maskFragments(
  [StaffBaseFragment, StaffStatusFragment],
  merge(structuredClone(staffBaseMock), staffStatusMock),
);

// Pattern: nested merge inside maskFragments — maskFragments(fragments, merge(a, b))
export const staffMaskedNestedMock = maskFragments(
  [StaffBaseFragment, StaffStatusFragment],
  merge(structuredClone(staffBaseMock), staffStatusMock),
);
