import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const CreateRefundInputSchema = z.object({
  orderId: z.string().describe("The order GID, e.g. gid://shopify/Order/123"),
  refundLineItems: z
    .array(
      z.object({
        lineItemId: z.string().describe("The line item GID to refund"),
        quantity: z.number().describe("Quantity to refund"),
        restockType: z
          .enum(["CANCEL", "NO_RESTOCK", "RETURN"])
          .optional()
          .describe("How to restock: CANCEL (not yet fulfilled), RETURN (already fulfilled), NO_RESTOCK"),
        locationId: z.string().optional().describe("Location GID for restocking"),
      })
    )
    .optional()
    .describe("Line items to refund with quantities and restock type. If omitted, you must provide 'shipping' for a shipping-only refund. Omitting both refundLineItems and shipping will result in a zero-amount refund (note-only)."),
  shipping: z
    .object({
      amount: z.string().optional().describe("Shipping refund amount"),
      fullRefund: z.boolean().optional().describe("Whether to fully refund shipping"),
    })
    .optional()
    .describe("Shipping cost refund"),
  note: z.string().optional().describe("Note attached to the refund"),
  notify: z.boolean().optional().describe("Whether to send refund notification to customer. IMPORTANT: Always confirm with the user before enabling — sends a real email/SMS to the customer. Defaults to no notification if omitted."),
  currency: z.string().optional().describe("Currency code if different from shop currency (presentment currency)"),
});

type CreateRefundInput = z.infer<typeof CreateRefundInputSchema>;

let shopifyClient: GraphQLClient;

const createRefund = {
  name: "refund-create",
  description:
    "Create a full or partial refund for an order with optional restocking and shipping refund.",
  schema: CreateRefundInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateRefundInput) => {
    try {
      const query = gql`
        #graphql

        mutation refundCreate($input: RefundInput!) {
          refundCreate(input: $input) {
            refund {
              id
              createdAt
              note
              totalRefundedSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              refundLineItems(first: 20) {
                edges {
                  node {
                    lineItem {
                      id
                      title
                    }
                    quantity
                    restockType
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

      const refundInput: Record<string, any> = {
        orderId: input.orderId,
      };

      if (input.refundLineItems) {
        refundInput.refundLineItems = input.refundLineItems;
      }
      if (input.shipping) {
        refundInput.shipping = input.shipping;
      }
      if (input.note) {
        refundInput.note = input.note;
      }
      if (input.notify !== undefined) {
        refundInput.notify = input.notify;
      }
      if (input.currency) {
        refundInput.currency = input.currency;
      }

      const data = (await shopifyClient.request(query, { input: refundInput })) as {
        refundCreate: {
          refund: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.refundCreate.userErrors, "create refund");

      const refund = data.refundCreate.refund;
      return {
        refund: {
          id: refund.id,
          createdAt: refund.createdAt,
          note: refund.note,
          totalRefunded: refund.totalRefundedSet?.shopMoney,
          lineItems: refund.refundLineItems.edges.map((e: any) => ({
            lineItemId: e.node.lineItem.id,
            title: e.node.lineItem.title,
            quantity: e.node.quantity,
            restockType: e.node.restockType,
          })),
        },
      };
    } catch (error) {
      handleToolError("create refund", error);
    }
  },
};

export { createRefund };
