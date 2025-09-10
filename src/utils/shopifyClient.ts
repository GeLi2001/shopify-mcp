/**
 * Shopify GraphQL Client with Retry Logic
 * Provides robust GraphQL client with automatic retry and error handling
 * Following enterprise patterns from servicenow-mcp
 */

import { GraphQLClient, ClientError } from 'graphql-request';
import { ShopifyGraphQLClient, GraphQLError } from '../types/types.js';
import { configManager } from '../config/config.js';
import { logger } from './logger.js';

export class ShopifyClient implements ShopifyGraphQLClient {
  private client: GraphQLClient;
  private retryAttempts: number;
  private timeout: number;

  constructor() {
    this.retryAttempts = configManager.get('RETRY_ATTEMPTS');
    this.timeout = configManager.get('TIMEOUT');

    const endpoint = configManager.getShopifyGraphQLEndpoint();
    const headers = configManager.getShopifyHeaders();
    const sslVerify = configManager.get('SSL_VERIFY');

    // Set Node.js environment variable for SSL verification
    if (!sslVerify) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    this.client = new GraphQLClient(endpoint, {
      headers,
      timeout: this.timeout,
    });

    logger.info('GraphQL client initialized', {
      endpoint: this.maskEndpoint(endpoint),
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      sslValidation: sslVerify ? 'strict' : 'relaxed',
    });
  }

  async query<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    const startTime = Date.now();
    logger.logGraphQLQuery(query, variables);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this.client.request<T>(query, variables);
        const duration = Date.now() - startTime;
        
        logger.logGraphQLResponse(true, result, undefined, duration);
        return result;

      } catch (error) {
        lastError = error as Error;
        const duration = Date.now() - startTime;

        if (error instanceof ClientError) {
          logger.logGraphQLResponse(false, undefined, error.response.errors, duration);
          
          // Don't retry on client errors (4xx)
          if (error.response.status >= 400 && error.response.status < 500) {
            throw new GraphQLError(
              `GraphQL client error: ${error.message}`,
              {
                query: this.truncateQuery(query),
                variables: this.getVariableKeys(variables),
                status: error.response.status,
                errors: error.response.errors,
              }
            );
          }
        }

        if (attempt < this.retryAttempts) {
          const delay = this.calculateRetryDelay(attempt);
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.warn(`GraphQL request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${this.retryAttempts})`, {
            error: errorMessage,
            attempt: attempt + 1,
            delay,
          });
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    const duration = Date.now() - startTime;
    logger.logGraphQLResponse(false, undefined, undefined, duration);
    
    throw new GraphQLError(
      `GraphQL request failed after ${this.retryAttempts} retries: ${lastError?.message}`,
      {
        query: this.truncateQuery(query),
        variables: this.getVariableKeys(variables),
        lastError: lastError?.message,
        attempts: this.retryAttempts + 1,
      }
    );
  }

  async mutate<T = any>(mutation: string, variables?: Record<string, any>): Promise<T> {
    // Mutations should not be retried automatically to avoid duplicate operations
    const startTime = Date.now();
    logger.logGraphQLQuery(mutation, variables, 'mutation');

    try {
      const result = await this.client.request<T>(mutation, variables);
      const duration = Date.now() - startTime;
      
      logger.logGraphQLResponse(true, result, undefined, duration);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof ClientError) {
        logger.logGraphQLResponse(false, undefined, error.response.errors, duration);
        
        throw new GraphQLError(
          `GraphQL mutation error: ${error.message}`,
          {
            mutation: this.truncateQuery(mutation),
            variables: this.getVariableKeys(variables),
            status: error.response.status,
            errors: error.response.errors,
          }
        );
      }

      logger.logGraphQLResponse(false, undefined, undefined, duration);
      throw new GraphQLError(
        `GraphQL mutation failed: ${(error as Error).message}`,
        {
          mutation: this.truncateQuery(mutation),
          variables: this.getVariableKeys(variables),
          error: (error as Error).message,
        }
      );
    }
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      const query = `
        query {
          shop {
            id
            name
          }
        }
      `;
      
      await this.query(query);
      logger.debug('Shopify connection health check passed');
      return true;
    } catch (error) {
      logger.error('Shopify connection health check failed', {
        error: (error as Error).message,
      });
      return false;
    }
  }

  // Get shop information
  async getShopInfo(): Promise<any> {
    const query = `
      query {
        shop {
          id
          name
          email
          domain
          currency
          timezone
          plan {
            displayName
          }
        }
      }
    `;
    
    return this.query(query);
  }

  // Private helper methods
  private calculateRetryDelay(attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private maskEndpoint(endpoint: string): string {
    // Mask sensitive parts of the endpoint
    return endpoint.replace(/\/\/([^\/]+)/, '//***.$1');
  }

  private truncateQuery(query: string): string {
    return query.length > 200 ? query.substring(0, 200) + '...' : query;
  }

  private getVariableKeys(variables?: Record<string, any>): string[] {
    if (!variables) return [];
    return Object.keys(variables);
  }
}

// Export singleton instance
export const shopifyClient = new ShopifyClient();
