import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { handleToolError, edgesToNodes } from "../lib/toolUtils.js";
import { defineProjection } from "../lib/projection.js";
import { formatLineItems, formatOrderSummary } from "../lib/formatters.js";

/** Selectable fields for order-by-id */
const orderByIdProjection = defineProjection({
  id: "id",
  name: "name",
  createdAt: "createdAt",
  financialStatus: "displayFinancialStatus",
  fulfillmentStatus: "displayFulfillmentStatus",
  totalPrice: "totalPriceSet { shopMoney { amount currencyCode } }",
  subtotalPrice: "subtotalPriceSet { shopMoney { amount currencyCode } }",
  shippingPrice: "totalShippingPriceSet { shopMoney { amount currencyCode } }",
  tax: "totalTaxSet { shopMoney { amount currencyCode } }",
  currentTotalPrice: "currentTotalPriceSet { shopMoney { amount currencyCode } }",
  customer: "customer { id firstName lastName defaultEmailAddress { emailAddress } defaultPhoneNumber { phoneNumber } }",
  shippingAddress: "shippingAddress { address1 address2 city provinceCode zip country phone }",
  billingAddress: "billingAddress { address1 address2 city provinceCode zip country company phone firstName lastName }",
  lineItems: "lineItems(first: 20) { edges { node { id title quantity originalTotalSet { shopMoney { amount currencyCode } } variant { id title sku } } } }",
  tags: "tags",
  note: "note",
  cancelReason: "cancelReason",
  cancelledAt: "cancelledAt",
  updatedAt: "updatedAt",
  returnStatus: "returnStatus",
  processedAt: "processedAt",
  poNumber: "poNumber",
  discountCodes: "discountCodes",
  metafields: "metafields(first: 20) { edges { node { id namespace key value type } } }",
});

// Input schema for getOrderById
const GetOrderByIdInputSchema = z.object({
  orderId: z
    .string()
    .min(1)
    .describe(
      "Accepts order numbers (e.g. 77713), numeric IDs, or full GIDs (gid://shopify/Order/...)",
    ),
  fields: orderByIdProjection.fieldsParam({ noun: "order" }),
});

type GetOrderByIdInput = z.infer<typeof GetOrderByIdInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const getOrderById = {
  name: "get-order-by-id",
  description: "Get a specific order by ID. Supports field selection via 'fields' to reduce response size.",
  schema: GetOrderByIdInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetOrderByIdInput) => {
    try {
      const { orderId, fields } = input;

      // Smart lookup: detect format and resolve to GID
      let resolvedId: string;
      const trimmed = orderId.trim();

      if (trimmed.startsWith("gid://")) {
        // Already a full GID
        resolvedId = trimmed;
      } else if (/^#?\d{1,9}$/.test(trimmed)) {
        // Short number or #number — treat as order name, query by name
        const orderName = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
        const nameQuery = gql`
          query FindOrderByName($query: String!) {
            orders(first: 1, query: $query) {
              edges {
                node {
                  id
                }
              }
            }
          }
        `;
        const nameData = (await shopifyClient.request(nameQuery, {
          query: `name:${orderName}`,
        })) as { orders: { edges: Array<{ node: { id: string } }> } };

        if (nameData.orders.edges.length === 0) {
          throw new Error(`Order with name ${orderName} not found`);
        }
        resolvedId = nameData.orders.edges[0].node.id;
      } else if (/^\d+$/.test(trimmed)) {
        // Long numeric ID — convert to GID
        resolvedId = `gid://shopify/Order/${trimmed}`;
      } else {
        // Unknown format — try as-is
        resolvedId = trimmed;
      }

      const query = `
        query GetOrderById($id: ID!) {
          order(id: $id) {
            ${orderByIdProjection.selection(fields)}
          }
        }
      `;

      const variables = {
        id: resolvedId
      };

      const data = (await shopifyClient.request(query, variables)) as {
        order: any;
      };

      if (!data.order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      const order = data.order;

      // When custom fields are specified, return raw nodes (run edgesToNodes on connection fields)
      if (fields) {
        const result: any = orderByIdProjection.normalize(order);
        return { order: result };
      }

      // Default: full formatting
      const base = formatOrderSummary(order);
      const formattedOrder = {
        ...base,
        customer: order.customer
          ? {
              ...base.customer,
              phone: order.customer.defaultPhoneNumber?.phoneNumber || null,
            }
          : null,
        billingAddress: order.billingAddress,
        cancelReason: order.cancelReason,
        cancelledAt: order.cancelledAt,
        updatedAt: order.updatedAt,
        returnStatus: order.returnStatus,
        processedAt: order.processedAt,
        poNumber: order.poNumber,
        discountCodes: order.discountCodes,
        currentTotalPrice: order.currentTotalPriceSet?.shopMoney,
        metafields: edgesToNodes(order.metafields),
      };

      return { order: formattedOrder };
    } catch (error) {
      handleToolError("fetch order", error);
    }
  }
};

export { getOrderById };
