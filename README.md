# Shopify MCP Server

(please leave a star if you like!)

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

1. Node.js (version 18 or higher)
2. A Shopify store with a custom app (see setup instructions below)

## Setup

### Authentication

This server supports two authentication methods:

#### Option 1: Client Credentials (Dev Dashboard apps, January 2026+)

As of January 1, 2026, new Shopify apps are created in the **Dev Dashboard** and use OAuth client credentials instead of static access tokens.

1. From your Shopify admin, go to **Settings** > **Apps and sales channels**
2. Click **Develop apps** > **Build app in dev dashboard**
3. Create a new app and configure **Admin API scopes**:
   - `read_products`, `write_products`
   - `read_customers`, `write_customers`
   - `read_orders`, `write_orders`
4. Install the app on your store
5. Copy your **Client ID** and **Client Secret** from the app's API credentials

The server will automatically exchange these for an access token and refresh it before it expires (tokens are valid for ~24 hours).

#### Option 2: Static Access Token (legacy apps)

If you have an existing custom app with a static `shpat_` access token, you can still use it directly.

### Usage with Claude Desktop

**Client Credentials (recommended):**

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": [
        "shopify-mcp",
        "--clientId",
        "<YOUR_CLIENT_ID>",
        "--clientSecret",
        "<YOUR_CLIENT_SECRET>",
        "--domain",
        "<YOUR_SHOP>.myshopify.com"
      ]
    }
  }
}
```

**Static Access Token (legacy):**

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

### Usage with Claude Code

**Client Credentials:**

```bash
claude mcp add shopify -- npx shopify-mcp \
  --clientId YOUR_CLIENT_ID \
  --clientSecret YOUR_CLIENT_SECRET \
  --domain your-store.myshopify.com
```

**Static Access Token (legacy):**

```bash
claude mcp add shopify -- npx shopify-mcp \
  --accessToken YOUR_ACCESS_TOKEN \
  --domain your-store.myshopify.com
```

### Alternative: Run Locally with Environment Variables

If you prefer to use environment variables instead of command-line arguments:

1. Create a `.env` file with your Shopify credentials:

   **Client Credentials:**
   ```
   SHOPIFY_CLIENT_ID=your_client_id
   SHOPIFY_CLIENT_SECRET=your_client_secret
   MYSHOPIFY_DOMAIN=your-store.myshopify.com
   ```

   **Static Access Token (legacy):**
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
shopify-mcp --clientId=<ID> --clientSecret=<SECRET> --domain=<YOUR_SHOP>.myshopify.com
```

### Additional Options

- `--apiVersion`: Specify the Shopify API version (default: `2026-01`). Can also be set via `SHOPIFY_API_VERSION` environment variable.

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
