import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { checkUserErrors, handleToolError } from "../lib/toolUtils.js";
import { shippingAddressSchema } from "../lib/formatters.js";

const ManageCustomerAddressInputSchema = z.object({
  customerId: z.string().describe("Customer GID, e.g. gid://shopify/Customer/123"),
  action: z.enum(["create", "update", "delete"]).describe("Action to perform"),
  addressId: z.string().optional().describe("Address GID (required for update and delete)"),
  address: shippingAddressSchema.optional().describe("Address fields (required for create and update)"),
  setAsDefault: z.boolean().optional().describe("Set this address as the customer's default"),
});

type ManageCustomerAddressInput = z.infer<typeof ManageCustomerAddressInputSchema>;

let shopifyClient: GraphQLClient;

const manageCustomerAddress = {
  name: "manage-customer-address",
  description:
    "Create, update, or delete a customer's mailing address. Can optionally set as default.",
  schema: ManageCustomerAddressInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: ManageCustomerAddressInput) => {
    try {
      if (input.action === "create") {
        if (!input.address) {
          throw new Error("Address fields are required for create action");
        }

        const query = gql`
          #graphql

          mutation customerAddressCreate(
            $customerId: ID!
            $address: MailingAddressInput!
            $setAsDefault: Boolean
          ) {
            customerAddressCreate(
              customerId: $customerId
              address: $address
              setAsDefault: $setAsDefault
            ) {
              address {
                id
                address1
                address2
                city
                company
                countryCodeV2
                firstName
                lastName
                phone
                provinceCode
                zip
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const data = (await shopifyClient.request(query, {
          customerId: input.customerId,
          address: input.address,
          setAsDefault: input.setAsDefault,
        })) as {
          customerAddressCreate: {
            address: any;
            userErrors: Array<{ field: string; message: string }>;
          };
        };

        checkUserErrors(data.customerAddressCreate.userErrors, "create address");

        return { address: data.customerAddressCreate.address };
      } else if (input.action === "update") {
        if (!input.addressId) {
          throw new Error("addressId is required for update action");
        }
        if (!input.address) {
          throw new Error("Address fields are required for update action");
        }

        const query = gql`
          #graphql

          mutation customerAddressUpdate(
            $customerId: ID!
            $addressId: ID!
            $address: MailingAddressInput!
            $setAsDefault: Boolean
          ) {
            customerAddressUpdate(
              customerId: $customerId
              addressId: $addressId
              address: $address
              setAsDefault: $setAsDefault
            ) {
              address {
                id
                address1
                address2
                city
                company
                countryCodeV2
                firstName
                lastName
                phone
                provinceCode
                zip
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const data = (await shopifyClient.request(query, {
          customerId: input.customerId,
          addressId: input.addressId,
          address: input.address,
          setAsDefault: input.setAsDefault,
        })) as {
          customerAddressUpdate: {
            address: any;
            userErrors: Array<{ field: string; message: string }>;
          };
        };

        checkUserErrors(data.customerAddressUpdate.userErrors, "update address");

        return { address: data.customerAddressUpdate.address };
      } else {
        // delete
        if (!input.addressId) {
          throw new Error("addressId is required for delete action");
        }

        const query = gql`
          #graphql

          mutation customerAddressDelete($customerId: ID!, $addressId: ID!) {
            customerAddressDelete(customerId: $customerId, addressId: $addressId) {
              deletedAddressId
              userErrors {
                field
                message
              }
            }
          }
        `;

        const data = (await shopifyClient.request(query, {
          customerId: input.customerId,
          addressId: input.addressId,
        })) as {
          customerAddressDelete: {
            deletedAddressId: string | null;
            userErrors: Array<{ field: string; message: string }>;
          };
        };

        checkUserErrors(data.customerAddressDelete.userErrors, "delete address");

        return { deletedAddressId: data.customerAddressDelete.deletedAddressId };
      }
    } catch (error) {
      handleToolError(`${input.action} customer address`, error);
    }
  },
};

export { manageCustomerAddress };
