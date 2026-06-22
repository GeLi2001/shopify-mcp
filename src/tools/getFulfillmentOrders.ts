import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

const GetFulfillmentOrdersInputSchema = z.object({
  orderId: z
    .string()
    .min(1)
    .describe(
      "The order ID (e.g. gid://shopify/Order/123 or just 123)",
    ),
});
type GetFulfillmentOrdersInput = z.infer<
  typeof GetFulfillmentOrdersInputSchema
>;

let shopifyClient: GraphQLClient;

const getFulfillmentOrders = {
  name: "get-fulfillment-orders",
  description:
    "Get fulfillment orders for an order including status, assigned location, delivery method, holds, and line items",
  schema: GetFulfillmentOrdersInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetFulfillmentOrdersInput) => {
    try {
      const orderId = input.orderId.startsWith("gid://")
        ? input.orderId
        : `gid://shopify/Order/${input.orderId}`;

      const query = gql`
        #graphql

        query GetFulfillmentOrders($id: ID!) {
          order(id: $id) {
            id
            name
            fulfillmentOrders(first: 25) {
              edges {
                node {
                  id
                  status
                  requestStatus
                  createdAt
                  updatedAt
                  fulfillAt
                  fulfillBy
                  assignedLocation {
                    name
                    address1
                    address2
                    city
                    province
                    countryCode
                    zip
                    phone
                  }
                  deliveryMethod {
                    methodType
                    minDeliveryDateTime
                    maxDeliveryDateTime
                    presentedName
                    serviceCode
                  }
                  fulfillmentHolds {
                    id
                    reason
                    reasonNotes
                    displayReason
                    heldByRequestingApp
                  }
                  lineItems(first: 50) {
                    edges {
                      node {
                        id
                        totalQuantity
                        remainingQuantity
                        productTitle
                        variantTitle
                        sku
                      }
                    }
                  }
                  supportedActions {
                    action
                    externalUrl
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

      const fulfillmentOrders = edgesToNodes(
        data.order.fulfillmentOrders,
      ).map((fo: any) => ({
        ...fo,
        lineItems: edgesToNodes(fo.lineItems),
      }));

      return {
        orderId: data.order.id,
        orderName: data.order.name,
        fulfillmentOrdersCount: fulfillmentOrders.length,
        fulfillmentOrders,
      };
    } catch (error) {
      handleToolError("fetch fulfillment orders", error);
    }
  },
};

export { getFulfillmentOrders };
