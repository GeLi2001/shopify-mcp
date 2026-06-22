import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const OrderCancelInputSchema = z.object({
  orderId: z.string().describe("The order GID, e.g. gid://shopify/Order/123"),
  reason: z.enum(["CUSTOMER", "DECLINED", "FRAUD", "INVENTORY", "OTHER", "STAFF"]).describe("Reason for cancellation"),
  restock: z.boolean().describe("Whether to restock inventory"),
  notifyCustomer: z.boolean().default(false).describe("Whether to send cancellation notification to customer. IMPORTANT: Always confirm with the user before enabling — sends a real email/SMS to the customer."),
  staffNote: z.string().optional().describe("Internal note (not visible to customer)"),
  refund: z.boolean().optional().describe("Whether to refund the full amount to the original payment method. For partial refunds on specific line items, use refund-create instead."),
});

type OrderCancelInput = z.infer<typeof OrderCancelInputSchema>;

let shopifyClient: GraphQLClient;

const orderCancel = {
  name: "order-cancel",
  description:
    "Cancel an order with options for refunding, restocking inventory, and customer notification. Cancellation is irreversible.",
  schema: OrderCancelInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: OrderCancelInput) => {
    try {
      const query = gql`
        #graphql

        mutation orderCancel(
          $orderId: ID!
          $reason: OrderCancelReason!
          $restock: Boolean!
          $notifyCustomer: Boolean
          $staffNote: String
          $refundMethod: OrderCancelRefundMethodInput
        ) {
          orderCancel(
            orderId: $orderId
            reason: $reason
            restock: $restock
            notifyCustomer: $notifyCustomer
            staffNote: $staffNote
            refundMethod: $refundMethod
          ) {
            job {
              id
              done
            }
            orderCancelUserErrors {
              field
              message
              code
            }
          }
        }
      `;

      const variables: Record<string, any> = {
        orderId: input.orderId,
        reason: input.reason,
        restock: input.restock,
        notifyCustomer: input.notifyCustomer,
        ...(input.staffNote && { staffNote: input.staffNote }),
      };

      if (input.refund !== undefined) {
        variables.refundMethod = {
          originalPaymentMethodsRefund: input.refund,
        };
      }

      const data = (await shopifyClient.request(query, variables)) as {
        orderCancel: {
          job: { id: string; done: boolean } | null;
          orderCancelUserErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.orderCancel.orderCancelUserErrors, "cancel order");

      return {
        job: data.orderCancel.job,
        message: "Order cancellation initiated successfully",
      };
    } catch (error) {
      handleToolError("cancel order", error);
    }
  },
};

export { orderCancel };
