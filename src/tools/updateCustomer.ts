import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

// Input schema for updating a customer
const UpdateCustomerInputSchema = z.object({
  id: z.string().regex(/^\d+$/, "Customer ID must be numeric").describe("Numeric customer ID (e.g. 7832529321). Do not pass a full GID."),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  emailMarketingConsent: z
    .object({
      marketingState: z.enum(["NOT_SUBSCRIBED", "SUBSCRIBED", "UNSUBSCRIBED", "PENDING"]),
      consentUpdatedAt: z.string().optional(),
      marketingOptInLevel: z.enum(["SINGLE_OPT_IN", "CONFIRMED_OPT_IN", "UNKNOWN"]).optional()
    })
    .optional(),
  taxExempt: z.boolean().optional(),
  metafields: z
    .array(
      z.object({
        id: z.string().optional().describe("Metafield GID to update an existing metafield. Omit to create/upsert by namespace+key."),
        namespace: z.string().optional().describe("Metafield namespace (required when creating without id)"),
        key: z.string().optional().describe("Metafield key (required when creating without id)"),
        value: z.string().describe("The value to set"),
        type: z.string().optional().describe("Metafield type (e.g. 'single_line_text_field'). Required when creating a new metafield without a definition.")
      })
    )
    .optional()
    .describe(
      "Metafields to create or update inline. Pass 'id' to update existing, or 'namespace'+'key' to upsert. " +
      "For standalone metafield operations, prefer the set-metafields tool instead."
    )
});

type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const updateCustomer = {
  name: "update-customer",
  description: "Update a customer's information",
  schema: UpdateCustomerInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateCustomerInput) => {
    try {
      const { id, ...customerFields } = input;

      // Convert numeric ID to GID format
      const customerGid = `gid://shopify/Customer/${id}`;

      const query = gql`
        #graphql

        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
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
              emailMarketingConsent {
                marketingState
                consentUpdatedAt
                marketingOptInLevel
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
          id: customerGid,
          ...customerFields
        }
      };

      const data = (await shopifyClient.request(query, variables)) as {
        customerUpdate: {
          customer: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      checkUserErrors(data.customerUpdate.userErrors, "update customer");

      // Format and return the updated customer
      const customer = data.customerUpdate.customer;

      // Format metafields if they exist
      const metafields =
        customer.metafields?.edges.map((edge: any) => edge.node) || [];

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
          emailMarketingConsent: customer.emailMarketingConsent,
          metafields
        }
      };
    } catch (error) {
      handleToolError("update customer", error);
    }
  }
};

export { updateCustomer };
