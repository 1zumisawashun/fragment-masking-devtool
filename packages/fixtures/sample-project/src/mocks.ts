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

// Pattern: merge() (es-toolkit)
export const staffMergeMock = merge(staffBaseMock, staffStatusMock);

// Pattern: maskFragments(fragments, data)
export const staffMaskedMock = maskFragments(
  [StaffBaseFragment, StaffStatusFragment],
  staffMergeMock,
);

// Pattern: nested merge inside maskFragments — maskFragments(fragments, merge(a, b))
export const staffMaskedNestedMock = maskFragments(
  [StaffBaseFragment, StaffStatusFragment],
  merge(staffBaseMock, staffStatusMock),
);
