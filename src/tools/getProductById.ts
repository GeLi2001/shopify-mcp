/**
 * Get Product By ID Tool - Retrieve a specific product by ID
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';

const GetProductByIdSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

type GetProductByIdArgs = z.infer<typeof GetProductByIdSchema>;

export class GetProductByIdTool extends BaseTool {
  get name(): string {
    return 'get-product-by-id';
  }

  get description(): string {
    return 'Retrieve a specific product by its ID from the Shopify store';
  }

  get inputSchema() {
    return GetProductByIdSchema;
  }

  protected async executeImpl(args: GetProductByIdArgs): Promise<any> {
    const { id } = args;
    
    const productId = this.toGraphQLId(id, 'Product');

    const graphQLQuery = `
      query GetProduct($id: ID!) {
        product(id: $id) {
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
          variants(first: 50) {
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
          images(first: 20) {
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
    `;

    const response = await this.context.shopifyClient.query(graphQLQuery, { id: productId });
    
    if (!response.product) {
      throw new Error(`Product with ID ${id} not found`);
    }

    return {
      product: response.product,
      metadata: {
        requestedId: id,
        graphqlId: productId,
      },
    };
  }
}
