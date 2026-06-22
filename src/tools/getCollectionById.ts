import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError, buildFieldSelection } from "../lib/toolUtils.js";

/** Map of selectable field names → GraphQL fragments for collection-by-id */
const COLLECTION_BY_ID_FIELD_MAP: Record<string, string> = {
  id: "id",
  title: "title",
  handle: "handle",
  descriptionHtml: "descriptionHtml",
  sortOrder: "sortOrder",
  templateSuffix: "templateSuffix",
  updatedAt: "updatedAt",
  productsCount: "productsCount { count }",
  ruleSet: "ruleSet { appliedDisjunctively rules { column relation condition } }",
  image: "image { url altText width height }",
  seo: "seo { title description }",
};

const AVAILABLE_COLLECTION_BY_ID_FIELDS = Object.keys(COLLECTION_BY_ID_FIELD_MAP) as [string, ...string[]];

const GetCollectionByIdInputSchema = z.object({
  collectionId: z
    .string()
    .min(1)
    .describe(
      "The collection ID (e.g. gid://shopify/Collection/123 or just 123)",
    ),
  productsFirst: z
    .number()
    .min(0)
    .max(100)
    .default(25)
    .optional()
    .describe(
      "Number of products to include (default 25, max 100, 0 to skip products)",
    ),
  fields: z
    .array(z.enum(AVAILABLE_COLLECTION_BY_ID_FIELDS))
    .optional()
    .describe(
      "IMPORTANT: Always specify this to minimize token usage and avoid flooding context with unnecessary data. " +
      "Only the listed collection-level fields will be fetched. 'id' is always included. " +
      "Products are controlled separately via 'productsFirst'. " +
      "If you are unsure which fields are needed, ask the user before fetching all fields. " +
      "Example: [\"id\", \"title\"] returns only GID and title. " +
      `Available: ${AVAILABLE_COLLECTION_BY_ID_FIELDS.join(", ")}`,
    ),
});
type GetCollectionByIdInput = z.infer<typeof GetCollectionByIdInputSchema>;

let shopifyClient: GraphQLClient;

const getCollectionById = {
  name: "get-collection-by-id",
  description:
    "Get a single collection with full details including products (paginated), rules for smart collections, SEO, and image. Supports field selection via 'fields' to reduce response size.",
  schema: GetCollectionByIdInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetCollectionByIdInput) => {
    try {
      const collectionId = input.collectionId.startsWith("gid://")
        ? input.collectionId
        : `gid://shopify/Collection/${input.collectionId}`;
      const productsFirst = input.productsFirst ?? 25;
      const { fields } = input;

      // When fields is set, use field selection for collection-level fields
      if (fields) {
        const fieldSelection = buildFieldSelection(COLLECTION_BY_ID_FIELD_MAP, fields);

        // Append products block separately if productsFirst > 0
        const productsBlock = productsFirst > 0 ? `
            products(first: $productsFirst) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  vendor
                  productType
                  totalInventory
                  featuredMedia {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  priceRangeV2 {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                    maxVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }` : "";

        const query = `
          query GetCollectionById($id: ID!${productsFirst > 0 ? ", $productsFirst: Int!" : ""}) {
            collection(id: $id) {
              ${fieldSelection}
              ${productsBlock}
            }
          }
        `;

        const variables: Record<string, any> = { id: collectionId };
        if (productsFirst > 0) {
          variables.productsFirst = productsFirst;
        }

        const data: any = await shopifyClient.request(query, variables);

        if (!data.collection) {
          throw new Error(`Collection not found: ${collectionId}`);
        }

        const result: any = { ...data.collection };
        if (result.products) {
          result.products = {
            items: edgesToNodes(result.products),
            pageInfo: result.products.pageInfo,
          };
        }

        return { collection: result };
      }

      // Default: full query (backwards compatible)
      const query = gql`
        #graphql

        query GetCollectionById($id: ID!, $productsFirst: Int!) {
          collection(id: $id) {
            id
            title
            handle
            descriptionHtml
            sortOrder
            templateSuffix
            updatedAt
            productsCount {
              count
            }
            ruleSet {
              appliedDisjunctively
              rules {
                column
                relation
                condition
              }
            }
            image {
              url
              altText
              width
              height
            }
            seo {
              title
              description
            }
            products(first: $productsFirst) {
              edges {
                node {
                  id
                  title
                  handle
                  status
                  vendor
                  productType
                  totalInventory
                  featuredMedia {
                    preview {
                      image {
                        url
                        altText
                      }
                    }
                  }
                  priceRangeV2 {
                    minVariantPrice {
                      amount
                      currencyCode
                    }
                    maxVariantPrice {
                      amount
                      currencyCode
                    }
                  }
                }
              }
              pageInfo {
                hasNextPage
                endCursor
              }
            }
          }
        }
      `;

      const data: any = await shopifyClient.request(query, {
        id: collectionId,
        productsFirst,
      });

      if (!data.collection) {
        throw new Error(`Collection not found: ${collectionId}`);
      }

      const collection = {
        ...data.collection,
        products: {
          items: edgesToNodes(data.collection.products),
          pageInfo: data.collection.products.pageInfo,
        },
      };

      return { collection };
    } catch (error) {
      handleToolError("fetch collection", error);
    }
  },
};

export { getCollectionById };
