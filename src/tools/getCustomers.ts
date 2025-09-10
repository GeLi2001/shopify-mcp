/**
 * Get Customers Tool - Retrieve customers from Shopify store
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';

// Input validation schema
const GetCustomersSchema = z.object({
  searchQuery: z.string().optional(),
  limit: z.number().min(1).max(250).optional().default(10),
});

type GetCustomersArgs = z.infer<typeof GetCustomersSchema>;

export class GetCustomersTool extends BaseTool {
  get name(): string {
    return 'get-customers';
  }

  get description(): string {
    return 'Retrieve customers from the Shopify store with optional search functionality';
  }

  get inputSchema() {
    return GetCustomersSchema;
  }

  protected async executeImpl(args: GetCustomersArgs): Promise<any> {
    const { searchQuery, limit } = args;

    const query = `
      query GetCustomers($first: Int!, $query: String) {
        customers(first: $first, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              createdAt
              updatedAt
              tags
              defaultAddress {
                address1
                address2
                city
                provinceCode
                zip
                country
                phone
              }
              addresses {
                address1
                address2
                city
                provinceCode
                zip
                country
                phone
              }
              amountSpent {
                amount
                currencyCode
              }
              numberOfOrders
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
      ...(searchQuery && { query: searchQuery }),
    };

    const result = await this.context.shopifyClient.query(query, variables);
    
    const customers = this.extractEdges(result, 'customers');
    const pageInfo = this.extractPageInfo(result, 'customers');

    this.context.logger.info('Customers retrieved successfully', {
      count: customers.length,
      searchQuery,
      hasNextPage: pageInfo?.hasNextPage,
    });

    return {
      customers,
      pageInfo,
      totalCount: customers.length,
    };
  }
}