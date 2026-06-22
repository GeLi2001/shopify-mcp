import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

const GetInventoryLevelsInputSchema = z.object({
  inventoryItemId: z
    .string()
    .min(1)
    .describe(
      "The inventory item ID (e.g. gid://shopify/InventoryItem/123 or just 123). Get this from getInventoryItems or product variant data.",
    ),
});
type GetInventoryLevelsInput = z.infer<typeof GetInventoryLevelsInputSchema>;

let shopifyClient: GraphQLClient;

const getInventoryLevels = {
  name: "get-inventory-levels",
  description:
    "Get inventory quantities per location for an inventory item (available, on_hand, committed, reserved, incoming, damaged, etc.)",
  schema: GetInventoryLevelsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetInventoryLevelsInput) => {
    try {
      const inventoryItemId = input.inventoryItemId.startsWith("gid://")
        ? input.inventoryItemId
        : `gid://shopify/InventoryItem/${input.inventoryItemId}`;

      const query = gql`
        #graphql

        query GetInventoryLevels($id: ID!) {
          inventoryItem(id: $id) {
            id
            sku
            tracked
            inventoryLevels(first: 50) {
              edges {
                node {
                  id
                  location {
                    id
                    name
                    isActive
                  }
                  quantities(
                    names: [
                      "available"
                      "on_hand"
                      "committed"
                      "reserved"
                      "incoming"
                      "damaged"
                      "quality_control"
                      "safety_stock"
                    ]
                  ) {
                    name
                    quantity
                  }
                  updatedAt
                }
              }
            }
          }
        }
      `;

      const data: any = await shopifyClient.request(query, {
        id: inventoryItemId,
      });

      if (!data.inventoryItem) {
        throw new Error(`Inventory item not found: ${inventoryItemId}`);
      }

      const levels = edgesToNodes(data.inventoryItem.inventoryLevels);

      return {
        inventoryItemId: data.inventoryItem.id,
        sku: data.inventoryItem.sku,
        tracked: data.inventoryItem.tracked,
        levelsCount: levels.length,
        levels,
      };
    } catch (error) {
      handleToolError("fetch inventory levels", error);
    }
  },
};

export { getInventoryLevels };
