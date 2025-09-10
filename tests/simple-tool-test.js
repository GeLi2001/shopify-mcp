#!/usr/bin/env node

/**
 * Simple Tool Test - Test all available Shopify MCP tools
 * Usage: node tests/simple-tool-test.js
 * 
 * Prerequisites:
 * 1. Run 'npm run build' first
 * 2. Set up your .env file with Shopify credentials
 */

// ES module imports
import { configManager } from '../dist/config/config.js';
import { logger } from '../dist/utils/logger.js';
import { shopifyClient } from '../dist/utils/shopifyClient.js';
import { toolPackageManager } from '../dist/utils/toolPackageManager.js';

// Import all tool classes
import { GetProductsTool } from '../dist/tools/getProducts.js';
import { GetProductByIdTool } from '../dist/tools/getProductById.js';
import { GetCustomersTool } from '../dist/tools/getCustomers.js';
import { GetCustomerOrdersTool } from '../dist/tools/getCustomerOrders.js';
import { GetOrdersTool } from '../dist/tools/getOrders.js';
import { GetOrderByIdTool } from '../dist/tools/getOrderById.js';
import { CreateProductTool } from '../dist/tools/createProduct.js';
import { UpdateCustomerTool } from '../dist/tools/updateCustomer.js';

class SimpleToolTester {
  constructor() {
    this.toolContext = null;
    this.tools = new Map();
    this.testResults = [];
  }

  async initialize() {
    try {
      console.log('🔧 Initializing test environment...');
      
      // Validate configuration
      configManager.validateConfiguration();
      
      // Setup tool context
      this.toolContext = {
        config: configManager.getConfig(),
        logger,
        shopifyClient,
      };

      // Test Shopify connection
      console.log('🔗 Testing Shopify connection...');
      const healthCheck = await shopifyClient.healthCheck();
      if (!healthCheck) {
        throw new Error('Failed to connect to Shopify GraphQL API');
      }
      console.log('✅ Shopify connection successful');

      // Initialize tools
      this.initializeTools();
      
      console.log(`✅ Initialized ${this.tools.size} tools successfully\n`);
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  initializeTools() {
    const toolClasses = {
      'get-products': GetProductsTool,
      'get-product-by-id': GetProductByIdTool,
      'get-customers': GetCustomersTool,
      'get-customer-orders': GetCustomerOrdersTool,
      'get-orders': GetOrdersTool,
      'get-order-by-id': GetOrderByIdTool,
      'create-product': CreateProductTool,
      'update-customer': UpdateCustomerTool,
    };

    for (const [toolName, ToolClass] of Object.entries(toolClasses)) {
      try {
        const toolInstance = new ToolClass(this.toolContext);
        this.tools.set(toolName, toolInstance);
        console.log(`✅ Initialized tool: ${toolName}`);
      } catch (error) {
        console.error(`❌ Failed to initialize tool ${toolName}:`, error.message);
      }
    }
  }

  async runBasicTests() {
    console.log('🧪 Running basic tool tests...\n');

    // Test 1: Get Products (basic test)
    await this.testTool('get-products', 'Get Products List', {
      limit: 5
    });

    // Test 2: Get Customers (basic test)
    await this.testTool('get-customers', 'Get Customers List', {
      limit: 5
    });

    // Test 3: Get Orders (basic test)
    await this.testTool('get-orders', 'Get Orders List', {
      limit: 5
    });

    // Test 4: Get Product by ID (requires product ID from first test)
    if (this.testResults.length > 0 && this.testResults[0].success && this.testResults[0].data?.products?.length > 0) {
      const productId = this.testResults[0].data.products[0].id.replace('gid://shopify/Product/', '');
      await this.testTool('get-product-by-id', 'Get Product by ID', {
        id: productId
      });
    }

    // Test 5: Get Order by ID (requires order ID from orders test)
    const ordersTestResult = this.testResults.find(r => r.toolName === 'get-orders');
    if (ordersTestResult?.success && ordersTestResult.data?.orders?.length > 0) {
      const orderId = ordersTestResult.data.orders[0].id.replace('gid://shopify/Order/', '');
      await this.testTool('get-order-by-id', 'Get Order by ID', {
        orderId: orderId
      });
    }

    // Test 6: Get Customer Orders (requires customer ID from customers test)
    const customersTestResult = this.testResults.find(r => r.toolName === 'get-customers');
    if (customersTestResult?.success && customersTestResult.data?.customers?.length > 0) {
      const customerId = customersTestResult.data.customers[0].id.replace('gid://shopify/Customer/', '');
      await this.testTool('get-customer-orders', 'Get Customer Orders', {
        customerId: customerId
      });
    }
  }

  async testTool(toolName, testName, args) {
    console.log(`📋 Testing: ${testName}`);
    console.log(`🔧 Tool: ${toolName}`);
    console.log(`📥 Args: ${JSON.stringify(args, null, 2)}`);

    try {
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      const startTime = Date.now();
      const result = await tool.execute(args);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ ${testName} - SUCCESS (${duration}ms)`);
        console.log(`📊 Result: ${this.summarizeResult(result.data)}\n`);
        
        this.testResults.push({
          toolName,
          testName,
          success: true,
          duration,
          data: result.data
        });
      } else {
        console.log(`❌ ${testName} - FAILED: ${result.error}`);
        console.log(`📊 Metadata: ${JSON.stringify(result.metadata, null, 2)}\n`);
        
        this.testResults.push({
          toolName,
          testName,
          success: false,
          error: result.error,
          metadata: result.metadata
        });
      }
    } catch (error) {
      console.log(`❌ ${testName} - ERROR: ${error.message}\n`);
      
      this.testResults.push({
        toolName,
        testName,
        success: false,
        error: error.message
      });
    }
  }

  summarizeResult(data) {
    if (!data) return 'No data';
    
    if (data.products) return `Found ${data.products.length} products`;
    if (data.product) return `Product: ${data.product.title}`;
    if (data.customers) return `Found ${data.customers.length} customers`;
    if (data.customer) return `Customer: ${data.customer.firstName} ${data.customer.lastName}`;
    if (data.orders) return `Found ${data.orders.length} orders`;
    if (data.order) return `Order: ${data.order.name}`;
    
    return 'Data retrieved successfully';
  }

  printSummary() {
    console.log('\n📋 TEST SUMMARY');
    console.log('================');
    
    const successfulTests = this.testResults.filter(r => r.success);
    const failedTests = this.testResults.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successfulTests.length}`);
    console.log(`❌ Failed tests: ${failedTests.length}`);
    console.log(`📊 Total tests: ${this.testResults.length}\n`);
    
    if (failedTests.length > 0) {
      console.log('❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.error}`);
      });
      console.log('');
    }
    
    if (successfulTests.length > 0) {
      console.log('✅ Successful Tests:');
      successfulTests.forEach(test => {
        console.log(`  - ${test.testName} (${test.duration}ms)`);
      });
      console.log('');
    }
    
    const successRate = (successfulTests.length / this.testResults.length * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);
  }
}

// Main execution
async function main() {
  const tester = new SimpleToolTester();
  
  try {
    await tester.initialize();
    await tester.runBasicTests();
    tester.printSummary();
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the test
main();
