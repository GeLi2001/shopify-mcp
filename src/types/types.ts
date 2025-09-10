/**
 * Unified type definitions for Shopify MCP Server
 * Following servicenow-mcp methodology for enterprise architecture
 */

import { z } from 'zod';

// Environment configuration schema
export const ConfigSchema = z.object({
  SHOPIFY_ACCESS_TOKEN: z.string().min(1, 'Shopify access token is required'),
  MYSHOPIFY_DOMAIN: z.string().min(1, 'Shopify domain is required'),
  DEBUG_MODE: z.boolean().default(false),
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('INFO'),
  MCP_TOOL_PACKAGE: z.enum(['none', 'basic', 'full', 'product_management', 'customer_service', 'order_management']).default('full'),
  TIMEOUT: z.number().positive().default(30000),
  RETRY_ATTEMPTS: z.number().min(0).default(3),
  SSL_VERIFY: z.boolean().default(true), // SSL certificate verification
});

export type Config = z.infer<typeof ConfigSchema>;

// Log levels
export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

// Tool package types
export type ToolPackage = 'none' | 'basic' | 'full' | 'product_management' | 'customer_service' | 'order_management';

// Shopify GraphQL types
export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  compareAtPrice?: string;
  sku?: string;
  inventoryQuantity: number;
  weight: number;
  weightUnit: string;
  requiresShipping: boolean;
  taxable: boolean;
  inventoryManagement?: string;
}

export interface ShopifyImage {
  id: string;
  url: string;
  altText?: string;
  width: number;
  height: number;
}

export interface ShopifyCustomer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
  verifiedEmail: boolean;
  state: string;
  tags: string[];
  defaultAddress?: ShopifyAddress;
  addresses: {
    edges: Array<{
      node: ShopifyAddress;
    }>;
  };
  orders: {
    edges: Array<{
      node: ShopifyOrder;
    }>;
  };
}

export interface ShopifyAddress {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  country: string;
  zip: string;
  phone?: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  cancelledAt?: string;
  closedAt?: string;
  financialStatus: string;
  fulfillmentStatus?: string;
  totalPrice: string;
  subtotalPrice: string;
  totalTax: string;
  totalShipping: string;
  currency: string;
  customer?: ShopifyCustomer;
  shippingAddress?: ShopifyAddress;
  billingAddress?: ShopifyAddress;
  lineItems: {
    edges: Array<{
      node: ShopifyLineItem;
    }>;
  };
}

export interface ShopifyLineItem {
  id: string;
  title: string;
  quantity: number;
  price: string;
  totalDiscount: string;
  variant?: ShopifyVariant;
  product?: ShopifyProduct;
}

// Tool execution types
export interface ToolContext {
  config: Config;
  logger: Logger;
  shopifyClient: ShopifyGraphQLClient;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

// GraphQL client types
export interface ShopifyGraphQLClient {
  query<T = any>(query: string, variables?: Record<string, any>): Promise<T>;
  mutate<T = any>(mutation: string, variables?: Record<string, any>): Promise<T>;
}

// Logger interface
export interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
  critical(message: string, meta?: Record<string, any>): void;
  logToolExecution(toolName: string, args: any, success: boolean, duration: number, result?: any): void;
  logGraphQLQuery(query: string, variables?: Record<string, any>, operationName?: string): void;
  logGraphQLResponse(success: boolean, data?: any, errors?: any[], duration?: number): void;
  logServerStart(port?: number): void;
  logServerReady(): void;
  logServerError(error: Error): void;
  logServerShutdown(): void;
}

// Tool package configuration
export interface ToolPackageConfig {
  name: string;
  description: string;
  tools: string[];
}

export interface ToolPackageDefinition {
  [key: string]: ToolPackageConfig;
}

// MCP tool schema validation
export const MCPToolInputSchema = z.object({
  name: z.string(),
  arguments: z.record(z.any()).optional(),
});

export type MCPToolInput = z.infer<typeof MCPToolInputSchema>;

// Common GraphQL query options
export interface QueryOptions {
  limit?: number;
  cursor?: string;
  sortKey?: string;
  reverse?: boolean;
  query?: string;
}

// Error types
export class ShopifyMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ShopifyMCPError';
  }
}

export class ConfigurationError extends ShopifyMCPError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', details);
  }
}

export class GraphQLError extends ShopifyMCPError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'GRAPHQL_ERROR', details);
  }
}

export class ToolExecutionError extends ShopifyMCPError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TOOL_EXECUTION_ERROR', details);
  }
}
