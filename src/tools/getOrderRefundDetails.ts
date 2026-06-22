import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

const GetOrderRefundDetailsInputSchema = z.object({
  orderId: z
    .string()
    .min(1)
    .describe(
      "The order ID (e.g. gid://shopify/Order/123 or just 123)",
    ),
});
type GetOrderRefundDetailsInput = z.infer<
  typeof GetOrderRefundDetailsInputSchema
>;

let shopifyClient: GraphQLClient;

const getOrderRefundDetails = {
  name: "get-order-refund-details",
  description:
    "Get detailed refund info for an order including refunded items, amounts, restock status, and associated transactions",
  schema: GetOrderRefundDetailsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetOrderRefundDetailsInput) => {
    try {
      const orderId = input.orderId.startsWith("gid://")
        ? input.orderId
        : `gid://shopify/Order/${input.orderId}`;

      const query = gql`
        #graphql

        query GetOrderRefundDetails($id: ID!) {
          order(id: $id) {
            id
            name
            refunds(first: 25) {
              id
              note
              createdAt
              updatedAt
              totalRefundedSet {
                shopMoney {
                  amount
                  currencyCode
                }
                presentmentMoney {
                  amount
                  currencyCode
                }
              }
              refundLineItems(first: 50) {
                edges {
                  node {
                    quantity
                    restockType
                    restocked
                    priceSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    subtotalSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    totalTaxSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    lineItem {
                      id
                      title
                      sku
                    }
                    location {
                      id
                      name
                    }
                  }
                }
              }
              transactions(first: 10) {
                edges {
                  node {
                    id
                    kind
                    status
                    gateway
                    amountSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    processedAt
                  }
                }
              }
              duties {
                amountSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      `;

      const data: any = await shopifyClient.request(query, { id: orderId });

      if (!data.order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      const refunds = data.order.refunds.map((refund: any) => ({
        ...refund,
        refundLineItems: edgesToNodes(refund.refundLineItems),
        transactions: edgesToNodes(refund.transactions),
      }));

      return {
        orderId: data.order.id,
        orderName: data.order.name,
        refundsCount: refunds.length,
        refunds,
      };
    } catch (error) {
      handleToolError("fetch order refund details", error);
    }
  },
};

export { getOrderRefundDetails };
