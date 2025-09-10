# Tests

Simple test suite for Shopify MCP Server tools.

## How to Use

1. **Build the project first:**
   ```bash
   npm run build
   ```

2. **Run the simple test:**
   ```bash
   node tests/simple-tool-test.js
   ```

## What the test does

The `simple-tool-test.js` file:
- Tests all available Shopify MCP tools
- Uses the compiled JavaScript files from the `dist` folder
- Provides a simple pass/fail report
- Shows tool execution times
- Summarizes results from each tool

## Test Requirements

- Your Shopify store credentials must be configured (`.env` file or environment variables)
- The project must be built (`npm run build`) before running tests
- Your Shopify store should have some sample data (products, customers, orders)

## Sample Output

```
🔧 Initializing test environment...
🔗 Testing Shopify connection...
✅ Shopify connection successful
✅ Initialized tool: get-products
✅ Initialized tool: get-customers
...

🧪 Running basic tool tests...

📋 Testing: Get Products List
🔧 Tool: get-products
✅ Get Products List - SUCCESS (234ms)
📊 Result: Found 5 products

...

📋 TEST SUMMARY
================
✅ Successful tests: 8
❌ Failed tests: 0
📊 Total tests: 8
🎯 Success Rate: 100.0%
```

## Adding New Tests

To test new tools, simply add them to the `toolClasses` object in `simple-tool-test.js`.
