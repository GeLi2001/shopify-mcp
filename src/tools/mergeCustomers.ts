import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";

const MergeCustomersInputSchema = z.object({
  customerOneId: z.string().describe("GID of the first customer, e.g. gid://shopify/Customer/123"),
  customerTwoId: z.string().describe("GID of the second customer, e.g. gid://shopify/Customer/456"),
  overrideFields: z
    .object({
      customerIdOfFirstNameToKeep: z.string().optional().describe("Customer GID whose first name to keep, e.g. gid://shopify/Customer/123"),
      customerIdOfLastNameToKeep: z.string().optional().describe("Customer GID whose last name to keep, e.g. gid://shopify/Customer/123"),
      customerIdOfEmailToKeep: z.string().optional().describe("Customer GID whose email to keep, e.g. gid://shopify/Customer/123"),
      customerIdOfPhoneNumberToKeep: z.string().optional().describe("Customer GID whose phone to keep, e.g. gid://shopify/Customer/123"),
      customerIdOfDefaultAddressToKeep: z.string().optional().describe("Customer GID whose default address to keep, e.g. gid://shopify/Customer/123"),
      note: z.string().optional().describe("Note to keep on the merged customer"),
      tags: z.array(z.string()).optional().describe("Tags to keep on the merged customer"),
    })
    .optional()
    .describe("Override default merge rules for specific fields"),
});

type MergeCustomersInput = z.infer<typeof MergeCustomersInputSchema>;

let shopifyClient: GraphQLClient;

const mergeCustomers = {
  name: "customer-merge",
  description:
    "Merge two customer records into one. Optionally override which fields to keep from which customer.",
  schema: MergeCustomersInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: MergeCustomersInput) => {
    try {
      const query = gql`
        #graphql

        mutation customerMerge(
          $customerOneId: ID!
          $customerTwoId: ID!
          $overrideFields: CustomerMergeOverrideFields
        ) {
          customerMerge(
            customerOneId: $customerOneId
            customerTwoId: $customerTwoId
            overrideFields: $overrideFields
          ) {
            resultingCustomerId
            job {
              id
              done
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables: Record<string, any> = {
        customerOneId: input.customerOneId,
        customerTwoId: input.customerTwoId,
      };
      if (input.overrideFields) {
        variables.overrideFields = input.overrideFields;
      }

      const data = (await shopifyClient.request(query, variables)) as {
        customerMerge: {
          resultingCustomerId: string | null;
          job: { id: string; done: boolean } | null;
          userErrors: Array<{ field: string; message: string }>;
        };
      };

      checkUserErrors(data.customerMerge.userErrors, "merge customers");

      return {
        resultingCustomerId: data.customerMerge.resultingCustomerId,
        job: data.customerMerge.job,
      };
    } catch (error) {
      handleToolError("merge customers", error);
    }
  },
};

export { mergeCustomers };
