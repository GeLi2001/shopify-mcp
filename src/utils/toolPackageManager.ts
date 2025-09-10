/**
 * Tool Package Management System for Shopify MCP Server
 * Manages different tool packages for various use cases
 * Following enterprise patterns from servicenow-mcp
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { ToolPackage, ToolPackageDefinition, ConfigurationError } from '../types/types.js';
import { configManager } from '../config/config.js';
import { logger } from './logger.js';

export class ToolPackageManager {
  private static instance: ToolPackageManager;
  private toolPackages: ToolPackageDefinition;
  private activePackage: ToolPackage;

  private constructor() {
    this.activePackage = configManager.get('MCP_TOOL_PACKAGE');
    this.toolPackages = this.loadToolPackages();
    this.validatePackage();
  }

  public static getInstance(): ToolPackageManager {
    if (!ToolPackageManager.instance) {
      ToolPackageManager.instance = new ToolPackageManager();
    }
    return ToolPackageManager.instance;
  }

  public getActivePackage(): ToolPackage {
    return this.activePackage;
  }

  public getActiveTools(): string[] {
    if (this.activePackage === 'none') {
      return [];
    }

    const packageConfig = this.toolPackages[this.activePackage];
    if (!packageConfig) {
      throw new ConfigurationError(`Unknown tool package: ${this.activePackage}`);
    }

    return packageConfig.tools;
  }

  public getAllPackages(): ToolPackageDefinition {
    return { ...this.toolPackages };
  }

  public getPackageInfo(packageName: ToolPackage): any {
    return this.toolPackages[packageName];
  }

  public isToolEnabled(toolName: string): boolean {
    const activeTools = this.getActiveTools();
    return activeTools.includes(toolName);
  }

  public printPackageInfo(): void {
    const packageConfig = this.toolPackages[this.activePackage];
    
    logger.info(`📦 Active Tool Package: ${this.activePackage}`, {
      description: packageConfig?.description,
      toolCount: packageConfig?.tools.length || 0,
      tools: packageConfig?.tools || [],
    });
  }

  private loadToolPackages(): ToolPackageDefinition {
    try {
      // Try to load from config/tool_packages.json (fallback to yaml if available)
      const configPath = join(process.cwd(), 'config', 'tool_packages.json');
      try {
        const jsonContent = readFileSync(configPath, 'utf8');
        const packages = JSON.parse(jsonContent) as ToolPackageDefinition;
        logger.debug('Loaded tool packages from config file', { configPath });
        return packages;
      } catch (fileError) {
        logger.debug('Config file not found, using default tool packages', { configPath });
        return this.getDefaultToolPackages();
      }
    } catch (error) {
      logger.warn('Failed to load tool packages, using defaults', {
        error: error instanceof Error ? error.message : String(error),
      });
      return this.getDefaultToolPackages();
    }
  }

  private getDefaultToolPackages(): ToolPackageDefinition {
    return {
      none: {
        name: 'None',
        description: 'No tools loaded',
        tools: [],
      },
      basic: {
        name: 'Basic',
        description: 'Essential read-only tools for basic store information',
        tools: [
          'get-products',
          'get-product-by-id',
          'get-customers',
          'get-orders',
          'get-order-by-id',
        ],
      },
      full: {
        name: 'Full',
        description: 'All available tools for complete store management',
        tools: [
          'get-products',
          'get-product-by-id',
          'get-customers',
          'get-customer-orders',
          'get-orders',
          'get-order-by-id',
          'create-product',
          'update-customer'
        ],
      },
      product_management: {
        name: 'Product Management',
        description: 'Tools focused on product operations',
        tools: [
          'get-products',
          'get-product-by-id',
          'create-product',
        ],
      },
      customer_service: {
        name: 'Customer Service',
        description: 'Tools for customer and order management',
        tools: [
          'get-customers',
          'get-customer-orders',
          'get-orders',
          'get-order-by-id',
          'update-customer'
        ],
      },
      order_management: {
        name: 'Order Management',
        description: 'Tools specifically for order operations',
        tools: [
          'get-orders',
          'get-order-by-id'
        ],
      },
    };
  }

  private validatePackage(): void {
    if (!this.toolPackages[this.activePackage]) {
      const availablePackages = Object.keys(this.toolPackages).join(', ');
      throw new ConfigurationError(
        `Invalid tool package '${this.activePackage}'. Available packages: ${availablePackages}`
      );
    }

    logger.info(`✅ Tool package '${this.activePackage}' validated successfully`);
  }
}

// Export singleton instance
export const toolPackageManager = ToolPackageManager.getInstance();
