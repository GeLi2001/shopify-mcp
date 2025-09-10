/**
 * Comprehensive Logging System for Shopify MCP Server
 * Provides configurable log levels with detailed debug mode
 * Following enterprise logging patterns from servicenow-mcp
 */

import { Logger, LogLevel } from '../types/types.js';
import { configManager } from '../config/config.js';

export class MCPLogger implements Logger {
  private debugMode: boolean;
  private logLevel: LogLevel;

  constructor() {
    this.debugMode = configManager.isDebugMode();
    this.logLevel = configManager.get('LOG_LEVEL');
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('DEBUG')) {
      this.log('DEBUG', message, this.sanitizeMeta(meta));
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('INFO')) {
      this.log('INFO', message, this.sanitizeMeta(meta));
    }
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('WARNING')) {
      this.log('WARNING', message, this.sanitizeMeta(meta));
    }
  }

  error(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('ERROR')) {
      this.log('ERROR', message, this.sanitizeMeta(meta));
    }
  }

  critical(message: string, meta?: Record<string, any>): void {
    if (this.shouldLog('CRITICAL')) {
      this.log('CRITICAL', message, this.sanitizeMeta(meta));
    }
  }

  // Tool execution logging
  logToolExecution(toolName: string, args: any, success: boolean, duration: number, result?: any): void {
    const baseMessage = `Tool '${toolName}' executed`;
    const meta = {
      tool: toolName,
      success,
      duration_ms: duration,
      args: this.debugMode ? args : this.getArgKeys(args),
      ...(success ? {} : { error: result?.error }),
      ...(this.debugMode && result ? { result: this.truncateResult(result) } : {})
    };

    if (success) {
      this.info(`${baseMessage} successfully`, meta);
    } else {
      this.error(`${baseMessage} with error`, meta);
    }
  }

  // GraphQL logging
  logGraphQLQuery(query: string, variables?: Record<string, any>, operationName?: string): void {
    if (!this.shouldLog('DEBUG')) return;

    const meta = {
      operationName,
      query: this.debugMode ? query : this.truncateQuery(query),
      variables: this.debugMode ? variables : this.getVariableKeys(variables),
    };

    this.debug('Executing GraphQL query', meta);
  }

  logGraphQLResponse(success: boolean, data?: any, errors?: any[], duration?: number): void {
    if (!this.shouldLog('DEBUG')) return;

    const meta = {
      success,
      duration_ms: duration,
      ...(errors ? { errors } : {}),
      ...(this.debugMode && data ? { data: this.truncateResult(data) } : {}),
    };

    if (success) {
      this.debug('GraphQL query completed successfully', meta);
    } else {
      this.debug('GraphQL query failed', meta);
    }
  }

  // Server lifecycle logging
  logServerStart(port?: number): void {
    this.info('🚀 Shopify MCP Server starting', { port });
  }

  logServerReady(): void {
    this.info('✅ Shopify MCP Server ready');
  }

  logServerError(error: Error): void {
    this.critical('❌ Server error occurred', {
      error: error.message,
      stack: this.debugMode ? error.stack : undefined,
    });
  }

  logServerShutdown(): void {
    this.info('🛑 Shopify MCP Server shutting down');
  }

  // Private helper methods
  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const metaStr = meta && Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
    const levelColor = this.getLevelColor(level);
    const resetColor = '\x1b[0m';
    
    console.log(`${timestamp} ${levelColor}[${level}]${resetColor} ${message}${metaStr}`);
  }

  private getLevelColor(level: LogLevel): string {
    const colors: Record<LogLevel, string> = {
      DEBUG: '\x1b[36m',    // Cyan
      INFO: '\x1b[32m',     // Green
      WARNING: '\x1b[33m',  // Yellow
      ERROR: '\x1b[31m',    // Red
      CRITICAL: '\x1b[35m', // Magenta
    };
    return colors[level];
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 1,
      WARNING: 2,
      ERROR: 3,
      CRITICAL: 4,
    };

    return levels[level] >= levels[this.logLevel];
  }

  private sanitizeMeta(meta?: Record<string, any>): Record<string, any> | undefined {
    if (!meta) return undefined;

    const sanitized = { ...meta };

    // Remove or mask sensitive data
    for (const key of Object.keys(sanitized)) {
      if (this.isSensitiveKey(key)) {
        sanitized[key] = this.maskSensitiveValue(sanitized[key]);
      }
    }

    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'token', 'password', 'secret', 'key', 'auth', 'authorization',
      'accessToken', 'refreshToken', 'apiKey', 'credential'
    ];
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive.toLowerCase())
    );
  }

  private maskSensitiveValue(value: any): string {
    if (typeof value !== 'string') return '[MASKED]';
    if (value.length <= 8) return '*'.repeat(value.length);
    return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
  }

  private truncateQuery(query: string): string {
    return query.length > 200 ? query.substring(0, 200) + '...' : query;
  }

  private truncateResult(result: any): any {
    const str = JSON.stringify(result);
    return str.length > 1000 ? JSON.parse(str.substring(0, 1000) + '"}') : result;
  }

  private getArgKeys(args: any): string[] {
    if (!args || typeof args !== 'object') return [];
    return Object.keys(args);
  }

  private getVariableKeys(variables?: Record<string, any>): string[] {
    if (!variables) return [];
    return Object.keys(variables);
  }
}

// Export singleton instance
export const logger = new MCPLogger();
