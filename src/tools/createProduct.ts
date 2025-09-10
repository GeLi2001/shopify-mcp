/**
 * Create Product Tool - Create a new product in Shopify store
 * Following enterprise patterns from servicenow-mcp
 */

import { z } from 'zod';
import { BaseTool } from './baseTool.js';

// Input validation schema
const CreateProductSchema = z.object({
  title: z.string().min(1, 'Product title is required'),
  descriptionHtml: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional().default('DRAFT'),
});

type CreateProductArgs = z.infer<typeof CreateProductSchema>;

export class CreateProductTool extends BaseTool {
  get name(): string {
    return 'create-product';
  }

  get description(): string {
    return 'Create a new product in the Shopify store';
  }

  get inputSchema() {
    return CreateProductSchema;
  }

  protected async executeImpl(args: CreateProductArgs): Promise<any> {
    const { title, descriptionHtml, vendor, productType, tags, status } = args;

    const mutation = `
      mutation productCreate($input: ProductInput!) {
        productCreate(input: $input) {
          product {
            id
            title
            descriptionHtml
            vendor
            productType
            status
            tags
            handle
            createdAt
            updatedAt
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        title,
        descriptionHtml,
        vendor,
        productType,
        tags,
        status,
      },
    };

    const result = await this.context.shopifyClient.mutate(mutation, variables);
    
    if (result.productCreate.userErrors?.length > 0) {
      const errors = result.productCreate.userErrors
        .map((error: any) => `${error.field}: ${error.message}`)
        .join(', ');
      throw new Error(`Product creation failed: ${errors}`);
    }

    this.context.logger.info('Product created successfully', {
      productId: result.productCreate.product.id,
      title: result.productCreate.product.title,
    });

    return {
      success: true,
      product: result.productCreate.product,
    };
  }
}