/**
 * Centralized Configuration Manager for Shopify MCP Server
 * Provides environment variable validation and command-line argument override support
 * Following enterprise architecture patterns from servicenow-mcp
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import minimist from 'minimist';
import { Config, ConfigSchema, ConfigurationError } from '../types/types.js';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: Config;

  private constructor() {
    // Load environment variables from .env file
    dotenv.config();

    // Parse command line arguments
    const argv = minimist(process.argv.slice(2));

    // Build configuration from environment variables and command line arguments
    const rawConfig = {
      SHOPIFY_ACCESS_TOKEN: argv.accessToken || argv.token || process.env.SHOPIFY_ACCESS_TOKEN,
      MYSHOPIFY_DOMAIN: argv.domain || process.env.MYSHOPIFY_DOMAIN,
      DEBUG_MODE: this.parseBoolean(argv.debug || process.env.DEBUG_MODE, false),
      LOG_LEVEL: (argv.logLevel || process.env.LOG_LEVEL || 'INFO').toUpperCase(),
      MCP_TOOL_PACKAGE: argv.toolPackage || process.env.MCP_TOOL_PACKAGE || 'full',
      TIMEOUT: this.parseNumber(argv.timeout || process.env.TIMEOUT, 30000),
      RETRY_ATTEMPTS: this.parseNumber(argv.retryAttempts || process.env.RETRY_ATTEMPTS, 3),
      SSL_VERIFY: this.parseBoolean(argv.sslVerify || process.env.SSL_VERIFY, true),
    };

    try {
      this.config = ConfigSchema.parse(rawConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues.map(issue => 
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        throw new ConfigurationError(`Configuration validation failed: ${issues}`);
      }
      throw new ConfigurationError(`Unexpected configuration error: ${error}`);
    }
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public getConfig(): Config {
    return { ...this.config };
  }

  public get<K extends keyof Config>(key: K): Config[K] {
    return this.config[key];
  }

  public isDebugMode(): boolean {
    return this.config.DEBUG_MODE;
  }

  public getShopifyGraphQLEndpoint(): string {
    const domain = this.config.MYSHOPIFY_DOMAIN;
    // Handle both full URLs and just domain names
    if (domain.startsWith('http')) {
      return `${domain}/admin/api/2023-10/graphql.json`;
    }
    return `https://${domain}/admin/api/2023-10/graphql.json`;
  }

  public getShopifyHeaders(): Record<string, string> {
    return {
      'X-Shopify-Access-Token': this.config.SHOPIFY_ACCESS_TOKEN,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  public validateConfiguration(): void {
    // Additional runtime validation
    if (!this.config.SHOPIFY_ACCESS_TOKEN.startsWith('shpat_')) {
      throw new ConfigurationError(
        'Invalid Shopify access token format. Token should start with "shpat_"'
      );
    }

    const domain = this.config.MYSHOPIFY_DOMAIN;
    if (!domain.includes('myshopify.com') && !domain.includes('localhost')) {
      throw new ConfigurationError(
        'Invalid Shopify domain. Domain should contain "myshopify.com" or be localhost for development'
      );
    }
  }

  public printConfiguration(): void {
    console.log('🔧 Shopify MCP Server Configuration:');
    console.log(`   📦 Tool Package: ${this.config.MCP_TOOL_PACKAGE}`);
    console.log(`   🔍 Log Level: ${this.config.LOG_LEVEL}`);
    console.log(`   🐛 Debug Mode: ${this.config.DEBUG_MODE}`);
    console.log(`   ⏱️  Timeout: ${this.config.TIMEOUT}ms`);
    console.log(`   🔄 Retry Attempts: ${this.config.RETRY_ATTEMPTS}`);
    console.log(`   🏪 Shop Domain: ${this.maskSensitiveValue(this.config.MYSHOPIFY_DOMAIN)}`);
    console.log(`   🔑 Access Token: ${this.maskSensitiveValue(this.config.SHOPIFY_ACCESS_TOKEN)}`);
  }

  private parseBoolean(value: any, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }
    return defaultValue;
  }

  private parseNumber(value: any, defaultValue: number): number {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private maskSensitiveValue(value: string): string {
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();
