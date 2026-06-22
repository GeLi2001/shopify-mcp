import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError, edgesToNodes } from "../lib/toolUtils.js";

// Input schema for creating a customer
const CreateCustomerInputSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  taxExempt: z.boolean().optional(),
  metafields: z
    .array(
      z.object({
        namespace: z.string(),
        key: z.string(),
        value: z.string(),
        type: z.string().optional()
      })
    )
    .optional(),
  addresses: z
    .array(
      z.object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        provinceCode: z.string().optional(),
        zip: z.string().optional(),
        countryCode: z.string().optional(),
        phone: z.string().optional()
      })
    )
    .optional()
});

type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createCustomer = {
  name: "create-customer",
  description: "Create a new customer",
  schema: CreateCustomerInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateCustomerInput) => {
    try {
      const query = gql`
        #graphql

        mutation customerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            customer {
              id
              firstName
              lastName
              defaultEmailAddress {
                emailAddress
              }
              defaultPhoneNumber {
                phoneNumber
              }
              tags
              note
              taxExempt
              createdAt
              updatedAt
              defaultAddress {
                address1
                address2
                city
                provinceCode
                zip
                country
                phone
              }
              addressesV2(first: 10) {
                edges {
                  node {
                    address1
                    address2
                    city
                    provinceCode
                    zip
                    country
                    phone
                  }
                }
              }
              metafields(first: 10) {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          ...input
        }
      };

      const data = (await shopifyClient.request(query, variables)) as {
        customerCreate: {
          customer: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      checkUserErrors(data.customerCreate.userErrors, "create customer");

      // Format and return the created customer
      const customer = data.customerCreate.customer;

      // Format metafields if they exist
      const metafields =
        customer.metafields?.edges.map((edge: any) => edge.node) || [];
      const addresses = customer.addressesV2
        ? edgesToNodes(customer.addressesV2)
        : [];

      return {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.defaultEmailAddress?.emailAddress || null,
          phone: customer.defaultPhoneNumber?.phoneNumber || null,
          tags: customer.tags,
          note: customer.note,
          taxExempt: customer.taxExempt,
          createdAt: customer.createdAt,
          updatedAt: customer.updatedAt,
          defaultAddress: customer.defaultAddress,
          addresses,
          metafields
        }
      };
    } catch (error) {
      handleToolError("create customer", error);
    }
  }
};

export { createCustomer };
