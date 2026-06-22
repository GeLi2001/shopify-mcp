import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const OrderCloseOpenInputSchema = z.object({
  orderId: z.string().describe("The order GID, e.g. gid://shopify/Order/123"),
  action: z.enum(["close", "open"]).describe("Whether to close or open the order"),
});

type OrderCloseOpenInput = z.infer<typeof OrderCloseOpenInputSchema>;

let shopifyClient: GraphQLClient;

const orderCloseOpen = {
  name: "order-close-open",
  description:
    "Close or reopen an order. Closing marks all items fulfilled and finances complete. Opening reopens a closed order.",
  schema: OrderCloseOpenInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: OrderCloseOpenInput) => {
    try {
      if (input.action === "close") {
        const query = gql`
          #graphql

          mutation orderClose($input: OrderCloseInput!) {
            orderClose(input: $input) {
              order {
                id
                name
                closed
                closedAt
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const data = (await shopifyClient.request(query, {
          input: { id: input.orderId },
        })) as {
          orderClose: {
            order: any;
            userErrors: Array<{ field: string; message: string }>;
          };
        };

        checkUserErrors(data.orderClose.userErrors, "close order");

        return { order: data.orderClose.order };
      } else {
        const query = gql`
          #graphql

          mutation orderOpen($input: OrderOpenInput!) {
            orderOpen(input: $input) {
              order {
                id
                name
                closed
                closedAt
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const data = (await shopifyClient.request(query, {
          input: { id: input.orderId },
        })) as {
          orderOpen: {
            order: any;
            userErrors: Array<{ field: string; message: string }>;
          };
        };

        checkUserErrors(data.orderOpen.userErrors, "open order");

        return { order: data.orderOpen.order };
      }
    } catch (error) {
      handleToolError(`${input.action} order`, error);
    }
  },
};

export { orderCloseOpen };
