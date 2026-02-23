import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for deleteProduct
const DeleteProductInputSchema = z.object({
  id: z.string().min(1).describe("Shopify product GID, e.g. gid://shopify/Product/123"),
});

type DeleteProductInput = z.infer<typeof DeleteProductInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const deleteProduct = {
  name: "delete-product",
  description: "Delete a product",
  schema: DeleteProductInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteProductInput) => {
    try {
      const query = gql`
        mutation productDelete($input: ProductDeleteInput!) {
          productDelete(input: $input) {
            deletedProductId
            userErrors {
              field
              message
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        input: { id: input.id },
      })) as {
        productDelete: {
          deletedProductId: string | null;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      if (data.productDelete.userErrors.length > 0) {
        throw new Error(
          `Failed to delete product: ${data.productDelete.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      return { deletedProductId: data.productDelete.deletedProductId };
    } catch (error) {
      console.error("Error deleting product:", error);
      throw new Error(
        `Failed to delete product: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { deleteProduct };
