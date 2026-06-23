import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const SetInventoryQuantitiesInputSchema = z.object({
  reason: z.enum([
    "correction", "cycle_count_available", "damaged",
    "movement_created", "movement_updated", "movement_received", "movement_canceled",
    "other", "promotion", "quality_control", "received",
    "reservation_created", "reservation_deleted", "reservation_updated",
    "restock", "safety_stock", "shrinkage"
  ]).describe("Reason for the quantity change"),
  name: z.enum(["available", "on_hand"]).describe("Which quantity to set: 'available' or 'on_hand'"),
  quantities: z
    .array(
      z.object({
        inventoryItemId: z.string().describe("Inventory item GID"),
        locationId: z.string().describe("Location GID"),
        quantity: z.number().describe("Absolute quantity to set"),
      })
    )
    .min(1)
    .describe("Quantities to set for each inventory item at each location"),
  ignoreCompareQuantity: z.boolean().default(true).describe("Skip compare-and-set check (default true for simplicity)"),
});

type SetInventoryQuantitiesInput = z.infer<typeof SetInventoryQuantitiesInputSchema>;

let shopifyClient: GraphQLClient;

const setInventoryQuantities = {
  name: "inventory-set-quantities",
  description:
    "Set absolute inventory quantities for items at specific locations. Use for inventory corrections, cycle counts, etc.",
  schema: SetInventoryQuantitiesInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: SetInventoryQuantitiesInput) => {
    try {
      const query = gql`
        #graphql

        mutation inventorySetQuantities($input: InventorySetQuantitiesInput!) {
          inventorySetQuantities(input: $input) {
            inventoryAdjustmentGroup {
              reason
              changes {
                name
                delta
                quantityAfterChange
                item {
                  id
                  sku
                }
                location {
                  id
                  name
                }
              }
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        input: {
          reason: input.reason,
          name: input.name,
          ignoreCompareQuantity: input.ignoreCompareQuantity,
          quantities: input.quantities,
        },
      })) as {
        inventorySetQuantities: {
          inventoryAdjustmentGroup: any;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.inventorySetQuantities.userErrors, "set inventory quantities");

      return {
        adjustmentGroup: data.inventorySetQuantities.inventoryAdjustmentGroup,
      };
    } catch (error) {
      handleToolError("set inventory quantities", error);
    }
  },
};

export { setInventoryQuantities };
