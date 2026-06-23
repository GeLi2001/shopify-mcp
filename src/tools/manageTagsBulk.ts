import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const ManageTagsBulkInputSchema = z.object({
  ids: z
    .array(z.string())
    .min(1)
    .max(100)
    .describe("Array of resource GIDs (orders, products, customers, etc.) — up to 100 resources in a single call. For larger sets, call this tool multiple times."),
  tags: z.array(z.string()).min(1).describe("Tags to add or remove"),
  action: z.enum(["add", "remove"]).describe("Whether to add or remove the tags"),
});

type ManageTagsBulkInput = z.infer<typeof ManageTagsBulkInputSchema>;

let shopifyClient: GraphQLClient;

const ADD_TAGS_MUTATION = gql`
  mutation tagsAdd($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }
`;

const REMOVE_TAGS_MUTATION = gql`
  mutation tagsRemove($id: ID!, $tags: [String!]!) {
    tagsRemove(id: $id, tags: $tags) {
      node { id }
      userErrors { field message }
    }
  }
`;

const manageTagsBulk = {
  name: "manage-tags-bulk",
  description:
    "Bulk add or remove tags on up to 100 resources in a single call. " +
    "IMPORTANT: Prefer this over calling manage-tags repeatedly — it runs all mutations in parallel and returns per-resource results.",
  schema: ManageTagsBulkInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: ManageTagsBulkInput) => {
    try {
      const mutation = input.action === "add" ? ADD_TAGS_MUTATION : REMOVE_TAGS_MUTATION;
      const mutationKey = input.action === "add" ? "tagsAdd" : "tagsRemove";

      const BATCH_SIZE = 20;
      const results: Array<
        | { id: string; status: "fulfilled" }
        | { id: string; status: "rejected"; error: string }
      > = [];

      for (let i = 0; i < input.ids.length; i += BATCH_SIZE) {
        const chunk = input.ids.slice(i, i + BATCH_SIZE);

        const settled = await Promise.allSettled(
          chunk.map(async (id) => {
            const data = (await shopifyClient.request(mutation, {
              id,
              tags: input.tags,
            })) as Record<string, { node: any; userErrors: Array<{ field: string; message: string }> }>;

            checkUserErrors(data[mutationKey].userErrors, `${input.action} tags on ${id}`);
            return { id, status: "fulfilled" as const };
          }),
        );

        for (let j = 0; j < settled.length; j++) {
          const result = settled[j];
          if (result.status === "fulfilled") {
            results.push(result.value);
          } else {
            results.push({
              id: chunk[j],
              status: "rejected" as const,
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
            });
          }
        }
      }

      return {
        action: input.action,
        tags: input.tags,
        results,
      };
    } catch (error) {
      handleToolError(`bulk ${input.action} tags`, error);
    }
  },
};

export { manageTagsBulk };
