import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const SetMetafieldsInputSchema = z.object({
  metafields: z
    .array(
      z.object({
        ownerId: z.string().describe("GID of the resource, e.g. gid://shopify/Product/123 or gid://shopify/Customer/123"),
        namespace: z.string().optional().describe("Metafield namespace. If omitted, app-reserved namespace is used."),
        key: z.string().describe("Unique identifier within its namespace (2-64 chars)"),
        value: z.string().describe("The value to set (always stored as string)"),
        type: z.string().optional().describe("Metafield type, e.g. 'single_line_text_field', 'json', 'number_integer'. Required if no definition exists."),
      })
    )
    .min(1)
    .max(25)
    .describe("Metafields to set (max 25). Works on any resource: products, orders, customers, variants, collections, etc."),
});

type SetMetafieldsInput = z.infer<typeof SetMetafieldsInputSchema>;

let shopifyClient: GraphQLClient;

const setMetafields = {
  name: "set-metafields",
  description:
    "Set metafields on any Shopify resource (products, orders, customers, variants, collections, etc.). Creates or updates up to 25 metafields atomically.",
  schema: SetMetafieldsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: SetMetafieldsInput) => {
    try {
      const query = gql`
        #graphql

        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
              type
              ownerType
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const data = (await shopifyClient.request(query, {
        metafields: input.metafields,
      })) as {
        metafieldsSet: {
          metafields: any[] | null;
          userErrors: Array<{ field: string; message: string; code: string }>;
        };
      };

      checkUserErrors(data.metafieldsSet.userErrors, "set metafields");

      return {
        metafields: data.metafieldsSet.metafields || [],
      };
    } catch (error) {
      handleToolError("set metafields", error);
    }
  },
};

export { setMetafields };
