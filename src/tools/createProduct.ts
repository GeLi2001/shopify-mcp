
import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating a product
const CreateProductInputSchema = z.object({
  title: z.string().min(1),
  descriptionHtml: z.string().optional(),
  handle: z.string().optional().describe("URL slug, e.g. 'black-sunglasses'. Auto-generated from title if omitted."),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
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
        namespace: z.string(),
        key: z.string(),
        value: z.string(),
        type: z.string().describe("Metafield type, e.g. 'single_line_text_field', 'json', 'number_integer'"),
      })
    )
    .optional(),
  productOptions: z
    .array(
      z.object({
        name: z.string().describe("Option name, e.g. 'Size' or 'Color'"),
        values: z
          .array(z.object({ name: z.string() }))
          .optional()
          .describe("Option values"),
      })
    )
    .optional()
    .describe("Product options to create inline (max 3)"),
  collectionsToJoin: z
    .array(z.string())
    .optional()
    .describe("Collection GIDs to add the product to"),
});

type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createProduct = {
  name: "create-product",
  description: "Create a new product. When using productOptions, Shopify registers all option values but only creates one default variant (first value of each option, price $0). Use manage-product-variants with strategy=REMOVE_STANDALONE_VARIANT afterward to create all real variants with prices.",
  schema: CreateProductInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateProductInput) => {
    try {
      const query = gql`
        mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
          productCreate(product: $product, media: $media) {
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
              options {
                id
                name
                values
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
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const { media, ...productInput } = input as CreateProductInput & { media?: any[] };

      const variables: Record<string, any> = {
        product: productInput,
      };
      if (media?.length) {
        variables.media = media;
      }

      const data = (await shopifyClient.request(query, variables)) as {
        productCreate: {
          product: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.productCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create product: ${data.productCreate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      const product = data.productCreate.product;

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
          options: product.options,
          metafields: product.metafields?.edges.map((e: any) => e.node) || [],
        },
      };
    } catch (error) {
      console.error("Error creating product:", error);
      throw new Error(
        `Failed to create product: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  },
};

export { createProduct };
