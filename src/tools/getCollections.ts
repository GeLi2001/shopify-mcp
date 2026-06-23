import type { GraphQLClient } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";
import { defineProjection } from "../lib/projection.js";

/** Selectable fields for collections */
const collectionProjection = defineProjection({
  id: "id",
  title: "title",
  handle: "handle",
  description: "description",
  sortOrder: "sortOrder",
  productsCount: "productsCount { count }",
  templateSuffix: "templateSuffix",
  updatedAt: "updatedAt",
  ruleSet: "ruleSet { appliedDisjunctively rules { column relation condition } }",
  image: "image { url altText }",
  seo: "seo { title description }",
});

const GetCollectionsInputSchema = z.object({
  first: z
    .number()
    .min(1)
    .max(250)
    .default(25)
    .optional()
    .describe("Number of collections to return (default 25, max 250)"),
  query: z
    .string()
    .optional()
    .describe(
      "Search query to filter collections (e.g. 'title:Summer' or 'collection_type:smart')",
    ),
  fields: collectionProjection.fieldsParam({ noun: "collection" }),
});
type GetCollectionsInput = z.infer<typeof GetCollectionsInputSchema>;

let shopifyClient: GraphQLClient;

const getCollections = {
  name: "get-collections",
  description:
    "Query collections (manual & smart) with optional filtering. Supports field selection via 'fields' to reduce response size. Returns title, handle, products count, sort order, and rules for smart collections.",
  schema: GetCollectionsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetCollectionsInput) => {
    try {
      const query = `
        query GetCollections($first: Int!, $query: String) {
          collections(first: $first, query: $query) {
            edges {
              node {
                ${collectionProjection.selection(input.fields)}
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;

      const variables: Record<string, unknown> = {
        first: input.first ?? 25,
      };
      if (input.query) {
        variables.query = input.query;
      }

      const data: any = await shopifyClient.request(query, variables);
      const collections = edgesToNodes(data.collections);

      return {
        collectionsCount: collections.length,
        collections,
        pageInfo: data.collections.pageInfo,
      };
    } catch (error) {
      handleToolError("fetch collections", error);
    }
  },
};

export { getCollections };
