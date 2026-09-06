/* eslint-disable */
/* prettier-ignore */

export type introspection_types = {
    'Boolean': unknown;
    'ID': unknown;
    'Query': { kind: 'OBJECT'; name: 'Query'; fields: { 'staff': { name: 'staff'; type: { kind: 'OBJECT'; name: 'Staff'; ofType: null; } }; }; };
    'Staff': { kind: 'OBJECT'; name: 'Staff'; fields: { 'address': { name: 'address'; type: { kind: 'OBJECT'; name: 'StaffAddress'; ofType: null; } }; 'id': { name: 'id'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'scheduledAt': { name: 'scheduledAt'; type: { kind: 'SCALAR'; name: 'String'; ofType: null; } }; 'staffId': { name: 'staffId'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'ID'; ofType: null; }; } }; 'status': { name: 'status'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'OBJECT'; name: 'StaffStatus'; ofType: null; }; } }; }; };
    'StaffAddress': { kind: 'OBJECT'; name: 'StaffAddress'; fields: { 'city': { name: 'city'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; 'prefecture': { name: 'prefecture'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; }; };
    'StaffStatus': { kind: 'OBJECT'; name: 'StaffStatus'; fields: { 'detail': { name: 'detail'; type: { kind: 'NON_NULL'; name: never; ofType: { kind: 'SCALAR'; name: 'String'; ofType: null; }; } }; }; };
    'String': unknown;
};

/** An IntrospectionQuery representation of your schema.
 *
 * @remarks
 * This is an introspection of your schema saved as a file by GraphQLSP.
 * It will automatically be used by `gql.tada` to infer the types of your GraphQL documents.
 * If you need to reuse this data or update your `scalars`, update `tadaOutputLocation` to
 * instead save to a .ts instead of a .d.ts file.
 */
export type introspection = {
  name: never;
  query: 'Query';
  mutation: never;
  subscription: never;
  types: introspection_types;
};

import * as gqlTada from 'gql.tada';

declare module 'gql.tada' {
  interface setupSchema {
    introspection: introspection
  }
}