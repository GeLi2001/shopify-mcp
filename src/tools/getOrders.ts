/**
 * Get Orders Tool - Retrieve orders from Shopify store
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';

// Input validation schema
const GetOrdersSchema = z.object({
  status: z.enum(['any', 'open', 'closed', 'cancelled']).optional().default('any'),
  limit: z.number().min(1).max(250).optional().default(10),
});

type GetOrdersArgs = z.infer<typeof GetOrdersSchema>;

export class GetOrdersTool extends BaseTool {
  get name(): string {
    return 'get-orders';
  }

  get description(): string {
    return 'Retrieve orders from the Shopify store with optional status filtering';
  }

  get inputSchema() {
    return GetOrdersSchema;
  }

  protected async executeImpl(args: GetOrdersArgs): Promise<any> {
    const { status, limit } = args;

    // Build query filters
    let queryFilter = '';
    if (status !== 'any') {
      queryFilter = `status:${status}`;
    }

    const query = `
      query GetOrders($first: Int!, $query: String) {
        orders(first: $first, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              subtotalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalShippingPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              totalTaxSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              customer {
                id
                firstName
                lastName
                email
              }
              shippingAddress {
                address1
                address2
                city
                provinceCode
                zip
                country
                phone
              }
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    title
                    quantity
                    originalTotalSet {
                      shopMoney {
                        amount
                        currencyCode
                      }
                    }
                    variant {
                      id
                      title
                      sku
                    }
                  }
                }
              }
              tags
              note
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
      ...(queryFilter && { query: queryFilter }),
    };

    const result = await this.context.shopifyClient.query(query, variables);
    
    const orders = this.extractEdges(result, 'orders').map((order: any) => {
      const lineItems = this.extractEdges(order, 'lineItems');
      return {
        ...order,
        lineItems,
        totalPrice: order.totalPriceSet.shopMoney,
        subtotalPrice: order.subtotalPriceSet.shopMoney,
        totalShippingPrice: order.totalShippingPriceSet.shopMoney,
        totalTax: order.totalTaxSet.shopMoney,
        financialStatus: order.displayFinancialStatus,
        fulfillmentStatus: order.displayFulfillmentStatus,
      };
    });

    const pageInfo = this.extractPageInfo(result, 'orders');

    this.context.logger.info('Orders retrieved successfully', {
      count: orders.length,
      status,
      hasNextPage: pageInfo?.hasNextPage,
    });

    return {
      orders,
      pageInfo,
      totalCount: orders.length,
    };
  }
}