/**
 * Get Products Tool - Retrieve products from Shopify store
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';
import { ShopifyProduct } from '../types/types.js';

// Input validation schema
const GetProductsSchema = z.object({
  limit: z.number().min(1).max(250).optional().default(10),
  cursor: z.string().optional(),
  query: z.string().optional(),
  sortKey: z.enum(['CREATED_AT', 'UPDATED_AT', 'TITLE', 'VENDOR', 'PRODUCT_TYPE', 'ID']).optional().default('CREATED_AT'),
  reverse: z.boolean().optional().default(false),
});

type GetProductsArgs = z.infer<typeof GetProductsSchema>;

export class GetProductsTool extends BaseTool {
  get name(): string {
    return 'get-products';
  }

  get description(): string {
    return 'Retrieve products from the Shopify store with optional filtering and pagination';
  }

  get inputSchema() {
    return GetProductsSchema;
  }

  protected async executeImpl(args: GetProductsArgs): Promise<any> {
    const { limit, cursor, query, sortKey, reverse } = args;

    const graphQLQuery = `
      query GetProducts($first: Int, $after: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
        products(first: $first, after: $after, query: $query, sortKey: $sortKey, reverse: $reverse) {
          edges {
            node {
              id
              title
              handle
              descriptionHtml
              vendor
              productType
              tags
              status
              createdAt
              updatedAt
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price
                    compareAtPrice
                    sku
                    inventoryQuantity
                    weight
                    weightUnit
                    requiresShipping
                    taxable
                    inventoryManagement
                  }
                }
              }
              images(first: 5) {
                edges {
                  node {
                    id
                    url
                    altText
                    width
                    height
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;

    const variables = {
      first: limit,
      after: cursor,
      query,
      sortKey,
      reverse,
    };

    const response = await this.context.shopifyClient.query(graphQLQuery, variables);
    
    if (!response.products) {
      throw new Error('Invalid response from Shopify GraphQL API');
    }

    const products = this.extractEdges<ShopifyProduct>(response, 'products');
    const pageInfo = this.extractPageInfo(response, 'products');

    return {
      products,
      pagination: {
        hasNextPage: pageInfo?.hasNextPage || false,
        hasPreviousPage: pageInfo?.hasPreviousPage || false,
        startCursor: pageInfo?.startCursor,
        endCursor: pageInfo?.endCursor,
        count: products.length,
      },
      metadata: {
        query: query || 'all products',
        sortKey,
        reverse,
        totalRetrieved: products.length,
      },
    };
  }
}
