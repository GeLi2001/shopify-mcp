/**
 * Get Customer Orders Tool - Retrieve orders for a specific customer
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';

// Input validation schema
const GetCustomerOrdersSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  first: z.number().min(1).max(250).default(50).optional(),
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
});

type GetCustomerOrdersArgs = z.infer<typeof GetCustomerOrdersSchema>;

export class GetCustomerOrdersTool extends BaseTool {
  get name(): string {
    return 'get-customer-orders';
  }

  get description(): string {
    return 'Retrieve orders for a specific customer from the Shopify store';
  }

  get inputSchema() {
    return GetCustomerOrdersSchema;
  }

  protected async executeImpl(args: GetCustomerOrdersArgs): Promise<any> {
    const { customerId, first = 50, status } = args;

    const customerGid = this.toGraphQLId(customerId, 'Customer');

    const query = `
      query GetCustomerOrders($customerId: ID!, $first: Int!, $query: String) {
        customer(id: $customerId) {
          id
          firstName
          lastName
          email
          orders(first: $first, query: $query) {
            edges {
              node {
                id
                name
                createdAt
                updatedAt
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
                      product {
                        id
                        title
                        handle
                      }
                    }
                  }
                }
                tags
                cancelReason
                cancelledAt
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
      }
    `;

    // Build query string for order filtering
    let queryString = '';
    if (status) {
      queryString = `status:${status}`;
    }

    const variables = {
      customerId: customerGid,
      first,
      query: queryString || null,
    };

    const result = await this.context.shopifyClient.query(query, variables);
    
    if (!result.customer) {
      throw new Error(`Customer not found with ID: ${customerId}`);
    }

    const customer = result.customer;
    const orders = this.extractEdges(customer, 'orders');

    // Format orders with their line items
    const formattedOrders = orders.map((order: any) => {
      const lineItems = this.extractEdges(order, 'lineItems');
      
      return {
        ...order,
        lineItems,
        financialStatus: order.displayFinancialStatus,
        fulfillmentStatus: order.displayFulfillmentStatus,
        totalPrice: order.totalPriceSet.shopMoney,
        subtotalPrice: order.subtotalPriceSet.shopMoney,
      };
    });

    this.context.logger.info('Customer orders retrieved successfully', {
      customerId: customer.id,
      customerEmail: customer.email,
      orderCount: orders.length,
      statusFilter: status || 'all',
    });

    return {
      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
      },
      orders: formattedOrders,
      pageInfo: customer.orders.pageInfo,
      totalCount: orders.length,
    };
  }
}
