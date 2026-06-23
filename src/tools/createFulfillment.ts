import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const CreateFulfillmentInputSchema = z.object({
  lineItemsByFulfillmentOrder: z
    .array(
      z.object({
        fulfillmentOrderId: z.string().describe("The fulfillment order GID. Use get-fulfillment-orders to look these up."),
        fulfillmentOrderLineItems: z
          .array(
            z.object({
              id: z.string().describe("The fulfillment order line item GID"),
              quantity: z.number().describe("Quantity to fulfill"),
            })
          )
          .optional()
          .describe("Specific line items to fulfill. If omitted, all line items are fulfilled."),
      })
    )
    .min(1)
    .describe("Fulfillment orders and their line items to fulfill"),
  trackingInfo: z
    .object({
      number: z.string().optional().describe("Tracking number"),
      url: z.string().optional().describe("Tracking URL"),
      company: z.string().optional().describe("Tracking company name (use exact Shopify-known names)"),
    })
    .optional()
    .describe("Tracking information for the shipment"),
  notifyCustomer: z.boolean().default(false).describe("Whether to send shipping notification to customer. IMPORTANT: Always confirm with the user before enabling — sends a real email/SMS to the customer."),
});

type CreateFulfillmentInput = z.infer<typeof CreateFulfillmentInputSchema>;

let shopifyClient: GraphQLClient;

const createFulfillment = {
  name: "create-fulfillment",
  description:
    "Create a fulfillment (mark items as shipped) with optional tracking info. IMPORTANT: Call get-fulfillment-orders first to obtain the fulfillmentOrderId and line item GIDs.",
  schema: CreateFulfillmentInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateFulfillmentInput) => {
    try {
      const query = gql`
        #graphql

        mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
          fulfillmentCreate(fulfillment: $fulfillment) {
            fulfillment {
              id
              status
              createdAt
              trackingInfo {
                number
                url
                company
              }
              fulfillmentLineItems(first: 20) {
                edges {
                  node {
                    id
                    quantity
                    lineItem {
                      title
                    }
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

      const fulfillment: Record<string, any> = {
        lineItemsByFulfillmentOrder: input.lineItemsByFulfillmentOrder,
        notifyCustomer: input.notifyCustomer,
      };

      if (input.trackingInfo) {
        fulfillment.trackingInfo = input.trackingInfo;
      }

      const data = (await shopifyClient.request(query, { fulfillment })) as {
        fulfillmentCreate: {
          fulfillment: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.fulfillmentCreate.userErrors, "create fulfillment");

      const f = data.fulfillmentCreate.fulfillment;
      return {
        fulfillment: {
          id: f.id,
          status: f.status,
          createdAt: f.createdAt,
          trackingInfo: f.trackingInfo,
          lineItems: f.fulfillmentLineItems.edges.map((e: any) => ({
            id: e.node.id,
            quantity: e.node.quantity,
            title: e.node.lineItem.title,
          })),
        },
      };
    } catch (error) {
      handleToolError("create fulfillment", error);
    }
  },
};

export { createFulfillment };
