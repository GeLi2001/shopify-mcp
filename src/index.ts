#!/usr/bin/env node

/**
 * Shopify MCP Server - Main Entry Point
 * Enterprise-grade Shopify MCP server following servicenow-mcp methodology
 * Provides comprehensive tool package management, logging, and error handling
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Core infrastructure
import { configManager } from './config/config.js';
import { logger } from './utils/logger.js';
import { shopifyClient } from './utils/shopifyClient.js';
import { toolPackageManager } from './utils/toolPackageManager.js';

// Tool implementations
import { GetProductsTool } from './tools/getProducts.js';
import { GetProductByIdTool } from './tools/getProductById.js';
import { GetCustomersTool } from './tools/getCustomers.js';
import { GetCustomerOrdersTool } from './tools/getCustomerOrders.js';
import { GetOrdersTool } from './tools/getOrders.js';
import { GetOrderByIdTool } from './tools/getOrderById.js';
import { CreateProductTool } from './tools/createProduct.js';
import { UpdateCustomerTool } from './tools/updateCustomer.js';

// Types
import { ToolContext, ToolExecutionError } from './types/types.js';

class ShopifyMCPServer {
  private server: McpServer;
  private toolContext: ToolContext;
  private registeredTools: Map<string, any>;

  constructor() {
    this.server = new McpServer({
      name: "shopify-mcp",
      version: "2.0.0",
    });
    
    this.registeredTools = new Map();
    
    this.toolContext = {
      config: configManager.getConfig(),
      logger,
      shopifyClient,
    };
  }

  async initialize(): Promise<void> {
    try {
      logger.logServerStart();

      // Validate configuration
      configManager.validateConfiguration();
      configManager.printConfiguration();

      // Test Shopify connection
      const healthCheck = await shopifyClient.healthCheck();
      if (!healthCheck) {
        throw new Error('Failed to connect to Shopify GraphQL API');
      }

      // Register tools based on active package
      await this.registerTools();

      logger.logServerReady();
    } catch (error) {
      logger.logServerError(error as Error);
      throw error;
    }
  }

  private async registerTools(): Promise<void> {
    const activeTools = toolPackageManager.getActiveTools();
    
    logger.info(`Registering ${activeTools.length} tools from package '${toolPackageManager.getActivePackage()}'`);

    // Map of tool names to their implementations
    const toolImplementations = {
      'get-products': GetProductsTool,
      'get-product-by-id': GetProductByIdTool,
      'get-customers': GetCustomersTool,
      'get-customer-orders': GetCustomerOrdersTool,
      'get-orders': GetOrdersTool,
      'get-order-by-id': GetOrderByIdTool,
      'create-product': CreateProductTool,
      'update-customer': UpdateCustomerTool,
    };

    for (const toolName of activeTools) {
      const ToolClass = toolImplementations[toolName as keyof typeof toolImplementations];
      
      if (ToolClass) {
        const toolInstance = new ToolClass(this.toolContext);
        this.registeredTools.set(toolName, toolInstance);
        this.registerMCPTool(toolInstance);
        logger.debug(`Registered tool: ${toolName}`);
      } else {
        logger.warn(`Tool implementation not found for: ${toolName}`);
      }
    }

    toolPackageManager.printPackageInfo();
  }

  private registerMCPTool(toolInstance: any): void {
    this.server.tool(
      toolInstance.name,
      toolInstance.description,
      {
        type: "object",
        properties: toolInstance.inputSchema.shape || {},
        required: Object.keys(toolInstance.inputSchema.shape || {}),
      },
      async ({ arguments: args }: any) => {
        const result = await toolInstance.execute(args || {});

        if (!result.success) {
          throw new ToolExecutionError(result.error || 'Tool execution failed', result.metadata);
        }

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.data, null, 2),
            },
          ],
        };
      }
    );
  }

  async start(): Promise<void> {
    try {
      await this.initialize();

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      logger.info("🚀 Shopify MCP Server is running and ready to serve requests");
    } catch (error) {
      logger.logServerError(error as Error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    logger.logServerShutdown();
    process.exit(0);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.critical('Unhandled Rejection at:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.critical('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Start the server
const server = new ShopifyMCPServer();
server.start().catch(error => {
  logger.critical('Failed to start server:', { error: error.message });
  process.exit(1);
});


