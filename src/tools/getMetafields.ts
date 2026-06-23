import type { GraphQLClient } from "graphql-request";
import { z } from "zod";
import { handleToolError } from "../lib/toolUtils.js";

const GetMetafieldsInputSchema = z.object({
  ownerId: z.string().describe("GID of the resource (product, order, customer, variant, collection, etc.)"),
  namespace: z.string().optional().describe("Filter metafields by namespace. Ignored when 'keys' is provided."),
  keys: z
    .array(z.string().regex(/^[^.]+\.[^.]+$/, "Each key must be in namespace.key format (e.g. 'custom.color')"))
    .optional()
    .describe(
      "IMPORTANT: Always specify this when you only need specific metafields. " +
      "Format: namespace.key (e.g. ['custom.color', 'custom.size']). " +
      "Returns only matching metafields instead of all, significantly reducing response size. " +
      "When provided, the 'namespace' parameter is ignored.",
    ),
  first: z.number().default(25).describe("Number of metafields to return (max 50)"),
  after: z.string().optional().describe("Cursor for pagination"),
});

type GetMetafieldsInput = z.infer<typeof GetMetafieldsInputSchema>;

let shopifyClient: GraphQLClient;

const getMetafields = {
  name: "get-metafields",
  description:
    "Get metafields for any Shopify resource (products, orders, customers, variants, collections, etc.). " +
    "Supports 'keys' filter to fetch only specific metafields by namespace.key.",
  schema: GetMetafieldsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetafieldsInput) => {
    try {
      // When keys are provided, use the keys parameter (namespace is ignored)
      const useKeys = input.keys && input.keys.length > 0;

      const query = useKeys
        ? `
          query GetMetafields($ownerId: ID!, $first: Int!, $keys: [String!]!, $after: String) {
            node(id: $ownerId) {
              ... on HasMetafields {
                metafields(first: $first, keys: $keys, after: $after) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                      type
                      updatedAt
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }
        `
        : `
          query GetMetafields($ownerId: ID!, $first: Int!, $namespace: String, $after: String) {
            node(id: $ownerId) {
              ... on HasMetafields {
                metafields(first: $first, namespace: $namespace, after: $after) {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                      type
                      updatedAt
                    }
                  }
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }
        `;

      const variables: Record<string, unknown> = {
        ownerId: input.ownerId,
        first: input.first,
        ...(input.after && { after: input.after }),
      };

      if (useKeys) {
        variables.keys = input.keys;
      } else if (input.namespace) {
        variables.namespace = input.namespace;
      }

      const data = (await shopifyClient.request(query, variables)) as {
        node: {
          metafields?: {
            edges: Array<{ node: any }>;
            pageInfo: { hasNextPage: boolean; endCursor: string | null };
          };
        } | null;
      };

      if (!data.node) {
        throw new Error(`Resource with ID ${input.ownerId} not found`);
      }

      if (!data.node.metafields) {
        throw new Error(`Resource ${input.ownerId} does not support metafields`);
      }

      return {
        metafields: data.node.metafields.edges.map((e) => e.node),
        pageInfo: data.node.metafields.pageInfo,
      };
    } catch (error) {
      handleToolError("fetch metafields", error);
    }
  },
};

export { getMetafields };
