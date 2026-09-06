import { graphql } from "gql.tada";

export const StaffBaseFragment = graphql(`
  fragment StaffBase on Staff {
    id
    staffId
  }
`);

export const StaffStatusFragment = graphql(`
  fragment StaffStatus on Staff {
    status {
      detail
    }
    scheduledAt
  }
`);
