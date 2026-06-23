import type { GraphQLClient } from "graphql-request";
import { z } from "zod";
import { handleToolError, edgesToNodes } from "../lib/toolUtils.js";
import { defineProjection, countOnlyParam, fetchCount } from "../lib/projection.js";

/** Selectable fields for customers */
const customerProjection = defineProjection({
  id: "id",
  firstName: "firstName",
  lastName: "lastName",
  email: "defaultEmailAddress { emailAddress }",
  phone: "defaultPhoneNumber { phoneNumber }",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
  tags: "tags",
  defaultAddress: "defaultAddress { address1 address2 city provinceCode zip country phone }",
  addresses: "addressesV2(first: 10) { edges { node { address1 address2 city provinceCode zip country phone } } }",
  amountSpent: "amountSpent { amount currencyCode }",
  numberOfOrders: "numberOfOrders",
});

// Input schema for getCustomers
const GetCustomersInputSchema = z.object({
  searchQuery: z.string().optional().describe("Freetext search or Shopify query syntax (e.g. 'country:US tag:vip orders_count:>5')"),
  limit: z.number().min(1).max(250).default(10)
    .describe("Number of customers to return (default 10, max 250)"),
  after: z.string().optional().describe("Cursor for forward pagination"),
  before: z.string().optional().describe("Cursor for backward pagination"),
  sortKey: z.enum([
    "CREATED_AT", "ID", "LAST_UPDATE", "LOCATION", "NAME",
    "ORDERS_COUNT", "RELEVANCE", "TOTAL_SPENT", "UPDATED_AT"
  ]).optional().describe("Sort key for customers"),
  reverse: z.boolean().optional().describe("Reverse the sort order"),
  fields: customerProjection.fieldsParam({ noun: "customer" }),
  countOnly: countOnlyParam(),
});

type GetCustomersInput = z.infer<typeof GetCustomersInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const getCustomers = {
  name: "get-customers",
  description: "Get customers or search by name/email. Supports field selection via 'fields' and 'countOnly' to get just the count.",
  schema: GetCustomersInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetCustomersInput) => {
    try {
      const { searchQuery, limit, after, before, sortKey, reverse, fields, countOnly } = input;

      // Count-only mode: return just the count
      if (countOnly) {
        return fetchCount(shopifyClient, "customersCount", searchQuery);
      }

      const query = `
        query GetCustomers($first: Int!, $query: String, $after: String, $before: String, $sortKey: CustomerSortKeys, $reverse: Boolean) {
          customers(first: $first, query: $query, after: $after, before: $before, sortKey: $sortKey, reverse: $reverse) {
            edges {
              node {
                ${customerProjection.selection(fields)}
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `;

      const variables = {
        first: limit,
        query: searchQuery,
        ...(after && { after }),
        ...(before && { before }),
        ...(sortKey && { sortKey }),
        ...(reverse !== undefined && { reverse })
      };

      const data = (await shopifyClient.request(query, variables)) as {
        customers: any;
      };

      // When custom fields are specified, return nodes with connection sub-fields flattened
      if (fields) {
        const customers = edgesToNodes(data.customers).map((customer: any) => {
          const result: any = customerProjection.normalize(customer);
          if (result.addressesV2) {
            result.addresses = result.addressesV2;
            delete result.addressesV2;
          }
          if (result.defaultEmailAddress) {
            result.email = result.defaultEmailAddress.emailAddress;
            delete result.defaultEmailAddress;
          }
          if (result.defaultPhoneNumber) {
            result.phone = result.defaultPhoneNumber.phoneNumber;
            delete result.defaultPhoneNumber;
          }
          return result;
        });
        return {
          customers,
          pageInfo: data.customers.pageInfo
        };
      }

      // Default: full formatting
      const customers = data.customers.edges.map((edge: any) => {
        const customer = edge.node;

        return {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.defaultEmailAddress?.emailAddress || null,
          phone: customer.defaultPhoneNumber?.phoneNumber || null,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          tags: customer.tags,
          defaultAddress: customer.defaultAddress,
          addresses: customer.addressesV2
            ? edgesToNodes(customer.addressesV2)
            : [],
          amountSpent: customer.amountSpent,
          numberOfOrders: customer.numberOfOrders
        };
      });

      return {
        customers,
        pageInfo: data.customers.pageInfo
      };
    } catch (error) {
      handleToolError("fetch customers", error);
    }
  }
};

export { getCustomers };
