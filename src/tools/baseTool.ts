/**
 * Base Tool Class for Shopify MCP Server
 * Provides common functionality and structure for all tools
 * Following enterprise patterns from servicenow-mcp
 */

import { ToolContext, ToolResult, ShopifyMCPError, ToolExecutionError } from '../types/types.js';
import { logger } from '../utils/logger.js';

export abstract class BaseTool {
  protected context: ToolContext;

  constructor(context: ToolContext) {
    this.context = context;
  }

  // Abstract methods that each tool must implement
  abstract get name(): string;
  abstract get description(): string;
  abstract get inputSchema(): any;
  
  protected abstract executeImpl(args: any): Promise<any>;

  // Main execution method with common error handling and logging
  async execute(args: any): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Validate arguments
      this.validateArgs(args);
      
      // Execute the tool implementation
      const data = await this.executeImpl(args);
      
      const duration = Date.now() - startTime;
      this.context.logger.logToolExecution(this.name, args, true, duration, data);
      
      return {
        success: true,
        data,
        metadata: {
          duration_ms: duration,
          timestamp: new Date().toISOString(),
        },
      };
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.context.logger.logToolExecution(this.name, args, false, duration, { error: errorMessage });
      
      if (error instanceof ShopifyMCPError) {
        return {
          success: false,
          error: error.message,
          metadata: {
            duration_ms: duration,
            timestamp: new Date().toISOString(),
            errorCode: error.code,
            errorDetails: error.details,
          },
        };
      }
      
      return {
        success: false,
        error: `Tool execution failed: ${errorMessage}`,
        metadata: {
          duration_ms: duration,
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  // Input validation using the tool's schema
  protected validateArgs(args: any): void {
    try {
      // If the tool has a schema, validate against it
      if (this.inputSchema && this.inputSchema.parse) {
        this.inputSchema.parse(args);
      }
    } catch (error) {
      throw new ToolExecutionError(
        `Invalid arguments for tool '${this.name}': ${error instanceof Error ? error.message : String(error)}`,
        { args, schema: this.inputSchema }
      );
    }
  }

  // Helper method for pagination
  protected buildPaginationArgs(limit?: number, cursor?: string): { first?: number; after?: string } {
    const args: { first?: number; after?: string } = {};
    
    if (limit) {
      args.first = Math.min(limit, 250); // Shopify's max limit
    }
    
    if (cursor) {
      args.after = cursor;
    }
    
    return args;
  }

  // Helper method to extract edges from GraphQL response
  protected extractEdges<T>(response: any, path: string): T[] {
    const pathParts = path.split('.');
    let current = response;
    
    for (const part of pathParts) {
      if (!current || !current[part]) {
        logger.warn(`Path '${path}' not found in response`, { response });
        return [];
      }
      current = current[part];
    }
    
    if (!current.edges || !Array.isArray(current.edges)) {
      logger.warn(`No edges found at path '${path}'`, { current });
      return [];
    }
    
    return current.edges.map((edge: any) => edge.node);
  }

  // Helper method to extract page info from GraphQL response
  protected extractPageInfo(response: any, path: string): any {
    const pathParts = path.split('.');
    let current = response;
    
    for (const part of pathParts) {
      if (!current || !current[part]) {
        return null;
      }
      current = current[part];
    }
    
    return current.pageInfo || null;
  }

  // Helper method to format GraphQL errors
  protected formatGraphQLErrors(errors: any[]): string {
    if (!errors || !Array.isArray(errors)) {
      return 'Unknown GraphQL error';
    }
    
    return errors.map(error => error.message || String(error)).join('; ');
  }

  // Helper method to validate Shopify ID format
  protected validateShopifyId(id: string, type: string): void {
    if (!id) {
      throw new ToolExecutionError(`${type} ID is required`);
    }
    
    // Shopify IDs are typically in the format gid://shopify/Type/123456
    if (!id.startsWith('gid://shopify/') && !id.match(/^\d+$/)) {
      throw new ToolExecutionError(`Invalid ${type} ID format: ${id}`);
    }
  }

  // Helper method to convert legacy ID to GraphQL ID
  protected toGraphQLId(id: string, type: string): string {
    if (id.startsWith('gid://shopify/')) {
      return id; // Already a GraphQL ID
    }
    
    return `gid://shopify/${type}/${id}`;
  }

  // Helper method to extract numeric ID from GraphQL ID
  protected extractNumericId(graphqlId: string): string {
    if (graphqlId.startsWith('gid://shopify/')) {
      const parts = graphqlId.split('/');
      return parts[parts.length - 1];
    }
    return graphqlId;
  }

  // Helper method to safely get nested properties
  protected getNestedProperty(obj: any, path: string, defaultValue: any = null): any {
    const pathParts = path.split('.');
    let current = obj;
    
    for (const part of pathParts) {
      if (current === null || current === undefined || !current.hasOwnProperty(part)) {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current;
  }
}
