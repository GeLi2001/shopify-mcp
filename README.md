# Shopify MCP Server

(please leave a star if you like!)

MCP Server for Shopify API, enabling interaction with store data through GraphQL API. This server provides tools for managing products, customers, orders, and more.

**📦 Package Name: `shopify-mcp`**
**🚀 Command: `shopify-mcp` (NOT `shopify-mcp-server`)**

<a href="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp/badge" alt="Shopify MCP server" />
</a>

## Features

- **Product Management**: Full CRUD for products, variants, and options
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

3. `create-product`

   - Create a new product. When using `productOptions`, Shopify registers all option values but only creates one default variant (first value of each option, price $0). Use `manage-product-variants` with `strategy: REMOVE_STANDALONE_VARIANT` afterward to create all real variants with prices.
   - Inputs:
     - `title` (string, required): Title of the product
     - `descriptionHtml` (string, optional): Description with HTML
     - `handle` (string, optional): URL slug. Auto-generated from title if omitted
     - `vendor` (string, optional): Vendor of the product
     - `productType` (string, optional): Type of the product
     - `tags` (array of strings, optional): Product tags
     - `status` (string, optional): `"ACTIVE"`, `"DRAFT"`, or `"ARCHIVED"`. Default `"DRAFT"`
     - `seo` (object, optional): `{ title, description }` for search engines
     - `metafields` (array of objects, optional): Custom metafields (`namespace`, `key`, `value`, `type`)
     - `productOptions` (array of objects, optional): Options to create inline, e.g. `[{ name: "Size", values: [{ name: "S" }, { name: "M" }] }]`. Max 3 options.
     - `collectionsToJoin` (array of strings, optional): Collection GIDs to add the product to

4. `update-product`

   - Update an existing product's fields
   - Inputs:
     - `id` (string, required): Shopify product GID
     - `title` (string, optional): New title
     - `descriptionHtml` (string, optional): New description
     - `handle` (string, optional): New URL slug
     - `vendor` (string, optional): New vendor
     - `productType` (string, optional): New product type
     - `tags` (array of strings, optional): New tags (overwrites existing)
     - `status` (string, optional): `"ACTIVE"`, `"DRAFT"`, or `"ARCHIVED"`
     - `seo` (object, optional): `{ title, description }` for search engines
     - `metafields` (array of objects, optional): Metafields to set or update
     - `collectionsToJoin` (array of strings, optional): Collection GIDs to add the product to
     - `collectionsToLeave` (array of strings, optional): Collection GIDs to remove the product from
     - `redirectNewHandle` (boolean, optional): If true, old handle redirects to new handle

5. `delete-product`

   - Delete a product
   - Inputs:
     - `id` (string, required): Shopify product GID

6. `manage-product-options`

   - Create, update, or delete product options (e.g. Size, Color)
   - Inputs:
     - `productId` (string, required): Shopify product GID
     - `action` (string, required): `"create"`, `"update"`, or `"delete"`
     - For `action: "create"`:
       - `options` (array, required): Options to create, e.g. `[{ name: "Size", values: ["S", "M", "L"] }]`
     - For `action: "update"`:
       - `optionId` (string, required): Option GID to update
       - `name` (string, optional): New name for the option
       - `position` (number, optional): New position
       - `valuesToAdd` (array of strings, optional): Values to add
       - `valuesToDelete` (array of strings, optional): Value GIDs to remove
     - For `action: "delete"`:
       - `optionIds` (array of strings, required): Option GIDs to delete

7. `manage-product-variants`

   - Create or update product variants in bulk
   - Inputs:
     - `productId` (string, required): Shopify product GID
     - `strategy` (string, optional): How to handle the default variant when creating. `"DEFAULT"` (removes "Default Title" automatically), `"REMOVE_STANDALONE_VARIANT"` (recommended for full control), or `"PRESERVE_STANDALONE_VARIANT"`
     - `variants` (array, required): Variants to create or update. Each variant:
       - `id` (string, optional): Variant GID for updates. Omit to create new
       - `price` (string, optional): Price, e.g. `"49.00"`
       - `compareAtPrice` (string, optional): Compare-at price for showing discounts
       - `sku` (string, optional): SKU (mapped to `inventoryItem.sku`)
       - `tracked` (boolean, optional): Whether inventory is tracked. Set `false` for print-on-demand
       - `taxable` (boolean, optional): Whether the variant is taxable
       - `barcode` (string, optional): Barcode
       - `optionValues` (array, optional): Option values, e.g. `[{ optionName: "Size", name: "A4" }]`

8. `delete-product-variants`

   - Delete one or more variants from a product
   - Inputs:
     - `productId` (string, required): Shopify product GID
     - `variantIds` (array of strings, required): Variant GIDs to delete

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
