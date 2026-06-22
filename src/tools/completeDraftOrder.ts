import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const CompleteDraftOrderInputSchema = z.object({
  draftOrderId: z.string().describe("The draft order GID, e.g. gid://shopify/DraftOrder/123"),
  paymentGatewayId: z.string().optional().describe("Payment gateway GID (optional)"),
});

type CompleteDraftOrderInput = z.infer<typeof CompleteDraftOrderInputSchema>;

let shopifyClient: GraphQLClient;

const completeDraftOrder = {
  name: "complete-draft-order",
  description:
    "Complete a draft order, converting it into a real order. Optionally specify a payment gateway.",
  schema: CompleteDraftOrderInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CompleteDraftOrderInput) => {
    try {
      const query = gql`
        #graphql

        mutation draftOrderComplete($id: ID!, $paymentGatewayId: ID) {
          draftOrderComplete(id: $id, paymentGatewayId: $paymentGatewayId) {
            draftOrder {
              id
              status
              order {
                id
                name
                displayFinancialStatus
                displayFulfillmentStatus
                totalPriceSet {
                  shopMoney {
                    amount
                    currencyCode
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

      const variables: Record<string, any> = {
        id: input.draftOrderId,
      };
      if (input.paymentGatewayId) {
        variables.paymentGatewayId = input.paymentGatewayId;
      }

      const data = (await shopifyClient.request(query, variables)) as {
        draftOrderComplete: {
          draftOrder: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.draftOrderComplete.userErrors, "complete draft order");

      const draft = data.draftOrderComplete.draftOrder;
      return {
        draftOrder: {
          id: draft.id,
          status: draft.status,
          order: draft.order
            ? {
                id: draft.order.id,
                name: draft.order.name,
                financialStatus: draft.order.displayFinancialStatus,
                fulfillmentStatus: draft.order.displayFulfillmentStatus,
                totalPrice: draft.order.totalPriceSet?.shopMoney,
              }
            : null,
        },
      };
    } catch (error) {
      handleToolError("complete draft order", error);
    }
  },
};

export { completeDraftOrder };
