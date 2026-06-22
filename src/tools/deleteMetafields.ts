import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const DeleteMetafieldsInputSchema = z.object({
  metafields: z
    .array(
      z.object({
        ownerId: z.string().describe("GID of the resource that owns the metafield, e.g. gid://shopify/Product/123"),
        namespace: z.string().describe("Metafield namespace"),
        key: z.string().describe("Metafield key"),
      })
    )
    .min(1)
    .describe("Metafields to delete, identified by owner + namespace + key"),
});

type DeleteMetafieldsInput = z.infer<typeof DeleteMetafieldsInputSchema>;

let shopifyClient: GraphQLClient;

const deleteMetafields = {
  name: "delete-metafields",
  description:
    "Delete metafields from any Shopify resource by specifying owner ID, namespace, and key.",
  schema: DeleteMetafieldsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DeleteMetafieldsInput) => {
    try {
      const query = gql`
        #graphql

        mutation metafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
          metafieldsDelete(metafields: $metafields) {
            deletedMetafields {
              ownerId
              namespace
              key
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        metafields: input.metafields,
      })) as {
        metafieldsDelete: {
          deletedMetafields: any[] | null;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.metafieldsDelete.userErrors, "delete metafields");

      return {
        deletedMetafields: data.metafieldsDelete.deletedMetafields || [],
      };
    } catch (error) {
      handleToolError("delete metafields", error);
    }
  },
};

export { deleteMetafields };
