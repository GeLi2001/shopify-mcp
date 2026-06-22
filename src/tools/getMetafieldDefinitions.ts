import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

/** Map common underscore aliases to their correct Shopify API enum values */
const OWNER_TYPE_NORMALIZE: Record<string, string> = {
  PRODUCT_VARIANT: "PRODUCTVARIANT",
  DRAFT_ORDER: "DRAFTORDER",
  CART_TRANSFORM: "CARTTRANSFORM",
};

const GetMetafieldDefinitionsInputSchema = z.object({
  ownerType: z
    .enum([
      "API_PERMISSION",
      "ARTICLE",
      "BLOG",
      "CART_TRANSFORM",
      "CARTTRANSFORM",
      "COLLECTION",
      "COMPANY",
      "COMPANY_LOCATION",
      "CUSTOMER",
      "DELIVERY_CUSTOMIZATION",
      "DISCOUNT",
      "DRAFT_ORDER",
      "DRAFTORDER",
      "FULFILLMENT_CONSTRAINT_RULE",
      "GIFT_CARD_TRANSACTION",
      "LOCATION",
      "MARKET",
      "MEDIA_IMAGE",
      "ORDER",
      "ORDER_ROUTING_LOCATION_RULE",
      "PAGE",
      "PAYMENT_CUSTOMIZATION",
      "PRODUCT",
      "PRODUCT_VARIANT",
      "PRODUCTVARIANT",
      "SELLING_PLAN",
      "SHOP",
      "VALIDATION",
    ])
    .describe(
      "The resource type to get metafield definitions for (e.g. PRODUCT, ORDER, CUSTOMER). " +
        "Note: Some Shopify types use concatenated names without underscores " +
        "(PRODUCTVARIANT not PRODUCT_VARIANT, DRAFTORDER not DRAFT_ORDER, CARTTRANSFORM not CART_TRANSFORM). " +
        "Underscore aliases are accepted and normalized automatically.",
    ),
  first: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .optional()
    .describe("Number of definitions to return (default 50, max 100)"),
});
type GetMetafieldDefinitionsInput = z.infer<
  typeof GetMetafieldDefinitionsInputSchema
>;

let shopifyClient: GraphQLClient;

const getMetafieldDefinitions = {
  name: "get-metafield-definitions",
  description:
    "Discover custom metafield definitions for any resource type (PRODUCT, ORDER, CUSTOMER, etc.). Returns namespace, key, name, type, and validations.",
  schema: GetMetafieldDefinitionsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMetafieldDefinitionsInput) => {
    try {
      const query = gql`
        #graphql

        query GetMetafieldDefinitions(
          $ownerType: MetafieldOwnerType!
          $first: Int!
        ) {
          metafieldDefinitions(ownerType: $ownerType, first: $first) {
            edges {
              node {
                id
                namespace
                key
                name
                description
                ownerType
                pinnedPosition
                type {
                  name
                  category
                }
                validations {
                  name
                  type
                  value
                }
              }
            }
          }
        }
      `;

      const variables = {
        ownerType: OWNER_TYPE_NORMALIZE[input.ownerType] ?? input.ownerType,
        first: input.first ?? 50,
      };

      const data: any = await shopifyClient.request(query, variables);
      const definitions = edgesToNodes(data.metafieldDefinitions);

      return {
        ownerType: input.ownerType,
        definitionsCount: definitions.length,
        definitions,
      };
    } catch (error) {
      handleToolError("fetch metafield definitions", error);
    }
  },
};

export { getMetafieldDefinitions };
