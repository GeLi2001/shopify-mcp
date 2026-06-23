# Shopify MCP Server

(please leave a star if you like!)

MCP Server for Shopify API, enabling interaction with store data through GraphQL API. This server provides tools for managing products, customers, orders, and more.

**📦 Package Name: `shopify-mcp`**
**🚀 Command: `shopify-mcp` (NOT `shopify-mcp-server`)**

<a href="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp/badge" alt="Shopify MCP server" />
</a>

## Features

- **Product Management**: Full CRUD for products, variants, and options (8 tools)
- **Customer Management**: Full CRUD, merge, and address management (8 tools)
- **Order Management**: Smart lookup, cancel, close/open, mark as paid, fulfillment, refunds (10 tools)
- **Metafield Management**: Get, set, and delete metafields on any resource (3 tools)
- **Collection Management**: List collections and get collection details with products (2 tools)
- **Configuration & Discovery**: Shop info, metafield definitions, locations, markets (5 tools)
- **Inventory & Pricing**: Set quantities, view levels/items, price lists, detailed variants (5 tools)
- **Tag Management**: Add/remove tags on any taggable resource, including bulk operations (2 tools)
- **Enhanced Order Tools**: Transactions, fulfillment orders, refund details (3 tools)
- **Field Selection**: All GET tools support a `fields` parameter to fetch only the data you need
- **Count-Only Mode**: List tools support `countOnly` to get result counts without fetching data
- **Pagination & Sorting**: Cursor-based pagination and sort keys on all list queries
- **Advanced Filtering**: Pass-through Shopify query syntax for all list endpoints
- **GraphQL Integration**: Direct integration with Shopify's GraphQL Admin API (2026-01)
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

## Available Tools (45)

### Shared Capabilities

All list query tools (`get-products`, `get-customers`, `get-orders`, `get-customer-orders`, `get-collections`) support:

- **Cursor-based pagination**: `after` / `before` (cursor strings), with `pageInfo` in the response (`hasNextPage`, `hasPreviousPage`, `startCursor`, `endCursor`)
- **Sorting**: `sortKey` (enum specific to each resource) and `reverse` (boolean)
- **Advanced filtering**: `query` or `searchQuery` parameter accepting [Shopify query syntax](https://shopify.dev/docs/api/usage/search-syntax)
- **Field selection**: `fields` parameter to fetch only specific fields, reducing response size
- **Count-only mode**: `countOnly` parameter returns `{ count: N }` without fetching any resource data — useful for sizing queries before paginating

### Product Management (8 tools)

1. **`get-products`**

   - Get all products or search by title with pagination and sorting
   - Inputs:
     - `searchTitle` (string, optional): Filter products by title (wraps in `title:*...*`)
     - `limit` (number, default: 10): Maximum number of products to return
     - `query` (string, optional): Raw Shopify query string (e.g. `"status:active vendor:Nike tag:sale"`)
     - `sortKey` (string, optional): One of `CREATED_AT`, `ID`, `INVENTORY_TOTAL`, `PRODUCT_TYPE`, `PUBLISHED_AT`, `RELEVANCE`, `TITLE`, `UPDATED_AT`, `VENDOR`
     - `reverse` (boolean, optional): Reverse the sort order
     - `after` / `before` (string, optional): Pagination cursors

2. **`get-product-by-id`**

   - Get a specific product by ID with full details including SEO, options, media, variants, and collections
   - Inputs:
     - `productId` (string, required): Shopify product GID
   - Returns: `productType`, `descriptionHtml`, `seo`, `options` (with `optionValues`), `media` (images), `variants`, `collections`, `tags`, `vendor`, price range, inventory

3. **`create-product`**

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

4. **`update-product`**

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

5. **`delete-product`**

   - Delete a product
   - Inputs:
     - `id` (string, required): Shopify product GID

6. **`manage-product-options`**

   - Create, update, or delete product options (e.g. Size, Color)
   - Inputs:
     - `productId` (string, required): Shopify product GID
     - `action` (string, required): `"create"`, `"update"`, or `"delete"`
     - `variantStrategy` (string, optional): `"LEAVE_AS_IS"` (default) or `"CREATE"` — controls whether new variant combinations are generated when adding options
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

7. **`manage-product-variants`**

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
       - `weight` (number, optional): Weight of the variant
       - `weightUnit` (string, optional): `"GRAMS"`, `"KILOGRAMS"`, `"OUNCES"`, or `"POUNDS"`
       - `optionValues` (array, optional): Option values, e.g. `[{ optionName: "Size", name: "A4" }]`

8. **`delete-product-variants`**

   - Delete one or more variants from a product
   - Inputs:
     - `productId` (string, required): Shopify product GID
     - `variantIds` (array of strings, required): Variant GIDs to delete

### Customer Management (8 tools)

1. **`get-customers`**

   - List customers with search, pagination, and sorting
   - Inputs:
     - `searchQuery` (string, optional): Freetext or Shopify query syntax (e.g. `"country:US tag:vip orders_count:>5"`)
     - `limit` (number, default: 10): Maximum number of customers to return
     - `sortKey` (string, optional): One of `CREATED_AT`, `ID`, `LAST_UPDATE`, `LOCATION`, `NAME`, `ORDERS_COUNT`, `RELEVANCE`, `TOTAL_SPENT`, `UPDATED_AT`
     - `reverse` (boolean, optional): Reverse the sort order
     - `after` / `before` (string, optional): Pagination cursors

2. **`get-customer-by-id`**

   - Get a single customer by ID with full details
   - Inputs:
     - `id` (string, required): Shopify customer ID (numeric only, e.g. `"6276879810626"`)
   - Returns: name, email, phone, addresses, tags, note, tax status, amount spent, order count, metafields

3. **`create-customer`**

   - Create a new customer
   - Inputs:
     - `firstName` (string, optional): Customer's first name
     - `lastName` (string, optional): Customer's last name
     - `email` (string, optional): Customer's email address
     - `phone` (string, optional): Customer's phone number
     - `tags` (array of strings, optional): Tags to apply
     - `note` (string, optional): Note about the customer
     - `taxExempt` (boolean, optional): Whether the customer is exempt from taxes
     - `metafields` (array of objects, optional): Custom metafields (`namespace`, `key`, `value`, `type`)
     - `addresses` (array of objects, optional): Customer addresses (`address1`, `address2`, `city`, `provinceCode`, `zip`, `country`, `phone`)

4. **`update-customer`**

   - Update a customer's information
   - Inputs:
     - `id` (string, required): Shopify customer ID (numeric only, e.g. `"6276879810626"`)
     - `firstName` (string, optional): Customer's first name
     - `lastName` (string, optional): Customer's last name
     - `email` (string, optional): Customer's email address
     - `phone` (string, optional): Customer's phone number
     - `tags` (array of strings, optional): Tags to apply to the customer
     - `note` (string, optional): Note about the customer
     - `taxExempt` (boolean, optional): Whether the customer is exempt from taxes
     - `emailMarketingConsent` (object, optional): Email marketing consent settings
       - `marketingState` (string, required): `"NOT_SUBSCRIBED"`, `"SUBSCRIBED"`, `"UNSUBSCRIBED"`, or `"PENDING"`
       - `consentUpdatedAt` (string, optional): ISO 8601 timestamp
       - `marketingOptInLevel` (string, optional): `"SINGLE_OPT_IN"`, `"CONFIRMED_OPT_IN"`, or `"UNKNOWN"`
     - `metafields` (array of objects, optional): Customer metafields

5. **`delete-customer`**

   - Delete a customer
   - Inputs:
     - `id` (string, required): Shopify customer ID (numeric only, e.g. `"6276879810626"`)

6. **`customer-merge`**

   - Merge two customer records into one
   - Inputs:
     - `customerOneId` (string, required): GID of the first customer
     - `customerTwoId` (string, required): GID of the second customer
     - `overrideFields` (object, optional): Override which fields to keep from which customer (firstName, lastName, email, phone, defaultAddress, note, tags)

7. **`manage-customer-address`**

   - Create, update, or delete a customer's mailing address
   - Inputs:
     - `customerId` (string, required): Customer GID
     - `action` (string, required): `"create"`, `"update"`, or `"delete"`
     - `addressId` (string, optional): Address GID (required for update/delete)
     - `address` (object, optional): Address fields (required for create/update): `address1`, `address2`, `city`, `company`, `countryCode`, `firstName`, `lastName`, `phone`, `provinceCode`, `zip`
     - `setAsDefault` (boolean, optional): Set as customer's default address

### Order Management (10 tools)

1. **`get-orders`**

   - Get orders with filtering, pagination, and sorting
   - Inputs:
     - `status` (string, optional): `"any"`, `"open"`, `"closed"`, or `"cancelled"`. Default `"any"`
     - `limit` (number, default: 10): Maximum number of orders to return
     - `query` (string, optional): Raw Shopify query string (e.g. `"financial_status:paid fulfillment_status:shipped tag:rush"`)
     - `sortKey` (string, optional): One of `CREATED_AT`, `ORDER_NUMBER`, `TOTAL_PRICE`, `FINANCIAL_STATUS`, `FULFILLMENT_STATUS`, `UPDATED_AT`, `CUSTOMER_NAME`, `PROCESSED_AT`, `ID`, `RELEVANCE`
     - `reverse` (boolean, optional): Reverse the sort order
     - `after` / `before` (string, optional): Pagination cursors

2. **`get-order-by-id`**

   - Get a specific order by ID with smart lookup — accepts order name (`#77235` or `77235`), numeric ID (`8054938337547`), or full GID (`gid://shopify/Order/...`)
   - Inputs:
     - `orderId` (string, required): Order name, numeric ID, or full GID
   - Returns: pricing, customer, shipping/billing addresses, line items, tags, notes, metafields, cancel reason, return status, discount codes, PO number, timestamps

3. **`update-order`**

   - Update an existing order
   - Inputs:
     - `id` (string, required): Shopify order GID
     - `tags` (array of strings, optional): New tags for the order
     - `email` (string, optional): Update customer email on the order
     - `note` (string, optional): Order notes
     - `phone` (string, optional): Phone number for the order
     - `poNumber` (string, optional): Purchase order number
     - `customAttributes` (array of objects, optional): Custom key-value attributes
     - `metafields` (array of objects, optional): Order metafields
     - `shippingAddress` (object, optional): Shipping address fields

4. **`get-customer-orders`**

   - Get orders for a specific customer with pagination and sorting
   - Inputs:
     - `customerId` (string, required): Shopify customer ID (numeric only, e.g. `"6276879810626"`)
     - `limit` (number, default: 10): Maximum number of orders to return
     - `sortKey` (string, optional): Same sort keys as `get-orders`
     - `reverse` (boolean, optional): Reverse the sort order
     - `after` / `before` (string, optional): Pagination cursors

5. **`order-cancel`**

   - Cancel an order with options for refunding, restocking, and customer notification. **Irreversible.**
   - Inputs:
     - `orderId` (string, required): Order GID
     - `reason` (string, required): `"CUSTOMER"`, `"DECLINED"`, `"FRAUD"`, `"INVENTORY"`, `"OTHER"`, or `"STAFF"`
     - `restock` (boolean, required): Whether to restock inventory
     - `notifyCustomer` (boolean, default: false): Notify the customer
     - `staffNote` (string, optional): Internal note
     - `refund` (boolean, optional): Refund to original payment method

6. **`order-close-open`**

   - Close or reopen an order
   - Inputs:
     - `orderId` (string, required): Order GID
     - `action` (string, required): `"close"` or `"open"`

7. **`order-mark-as-paid`**

   - Mark an order as paid (for manual/offline payments)
   - Inputs:
     - `orderId` (string, required): Order GID

8. **`create-fulfillment`**

   - Create a fulfillment (mark items as shipped) with optional tracking
   - Inputs:
     - `lineItemsByFulfillmentOrder` (array, required): Fulfillment orders and line items to fulfill
     - `trackingInfo` (object, optional): `{ number, url, company }` tracking details
     - `notifyCustomer` (boolean, default: false): Send shipping notification

9. **`refund-create`**

   - Create a full or partial refund with optional restocking
   - Inputs:
     - `orderId` (string, required): Order GID
     - `refundLineItems` (array, optional): Line items to refund with `lineItemId`, `quantity`, `restockType` (`CANCEL`/`RETURN`/`NO_RESTOCK`), `locationId`
     - `shipping` (object, optional): `{ amount, fullRefund }` shipping refund
     - `note` (string, optional): Refund note
     - `notify` (boolean, optional): Send refund notification

10. **`create-draft-order`**

    - Create a draft order for phone/chat sales, invoicing, or wholesale
    - Inputs:
      - `lineItems` (array, required): Product variants (`variantId`) or custom items (`title` + price). Max 499
      - `customerId` (string, optional): Customer GID
      - `email`, `phone`, `note`, `tags`, `poNumber` (optional)
      - `shippingAddress`, `billingAddress` (objects, optional)
      - `appliedDiscount` (object, optional): `{ title, value, valueType }` order-level discount

### Draft Order Management (1 tool)

1. **`complete-draft-order`**

   - Complete a draft order, converting it into a real order
   - Inputs:
     - `draftOrderId` (string, required): Draft order GID
     - `paymentGatewayId` (string, optional): Payment gateway GID

### Metafield Management (3 tools)

1. **`get-metafields`**

   - Get metafields for any Shopify resource (products, orders, customers, variants, collections, etc.)
   - Inputs:
     - `ownerId` (string, required): GID of any resource
     - `namespace` (string, optional): Filter by namespace
     - `first` (number, default: 25): Number of metafields to return
     - `after` (string, optional): Pagination cursor

2. **`set-metafields`**

   - Set metafields on any Shopify resource. Creates or updates up to 25 metafields atomically
   - Inputs:
     - `metafields` (array, required): Metafields to set, each with `ownerId`, `key`, `value`, and optional `namespace`, `type`

3. **`delete-metafields`**

   - Delete metafields from any Shopify resource
   - Inputs:
     - `metafields` (array, required): Metafields to delete, each with `ownerId`, `namespace`, `key`

### Inventory Management (1 tool)

1. **`inventory-set-quantities`**

   - Set absolute inventory quantities for items at specific locations
   - Inputs:
     - `reason` (string, required): Reason for change (e.g. `"correction"`, `"cycle_count_available"`)
     - `name` (string, required): `"available"` or `"on_hand"`
     - `quantities` (array, required): Items with `inventoryItemId`, `locationId`, `quantity`

### Tag Management (2 tools)

1. **`manage-tags`**

   - Add or remove tags on any taggable resource (orders, products, customers, draft orders, articles)
   - Inputs:
     - `id` (string, required): GID of the resource (e.g. `gid://shopify/Product/123`)
     - `tags` (array of strings, required): Tags to add or remove
     - `action` (string, required): `"add"` or `"remove"`

2. **`manage-tags-bulk`**

   - Bulk add or remove tags on up to 100 resources in a single call (runs mutations in parallel)
   - Inputs:
     - `ids` (array of strings, required): Resource GIDs (up to 100). For larger sets, call multiple times
     - `tags` (array of strings, required): Tags to add or remove
     - `action` (string, required): `"add"` or `"remove"`

### Collection Management (2 tools)

1. **`get-collections`**

   - List collections with search, pagination, and sorting
   - Inputs:
     - `query` (string, optional): Shopify query syntax
     - `limit` (number, default: 10): Maximum collections to return
     - `sortKey`, `reverse`, `after`/`before`: Standard pagination and sorting
     - `fields`, `countOnly`: Standard field selection and count-only mode

2. **`get-collection-by-id`**

   - Get a single collection with full details including products, rules (smart collections), SEO, and image
   - Inputs:
     - `collectionId` (string, required): Collection ID (e.g. `gid://shopify/Collection/123` or just `123`)
     - `productsFirst` (number, default: 25): Number of products to include (0 to skip)
     - `fields` (array, optional): Collection-level fields to fetch (`id`, `title`, `handle`, `descriptionHtml`, `sortOrder`, `templateSuffix`, `updatedAt`, `productsCount`, `ruleSet`, `image`, `seo`)

### Configuration & Discovery (4 tools)

1. **`get-shop-info`** — Get shop details (name, domain, plan, currency, timezone, etc.)
2. **`get-metafield-definitions`** — List metafield definitions for any owner type with pagination
3. **`get-locations`** — List all active locations with addresses and fulfillment service info
4. **`get-markets`** — List all markets with regions, currencies, and domains

### Enhanced Order & Fulfillment (3 tools)

1. **`get-order-transactions`** — Get payment transactions for an order (gateway, status, amounts, card details)
2. **`get-fulfillment-orders`** — Get fulfillment orders for an order (line items, assigned location, status)
3. **`get-order-refund-details`** — Get refund history for an order (line items, amounts, restocking)

### Inventory & Pricing (4 tools)

1. **`inventory-set-quantities`** — Set absolute inventory quantities at locations with validated reason codes
2. **`get-inventory-levels`** — Get inventory levels for an item across locations
3. **`get-inventory-items`** — Get inventory items for a product (cost, tracking, country of origin)
4. **`get-price-lists`** — List price lists with fixed prices and quantity rules
5. **`get-product-variants-detailed`** — Get detailed variant info (inventory, pricing, images, metafields)

### Order Query Filter Reference

The `get-orders` tool's `query` parameter supports [Shopify search syntax](https://shopify.dev/docs/api/usage/search-syntax):

| Filter | Example |
|--------|---------|
| `name` | `name:#77235` |
| `created_at` | `created_at:>2024-01-01` or `created_at:2024-01-01..2024-03-31` |
| `updated_at` | `updated_at:>2024-06-01` |
| `financial_status` | `financial_status:paid` |
| `fulfillment_status` | `fulfillment_status:shipped` |
| `status` | `status:open` |
| `email` | `email:customer@example.com` |
| `tag` / `tag_not` | `tag:vip tag_not:wholesale` |
| `discount_code` | `discount_code:SUMMER20` |
| `sku` | `sku:PROD-001` |
| `risk_level` | `risk_level:high` |
| `gateway` | `gateway:shopify_payments` |
| `test` | `test:true` |

## Debugging

If you encounter issues, check Claude Desktop's MCP logs:

```
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## License

MIT
