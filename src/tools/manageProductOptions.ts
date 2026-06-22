import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

// Input schema for manageProductOptions
const ManageProductOptionsInputSchema = z.object({
  productId: z.string().min(1).describe("Shopify product GID"),
  action: z.enum(["create", "update", "delete"]),
  variantStrategy: z
    .enum(["LEAVE_AS_IS", "CREATE"])
    .optional()
    .describe("Strategy for variant creation when adding options. LEAVE_AS_IS (default) keeps existing variants, CREATE generates new variant combinations."),
  // For create
  options: z
    .array(
      z.object({
        name: z.string().describe("Option name, e.g. 'Size' or 'Color'"),
        position: z.number().optional().describe("Position of the option (1-based)"),
        values: z
          .array(z.string())
          .optional()
          .describe("Option values, e.g. ['Small', 'Medium', 'Large']"),
      })
    )
    .optional()
    .describe("Options to create (action=create)"),
  // For update
  optionId: z.string().optional().describe("Option GID to update (action=update)"),
  name: z.string().optional().describe("New name for the option (action=update)"),
  position: z.number().optional().describe("New position (action=update)"),
  valuesToAdd: z
    .array(z.string())
    .optional()
    .describe("Values to add (action=update)"),
  valuesToDelete: z
    .array(z.string())
    .optional()
    .describe("Value GIDs to delete (action=update)"),
  // For delete
  optionIds: z
    .array(z.string())
    .optional()
    .describe("Option GIDs to delete (action=delete)"),
});

type ManageProductOptionsInput = z.infer<typeof ManageProductOptionsInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

type MutationResponse = {
  product: any;
  userErrors: Array<{ field: string; message: string; code?: string }>;
};

const manageProductOptions = {
  name: "manage-product-options",
  description:
    "Create, update, or delete product options (e.g. Size, Color). Use action='create' to add options, 'update' to rename or add/remove values, 'delete' to remove options.",
  schema: ManageProductOptionsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: ManageProductOptionsInput) => {
    try {
      const { productId, action } = input;

      if (action === "create") {
        if (!input.options?.length) {
          throw new Error("options array is required for action=create");
        }

        const query = gql`
          #graphql

          mutation productOptionsCreate(
            $productId: ID!
            $options: [OptionCreateInput!]!
            $variantStrategy: ProductOptionCreateVariantStrategy
          ) {
            productOptionsCreate(
              productId: $productId
              options: $options
              variantStrategy: $variantStrategy
            ) {
              product {
                ...ProductOptionsFields
              }
              userErrors {
                field
                message
                code
              }
            }
          }

          fragment ProductOptionsFields on Product {
            id
            title
            options {
              id
              name
              position
              optionValues {
                id
                name
                hasVariants
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  price
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        `;

        const options = input.options.map((o) => ({
          name: o.name,
          ...(o.position !== undefined && { position: o.position }),
          ...(o.values && {
            values: o.values.map((v) => ({ name: v })),
          }),
        }));

        const data = (await shopifyClient.request(query, {
          productId,
          options,
          variantStrategy: input.variantStrategy || "LEAVE_AS_IS",
        })) as { productOptionsCreate: MutationResponse };

        checkUserErrors(data.productOptionsCreate.userErrors, "create options");

        return formatProductResponse(data.productOptionsCreate.product);
      }

      if (action === "update") {
        if (!input.optionId) {
          throw new Error("optionId is required for action=update");
        }

        const query = gql`
          #graphql

          mutation productOptionUpdate(
            $productId: ID!
            $option: OptionUpdateInput!
            $optionValuesToAdd: [OptionValueCreateInput!]
            $optionValuesToDelete: [ID!]
          ) {
            productOptionUpdate(
              productId: $productId
              option: $option
              optionValuesToAdd: $optionValuesToAdd
              optionValuesToDelete: $optionValuesToDelete
            ) {
              product {
                ...ProductOptionsFields
              }
              userErrors {
                field
                message
                code
              }
            }
          }

          fragment ProductOptionsFields on Product {
            id
            title
            options {
              id
              name
              position
              optionValues {
                id
                name
                hasVariants
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  price
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        `;

        const option: Record<string, any> = { id: input.optionId };
        if (input.name) option.name = input.name;
        if (input.position !== undefined) option.position = input.position;

        const variables: Record<string, any> = { productId, option };
        if (input.valuesToAdd?.length) {
          variables.optionValuesToAdd = input.valuesToAdd.map((v) => ({
            name: v,
          }));
        }
        if (input.valuesToDelete?.length) {
          variables.optionValuesToDelete = input.valuesToDelete;
        }

        const data = (await shopifyClient.request(
          query,
          variables
        )) as { productOptionUpdate: MutationResponse };

        checkUserErrors(data.productOptionUpdate.userErrors, "update option");

        return formatProductResponse(data.productOptionUpdate.product);
      }

      if (action === "delete") {
        if (!input.optionIds?.length) {
          throw new Error("optionIds array is required for action=delete");
        }

        const query = gql`
          #graphql

          mutation productOptionsDelete(
            $productId: ID!
            $options: [ID!]!
          ) {
            productOptionsDelete(
              productId: $productId
              options: $options
            ) {
              product {
                ...ProductOptionsFields
              }
              userErrors {
                field
                message
                code
              }
            }
          }

          fragment ProductOptionsFields on Product {
            id
            title
            options {
              id
              name
              position
              optionValues {
                id
                name
                hasVariants
              }
            }
            variants(first: 20) {
              edges {
                node {
                  id
                  title
                  price
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
          }
        `;

        const data = (await shopifyClient.request(query, {
          productId,
          options: input.optionIds,
        })) as { productOptionsDelete: MutationResponse };

        checkUserErrors(data.productOptionsDelete.userErrors, "delete options");

        return formatProductResponse(data.productOptionsDelete.product);
      }

      throw new Error(`Unknown action: ${action}`);
    } catch (error) {
      handleToolError("manage product options", error);
    }
  },
};

function formatProductResponse(product: any) {
  return {
    product: {
      id: product.id,
      title: product.title,
      options: product.options.map((o: any) => ({
        id: o.id,
        name: o.name,
        position: o.position,
        values: o.optionValues.map((v: any) => ({
          id: v.id,
          name: v.name,
          hasVariants: v.hasVariants,
        })),
      })),
      variants: product.variants.edges.map((e: any) => ({
        id: e.node.id,
        title: e.node.title,
        price: e.node.price,
        options: e.node.selectedOptions,
      })),
    },
  };
}

export { manageProductOptions };
