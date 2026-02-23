import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteProductVariants
const DeleteProductVariantsInputSchema = z.object({
  productId: z.string().min(1).describe("Shopify product GID"),
  variantIds: z.array(z.string().min(1)).min(1).describe("Array of variant GIDs to delete"),
});

type DeleteProductVariantsInput = z.infer<typeof DeleteProductVariantsInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const deleteProductVariants = {
  name: "delete-product-variants",
  description: "Delete one or more variants from a product",
  schema: DeleteProductVariantsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteProductVariantsInput) => {
    try {
      const { productId, variantIds } = input;

      const query = gql`
        mutation productVariantsBulkDelete(
          $productId: ID!
          $variantsIds: [ID!]!
        ) {
          productVariantsBulkDelete(
            productId: $productId
            variantsIds: $variantsIds
          ) {
            product {
              id
              title
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    selectedOptions {
                      name
                      value
                    }
                  }
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
        productId,
        variantsIds: variantIds,
      })) as {
        productVariantsBulkDelete: {
          product: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      if (data.productVariantsBulkDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete variants: ${data.productVariantsBulkDelete.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      const product = data.productVariantsBulkDelete.product;

      return {
        product: {
          id: product.id,
          title: product.title,
          remainingVariants: product.variants.edges.map((e: any) => ({
            id: e.node.id,
            title: e.node.title,
            price: e.node.price,
            sku: e.node.sku,
            options: e.node.selectedOptions,
          })),
        },
      };
    } catch (error) {
      console.error("Error deleting product variants:", error);
      throw new Error(
        `Failed to delete product variants: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { deleteProductVariants };
