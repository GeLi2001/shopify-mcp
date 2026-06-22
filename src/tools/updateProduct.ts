import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

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
        id: z.string().optional().describe("Metafield GID to update an existing metafield. Omit to create/upsert by namespace+key."),
        namespace: z.string().optional().describe("Metafield namespace (required when creating without id)"),
        key: z.string().optional().describe("Metafield key (required when creating without id)"),
        value: z.string().describe("The value to set"),
        type: z.string().optional().describe("Metafield type (e.g. 'single_line_text_field'). Required when creating a new metafield without a definition."),
      })
    )
    .optional()
    .describe(
      "Metafields to create or update inline. Pass 'id' to update existing, or 'namespace'+'key' to upsert. " +
      "For standalone metafield operations, prefer the set-metafields tool instead."
    ),
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
        #graphql

        mutation productUpdate($product: ProductUpdateInput!) {
          productUpdate(product: $product) {
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
        product: {
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

      checkUserErrors(data.productUpdate.userErrors, "update product");

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
      handleToolError("update product", error);
    }
  },
};

export { updateProduct };
