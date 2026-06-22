import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const OrderMarkAsPaidInputSchema = z.object({
  orderId: z.string().describe("The order GID, e.g. gid://shopify/Order/123"),
});

type OrderMarkAsPaidInput = z.infer<typeof OrderMarkAsPaidInputSchema>;

let shopifyClient: GraphQLClient;

const orderMarkAsPaid = {
  name: "order-mark-as-paid",
  description:
    "Mark an order as paid. Useful for manual/offline payments (cash, bank deposit, etc.).",
  schema: OrderMarkAsPaidInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: OrderMarkAsPaidInput) => {
    try {
      const query = gql`
        #graphql

        mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
          orderMarkAsPaid(input: $input) {
            order {
              id
              name
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
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

      const data = (await shopifyClient.request(query, {
        input: { id: input.orderId },
      })) as {
        orderMarkAsPaid: {
          order: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.orderMarkAsPaid.userErrors, "mark order as paid");

      return { order: data.orderMarkAsPaid.order };
    } catch (error) {
      handleToolError("mark order as paid", error);
    }
  },
};

export { orderMarkAsPaid };
