/**
 * Get Order By ID Tool - Retrieve a specific order from Shopify store
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';

// Input validation schema
const GetOrderByIdSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
});

type GetOrderByIdArgs = z.infer<typeof GetOrderByIdSchema>;

export class GetOrderByIdTool extends BaseTool {
  get name(): string {
    return 'get-order-by-id';
  }

  get description(): string {
    return 'Retrieve a specific order from the Shopify store by its ID';
  }

  get inputSchema() {
    return GetOrderByIdSchema;
  }

  protected async executeImpl(args: GetOrderByIdArgs): Promise<any> {
    const { orderId } = args;

    const orderGid = this.toGraphQLId(orderId, 'Order');

    const query = `
      query GetOrderById($id: ID!) {
        order(id: $id) {
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
            phone
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
          billingAddress {
            address1
            address2
            city
            provinceCode
            zip
            country
            phone
          }
          lineItems(first: 20) {
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
                  price
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
          note
          cancelReason
          cancelledAt
          fulfillments {
            id
            status
            trackingInfo {
              number
              url
              company
            }
          }
        }
      }
    `;

    const variables = {
      id: orderGid,
    };

    const result = await this.context.shopifyClient.query(query, variables);
    
    if (!result.order) {
      throw new Error(`Order not found with ID: ${orderId}`);
    }

    const order = result.order;
    const lineItems = this.extractEdges(order, 'lineItems');

    const formattedOrder = {
      ...order,
      lineItems,
      financialStatus: order.displayFinancialStatus,
      fulfillmentStatus: order.displayFulfillmentStatus,
      totalPrice: order.totalPriceSet.shopMoney,
      subtotalPrice: order.subtotalPriceSet.shopMoney,
      totalShippingPrice: order.totalShippingPriceSet.shopMoney,
      totalTax: order.totalTaxSet.shopMoney,
    };

    this.context.logger.info('Order retrieved successfully', {
      orderId: order.id,
      orderName: order.name,
      lineItemCount: lineItems.length,
    });

    return {
      order: formattedOrder,
    };
  }
}