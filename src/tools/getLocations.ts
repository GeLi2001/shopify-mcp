import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

const GetLocationsInputSchema = z.object({
  includeInactive: z
    .boolean()
    .default(false)
    .optional()
    .describe("Whether to include deactivated locations (default false)"),
  first: z
    .number()
    .min(1)
    .max(100)
    .default(50)
    .optional()
    .describe("Number of locations to return (default 50, max 100)"),
});
type GetLocationsInput = z.infer<typeof GetLocationsInputSchema>;

let shopifyClient: GraphQLClient;

const getLocations = {
  name: "get-locations",
  description:
    "Get all inventory/fulfillment locations with addresses, capabilities, and active status",
  schema: GetLocationsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetLocationsInput) => {
    try {
      const query = gql`
        #graphql

        query GetLocations($first: Int!, $includeInactive: Boolean!) {
          locations(first: $first, includeInactive: $includeInactive) {
            edges {
              node {
                id
                name
                isActive
                isFulfillmentService
                fulfillsOnlineOrders
                shipsInventory
                hasActiveInventory
                hasUnfulfilledOrders
                address {
                  address1
                  address2
                  city
                  province
                  provinceCode
                  country
                  countryCode
                  zip
                  phone
                  latitude
                  longitude
                }
                fulfillmentService {
                  serviceName
                  handle
                }
                localPickupSettingsV2 {
                  instructions
                  pickupTime
                }
              }
            }
          }
        }
      `;

      const variables = {
        first: input.first ?? 50,
        includeInactive: input.includeInactive ?? false,
      };

      const data: any = await shopifyClient.request(query, variables);
      const locations = edgesToNodes(data.locations);

      return {
        locationsCount: locations.length,
        locations,
      };
    } catch (error) {
      handleToolError("fetch locations", error);
    }
  },
};

export { getLocations };
