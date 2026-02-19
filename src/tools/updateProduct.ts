import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for updateProduct
const UpdateProductInputSchema = z.object({
  id: z.string().min(1).describe("Shopify product GID, e.g. gid://shopify/Product/123"),
  title: z.string().optional(),
  descriptionHtml: z.string().optional(),
  handle: z.string().optional().describe("URL slug for the product"),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .optional()
    .describe("SEO title and description for search engines"),
  metafields: z
    .array(
      z.object({
        id: z.string().optional(),
        namespace: z.string().optional(),
        key: z.string().optional(),
        value: z.string(),
        type: z.string().optional(),
      })
    )
    .optional(),
  collectionsToJoin: z.array(z.string()).optional().describe("Collection GIDs to add the product to"),
  collectionsToLeave: z.array(z.string()).optional().describe("Collection GIDs to remove the product from"),
  redirectNewHandle: z.boolean().optional().describe("If true, old handle redirects to new handle"),
});

type UpdateProductInput = z.infer<typeof UpdateProductInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const updateProduct = {
  name: "update-product",
  description: "Update an existing product's fields (title, description, status, tags, etc.)",
  schema: UpdateProductInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateProductInput) => {
    try {
      const { id, ...productFields } = input;

      const query = gql`
        mutation productUpdate($input: ProductInput!) {
          productUpdate(input: $input) {
            product {
              id
              title
              handle
              descriptionHtml
              vendor
              productType
              status
              tags
              seo {
                title
                description
              }
              metafields(first: 10) {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
                  }
                }
              }
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

      const variables = {
        input: {
          id,
          ...productFields,
        },
      };

      const data = (await shopifyClient.request(query, variables)) as {
        productUpdate: {
          product: any;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      if (data.productUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to update product: ${data.productUpdate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      const product = data.productUpdate.product;

      return {
        product: {
          id: product.id,
          title: product.title,
          handle: product.handle,
          descriptionHtml: product.descriptionHtml,
          vendor: product.vendor,
          productType: product.productType,
          status: product.status,
          tags: product.tags,
          seo: product.seo,
          metafields: product.metafields?.edges.map((e: any) => e.node) || [],
          variants: product.variants?.edges.map((e: any) => ({
            id: e.node.id,
            title: e.node.title,
            price: e.node.price,
            sku: e.node.sku,
            options: e.node.selectedOptions,
          })) || [],
        },
      };
    } catch (error) {
      console.error("Error updating product:", error);
      throw new Error(
        `Failed to update product: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { updateProduct };
