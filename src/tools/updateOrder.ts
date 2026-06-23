import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

// Input schema for updateOrder
// Based on https://shopify.dev/docs/api/admin-graphql/latest/mutations/orderupdate
const UpdateOrderInputSchema = z.object({
  id: z.string().min(1).describe("Order GID (e.g. gid://shopify/Order/123). Use get-order-by-id to look up by order number first."),
  tags: z.array(z.string()).optional(),
  email: z.string().email().optional(),
  note: z.string().optional(),
  customAttributes: z
    .array(
      z.object({
        key: z.string(),
        value: z.string()
      })
    )
    .optional(),
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
    ),
  phone: z.string().optional(),
  poNumber: z.string().optional(),
  shippingAddress: z
    .object({
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      company: z.string().optional(),
      countryCode: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      provinceCode: z.string().optional(),
      zip: z.string().optional()
    })
    .optional()
});

type UpdateOrderInput = z.infer<typeof UpdateOrderInputSchema>;

const updateOrder = {
  name: "update-order",
  description: "Update an existing order with new information",
  schema: UpdateOrderInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateOrderInput) => {
    try {
      // Prepare input for GraphQL mutation
      const { id, ...orderFields } = input;

      const query = gql`
        #graphql

        mutation orderUpdate($input: OrderInput!) {
          orderUpdate(input: $input) {
            order {
              id
              name
              email
              note
              tags
              customAttributes {
                key
                value
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
              shippingAddress {
                address1
                address2
                city
                company
                country
                firstName
                lastName
                phone
                province
                zip
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
          id,
          ...orderFields
        }
      };

      const data = (await shopifyClient.request(query, variables)) as {
        orderUpdate: {
          order: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      checkUserErrors(data.orderUpdate.userErrors, "update order");

      // Format and return the updated order
      const order = data.orderUpdate.order;

      // Return the updated order data
      return {
        order: {
          id: order.id,
          name: order.name,
          email: order.email,
          note: order.note,
          tags: order.tags,
          customAttributes: order.customAttributes,
          metafields:
            order.metafields?.edges.map((edge: any) => edge.node) || [],
          shippingAddress: order.shippingAddress
        }
      };
    } catch (error) {
      handleToolError("update order", error);
    }
  }
};

export { updateOrder };
