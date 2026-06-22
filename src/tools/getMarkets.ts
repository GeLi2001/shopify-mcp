import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";
import { edgesToNodes, handleToolError } from "../lib/toolUtils.js";

const GetMarketsInputSchema = z.object({
  first: z
    .number()
    .min(1)
    .max(50)
    .default(25)
    .optional()
    .describe("Number of markets to return (default 25, max 50)"),
});
type GetMarketsInput = z.infer<typeof GetMarketsInputSchema>;

let shopifyClient: GraphQLClient;

const getMarkets = {
  name: "get-markets",
  description:
    "Get all markets with their regions, currencies, status, and web presence configuration",
  schema: GetMarketsInputSchema,

  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetMarketsInput) => {
    try {
      const query = gql`
        #graphql

        query GetMarkets($first: Int!) {
          markets(first: $first) {
            edges {
              node {
                id
                name
                handle
                status
                type
                currencySettings {
                  baseCurrency {
                    currencyCode
                    currencyName
                  }
                  localCurrencies
                }
                webPresences(first: 10) {
                  edges {
                    node {
                      id
                      subfolderSuffix
                      defaultLocale {
                        locale
                        name
                        primary
                        published
                      }
                      alternateLocales {
                        locale
                        name
                        published
                      }
                      domain {
                        id
                        host
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const variables = {
        first: input.first ?? 25,
      };

      const data: any = await shopifyClient.request(query, variables);
      const markets = edgesToNodes(data.markets).map((market: any) => ({
        ...market,
        webPresences: market.webPresences
          ? edgesToNodes(market.webPresences)
          : [],
      }));

      return {
        marketsCount: markets.length,
        markets,
      };
    } catch (error) {
      handleToolError("fetch markets", error);
    }
  },
};

export { getMarkets };
