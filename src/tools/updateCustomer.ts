/**
 * Update Customer Tool - Update customer information in Shopify store
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';

// Input validation schema
const UpdateCustomerSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  address: z.object({
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    province: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
});

type UpdateCustomerArgs = z.infer<typeof UpdateCustomerSchema>;

export class UpdateCustomerTool extends BaseTool {
  get name(): string {
    return 'update-customer';
  }

  get description(): string {
    return 'Update customer information in the Shopify store';
  }

  get inputSchema() {
    return UpdateCustomerSchema;
  }

  protected async executeImpl(args: UpdateCustomerArgs): Promise<any> {
    const { customerId, firstName, lastName, email, phone, tags, note, address } = args;

    const customerGid = this.toGraphQLId(customerId, 'Customer');

    // Build the input object for the mutation
    const input: any = {
      id: customerGid,
    };

    if (firstName !== undefined) input.firstName = firstName;
    if (lastName !== undefined) input.lastName = lastName;
    if (email !== undefined) input.email = email;
    if (phone !== undefined) input.phone = phone;
    if (tags !== undefined) input.tags = tags;
    if (note !== undefined) input.note = note;

    // Handle address updates
    if (address) {
      input.addresses = [{
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        province: address.province,
        zip: address.zip,
        country: address.country,
        phone: address.phone,
      }];
    }

    const mutation = `
      mutation CustomerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
            phone
            tags
            note
            createdAt
            updatedAt
            addresses {
              id
              address1
              address2
              city
              province
              zip
              country
              phone
            }
            ordersCount
            totalSpent
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input,
    };

    const result = await this.context.shopifyClient.mutate(mutation, variables);

    if (result.customerUpdate.userErrors && result.customerUpdate.userErrors.length > 0) {
      const errors = result.customerUpdate.userErrors
        .map((error: any) => `${error.field}: ${error.message}`)
        .join(', ');
      throw new Error(`Failed to update customer: ${errors}`);
    }

    const customer = result.customerUpdate.customer;

    this.context.logger.info('Customer updated successfully', {
      customerId: customer.id,
      email: customer.email,
      updatedFields: Object.keys(input).filter(key => key !== 'id'),
    });

    return {
      customer,
      success: true,
      message: 'Customer updated successfully',
    };
  }
}
