import { graphql, HttpResponse } from "msw";
// Imported via the `@fixtures/*` path alias (tsconfig.json) rather than a
// relative path, so Step3's tsconfig path-alias resolution has a real case
// to resolve against.
import { staffMaskedMock } from "@fixtures/mocks.js";

export const handlers = [
  graphql.query("GetStaff", () => {
    return HttpResponse.json({
      data: { staff: staffMaskedMock },
    });
  }),
];
