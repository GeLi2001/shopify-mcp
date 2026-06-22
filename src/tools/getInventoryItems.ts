import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

const GetInventoryItemsInputSchema = z.object({
  productId: z
    .string()
    .min(1)
    .describe(
      "The product ID (e.g. gid://shopify/Product/123 or just 123)",
    ),
});
type GetInventoryItemsInput = z.infer<typeof GetInventoryItemsInputSchema>;

let shopifyClient: GraphQLClient;

const getInventoryItems = {
  name: "get-inventory-items",
  description:
    "Get inventory item details for all variants of a product including SKU, cost, tracked status, country of origin, and HS codes",
  schema: GetInventoryItemsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetInventoryItemsInput) => {
    try {
      const productId = input.productId.startsWith("gid://")
        ? input.productId
        : `gid://shopify/Product/${input.productId}`;

      const query = gql`
        #graphql

        query GetInventoryItems($id: ID!) {
          product(id: $id) {
            id
            title
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  sku
                  inventoryItem {
                    id
                    sku
                    tracked
                    requiresShipping
                    unitCost {
                      amount
                      currencyCode
                    }
                    countryCodeOfOrigin
                    provinceCodeOfOrigin
                    harmonizedSystemCode
                    measurement {
                      weight {
                        unit
                        value
                      }
                    }
                    locationsCount {
                      count
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const data: any = await shopifyClient.request(query, { id: productId });

      if (!data.product) {
        throw new Error(`Product not found: ${productId}`);
      }

      const variants = edgesToNodes(data.product.variants).map(
        (variant: any) => ({
          variantId: variant.id,
          variantTitle: variant.title,
          variantSku: variant.sku,
          inventoryItem: variant.inventoryItem,
        }),
      );

      return {
        productId: data.product.id,
        productTitle: data.product.title,
        variantsCount: variants.length,
        variants,
      };
    } catch (error) {
      handleToolError("fetch inventory items", error);
    }
  },
};

export { getInventoryItems };
