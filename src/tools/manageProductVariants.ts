import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for manageProductVariants
const VariantOptionSchema = z.object({
  optionName: z.string().describe("Option name, e.g. 'Size' or 'Color'"),
  name: z.string().describe("Option value, e.g. '8x10' or 'Black'"),
});

const VariantSchema = z.object({
  id: z.string().optional().describe("Variant GID for updates. Omit to create new."),
  price: z.string().optional().describe("Price as string, e.g. '49.00'"),
  sku: z.string().optional().describe("SKU for the variant (mapped to inventoryItem.sku)"),
  optionValues: z.array(VariantOptionSchema).optional(),
});

const ManageProductVariantsInputSchema = z.object({
  productId: z.string().min(1).describe("Shopify product GID"),
  variants: z.array(VariantSchema).min(1).describe("Variants to create or update"),
  strategy: z
    .enum(["DEFAULT", "REMOVE_STANDALONE_VARIANT", "PRESERVE_STANDALONE_VARIANT"])
    .optional()
    .describe(
      "Strategy for handling the standalone 'Default Title' variant when creating. DEFAULT removes it automatically."
    ),
});

type ManageProductVariantsInput = z.infer<typeof ManageProductVariantsInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const manageProductVariants = {
  name: "manage-product-variants",
  description:
    "Create or update product variants. Omit variant id to create new, include id to update existing.",
  schema: ManageProductVariantsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: ManageProductVariantsInput) => {
    try {
      const { productId, variants } = input;

      // Split into creates and updates
      const toCreate = variants.filter((v) => !v.id);
      const toUpdate = variants.filter((v) => v.id);

      const results: { created: any[]; updated: any[] } = {
        created: [],
        updated: [],
      };

      // Bulk create new variants
      if (toCreate.length > 0) {
        const createQuery = gql`
          mutation productVariantsBulkCreate(
            $productId: ID!
            $variants: [ProductVariantsBulkInput!]!
            $strategy: ProductVariantsBulkCreateStrategy
          ) {
            productVariantsBulkCreate(
              productId: $productId
              variants: $variants
              strategy: $strategy
            ) {
              productVariants {
                id
                title
                price
                sku
                selectedOptions {
                  name
                  value
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const createVariants = toCreate.map((v) => {
          const variant: Record<string, any> = {};
          if (v.price) variant.price = v.price;
          if (v.sku) variant.inventoryItem = { sku: v.sku };
          if (v.optionValues) {
            variant.optionValues = v.optionValues.map((ov) => ({
              optionName: ov.optionName,
              name: ov.name,
            }));
          }
          return variant;
        });

        const createData = (await shopifyClient.request(createQuery, {
          productId,
          variants: createVariants,
          ...(input.strategy && { strategy: input.strategy }),
        })) as {
          productVariantsBulkCreate: {
            productVariants: any[];
            userErrors: Array<{ field: string; message: string }>;
          };
        };

        if (createData.productVariantsBulkCreate.userErrors.length > 0) {
          throw new Error(
            `Failed to create variants: ${createData.productVariantsBulkCreate.userErrors
              .map((e) => `${e.field}: ${e.message}`)
              .join(", ")}`
          );
        }

        results.created =
          createData.productVariantsBulkCreate.productVariants.map((v: any) => ({
            id: v.id,
            title: v.title,
            price: v.price,
            sku: v.sku,
            options: v.selectedOptions,
          }));
      }

      // Bulk update existing variants
      if (toUpdate.length > 0) {
        const updateQuery = gql`
          mutation productVariantsBulkUpdate(
            $productId: ID!
            $variants: [ProductVariantsBulkInput!]!
          ) {
            productVariantsBulkUpdate(
              productId: $productId
              variants: $variants
            ) {
              productVariants {
                id
                title
                price
                sku
                selectedOptions {
                  name
                  value
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const updateVariants = toUpdate.map((v) => {
          const variant: Record<string, any> = { id: v.id };
          if (v.price) variant.price = v.price;
          if (v.sku) variant.inventoryItem = { sku: v.sku };
          if (v.optionValues) {
            variant.optionValues = v.optionValues.map((ov) => ({
              optionName: ov.optionName,
              name: ov.name,
            }));
          }
          return variant;
        });

        const updateData = (await shopifyClient.request(updateQuery, {
          productId,
          variants: updateVariants,
        })) as {
          productVariantsBulkUpdate: {
            productVariants: any[];
            userErrors: Array<{ field: string; message: string }>;
          };
        };

        if (updateData.productVariantsBulkUpdate.userErrors.length > 0) {
          throw new Error(
            `Failed to update variants: ${updateData.productVariantsBulkUpdate.userErrors
              .map((e) => `${e.field}: ${e.message}`)
              .join(", ")}`
          );
        }

        results.updated =
          updateData.productVariantsBulkUpdate.productVariants.map((v: any) => ({
            id: v.id,
            title: v.title,
            price: v.price,
            sku: v.sku,
            options: v.selectedOptions,
          }));
      }

      return results;
    } catch (error) {
      console.error("Error managing product variants:", error);
      throw new Error(
        `Failed to manage product variants: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { manageProductVariants };
