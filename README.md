# Shopify MCP Server

(please leave a star if you like!)
[![smithery badge](https://smithery.ai/badge/@GeLi2001/shopify-mcp)](https://smithery.ai/server/@GeLi2001/shopify-mcp)

MCP Server for Shopify API, enabling interaction with store data through GraphQL API. This server provides tools for managing products, customers, orders, and more.

**📦 Package Name: `shopify-mcp`**  
**🚀 Command: `shopify-mcp` (NOT `shopify-mcp-server`)**

<a href="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp/badge" alt="Shopify MCP server" />
</a>

## Features

- **Product Management**: Search and retrieve product information
- **Customer Management**: Load customer data and manage customer tags
- **Order Management**: Advanced order querying and filtering
- **GraphQL Integration**: Direct integration with Shopify's GraphQL Admin API
- **Comprehensive Error Handling**: Clear error messages for API and authentication issues

## Prerequisites

1. Node.js (version 16 or higher)
2. Shopify Custom App Access Token (see setup instructions below)

## Setup

### Installing via Smithery

To install Shopify MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@GeLi2001/shopify-mcp):

```bash
npx -y @smithery/cli install @GeLi2001/shopify-mcp --client claude
```

### Shopify Access Token

To use this MCP server, you'll need to create a custom app in your Shopify store:

1. From your Shopify admin, go to **Settings** > **Apps and sales channels**
2. Click **Develop apps** (you may need to enable developer preview first)
3. Click **Create an app**
4. Set a name for your app (e.g., "Shopify MCP Server")
5. Click **Configure Admin API scopes**
6. Select the following scopes:
   - `read_products`, `write_products`
   - `read_customers`, `write_customers`
   - `read_orders`, `write_orders`
7. Click **Save**
8. Click **Install app**
9. Click **Install** to give the app access to your store data
10. After installation, you'll see your **Admin API access token**
11. Copy this token - you'll need it for configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": [
        "shopify-mcp",
        "--accessToken",
        "<YOUR_ACCESS_TOKEN>",
        "--domain",
        "<YOUR_SHOP>.myshopify.com"
      ]
    }
  }
}
```

Locations for the Claude Desktop config file:

- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

### Alternative: Run Locally with Environment Variables

If you prefer to use environment variables instead of command-line arguments:

1. Create a `.env` file with your Shopify credentials:

   ```
   SHOPIFY_ACCESS_TOKEN=your_access_token
   MYSHOPIFY_DOMAIN=your-store.myshopify.com
   ```

2. Run the server with npx:
   ```
   npx shopify-mcp
   ```

### Direct Installation (Optional)

If you want to install the package globally:

```
npm install -g shopify-mcp
```

Then run it:

```
shopify-mcp --accessToken=<YOUR_ACCESS_TOKEN> --domain=<YOUR_SHOP>.myshopify.com
```

**⚠️ Important:** If you see errors about "SHOPIFY_ACCESS_TOKEN environment variable is required" when using command-line arguments, you might have a different package installed. Make sure you're using `shopify-mcp`, not `shopify-mcp-server`.

## Available Tools

### Product Management

1. `get-products`

   - Get all products or search by title
   - Inputs:
     - `searchTitle` (optional string): Filter products by title
     - `limit` (number): Maximum number of products to return

2. `get-product-by-id`
   - Get a specific product by ID
   - Inputs:
     - `productId` (string): ID of the product to retrieve

3. `createProduct`
    - Create new product in store 
    - Inputs:
        - `title` (string): Title of the product
        - `descriptionHtml` (string): Description of the product
        - `vendor` (string): Vendor of the product
        - `productType` (string): Type of the product
        - `tags` (string): Tags of the product
        - `status` (string): Status of the product "ACTIVE", "DRAFT", "ARCHIVED". Default "DRAFT"

### Customer Management
1. `get-customers`

   - Get customers or search by name/email
   - Inputs:
     - `searchQuery` (optional string): Filter customers by name or email
     - `limit` (optional number, default: 10): Maximum number of customers to return

2. `update-customer`

   - Update a customer's information
   - Inputs:
     - `id` (string, required): Shopify customer ID (numeric ID only, like "6276879810626")
     - `firstName` (string, optional): Customer's first name
     - `lastName` (string, optional): Customer's last name
     - `email` (string, optional): Customer's email address
     - `phone` (string, optional): Customer's phone number
     - `tags` (array of strings, optional): Tags to apply to the customer
     - `note` (string, optional): Note about the customer
     - `taxExempt` (boolean, optional): Whether the customer is exempt from taxes
     - `metafields` (array of objects, optional): Customer metafields for storing additional data

3. `get-customer-orders`
   - Get orders for a specific customer
   - Inputs:
     - `customerId` (string, required): Shopify customer ID (numeric ID only, like "6276879810626")
     - `limit` (optional number, default: 10): Maximum number of orders to return

### Order Management

1. `get-orders`

   - Get orders with optional filtering
   - Inputs:
     - `status` (optional string): Filter by order status
     - `limit` (optional number, default: 10): Maximum number of orders to return

2. `get-order-by-id`

   - Get a specific order by ID
   - Inputs:
     - `orderId` (string, required): Full Shopify order ID (e.g., "gid://shopify/Order/6090960994370")

3. `update-order`

   - Update an existing order with new information
   - Inputs:
     - `id` (string, required): Shopify order ID
     - `tags` (array of strings, optional): New tags for the order
     - `email` (string, optional): Update customer email
     - `note` (string, optional): Order notes
     - `customAttributes` (array of objects, optional): Custom attributes for the order
     - `metafields` (array of objects, optional): Order metafields
     - `shippingAddress` (object, optional): Shipping address information

## Debugging

If you encounter issues, check Claude Desktop's MCP logs:

```
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## License

MIT
