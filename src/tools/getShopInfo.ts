import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { handleToolError } from "../lib/toolUtils.js";

const GetShopInfoInputSchema = z.object({});
type GetShopInfoInput = z.infer<typeof GetShopInfoInputSchema>;

let shopifyClient: GraphQLClient;

const getShopInfo = {
  name: "get-shop-info",
  description:
    "Get shop configuration including name, plan, currencies, features, payment settings, tax config, and contact info",
  schema: GetShopInfoInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (_input: GetShopInfoInput) => {
    try {
      const query = gql`
        #graphql

        query GetShopInfo {
          shop {
            id
            name
            email
            contactEmail
            myshopifyDomain
            primaryDomain {
              url
              host
            }
            plan {
              publicDisplayName
              partnerDevelopment
              shopifyPlus
            }
            currencyCode
            enabledPresentmentCurrencies
            ianaTimezone
            timezoneAbbreviation
            taxShipping
            taxesIncluded
            setupRequired
            features {
              giftCards
              reports
              storefront
              harmonizedSystemCode
              avalaraAvatax
              sellsSubscriptions
            }
            paymentSettings {
              supportedDigitalWallets
            }
            shopAddress {
              address1
              address2
              city
              province
              provinceCode
              country
              countryCodeV2
              zip
              phone
            }
          }
        }
      `;

      const data: any = await shopifyClient.request(query);

      return { shop: data.shop };
    } catch (error) {
      handleToolError("fetch shop info", error);
    }
  },
};

export { getShopInfo };
