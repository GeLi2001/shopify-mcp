#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import minimist from "minimist";
import { z } from "zod";

// Import tools
import { getCustomerOrders } from "./tools/getCustomerOrders.js";
import { getCustomers } from "./tools/getCustomers.js";
import { getOrderById } from "./tools/getOrderById.js";
import { getOrders } from "./tools/getOrders.js";
import { getProductById } from "./tools/getProductById.js";
import { getProducts } from "./tools/getProducts.js";
import { updateCustomer } from "./tools/updateCustomer.js";
import { updateOrder } from "./tools/updateOrder.js";
import { createProduct } from "./tools/createProduct.js";
import { updateProduct } from "./tools/updateProduct.js";
import { manageProductVariants } from "./tools/manageProductVariants.js";
import { deleteProductVariants } from "./tools/deleteProductVariants.js";
import { deleteProduct } from "./tools/deleteProduct.js";
import { manageProductOptions } from "./tools/manageProductOptions.js";
import { ShopifyAuth } from "./lib/shopifyAuth.js";

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Load environment variables from .env file (if it exists)
dotenv.config();

// Define environment variables - from command line or .env file
const SHOPIFY_ACCESS_TOKEN =
  argv.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_CLIENT_ID =
  argv.clientId || process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET =
  argv.clientSecret || process.env.SHOPIFY_CLIENT_SECRET;
const MYSHOPIFY_DOMAIN = argv.domain || process.env.MYSHOPIFY_DOMAIN;

const useClientCredentials = !!(SHOPIFY_CLIENT_ID && SHOPIFY_CLIENT_SECRET);

// Store in process.env for backwards compatibility
process.env.MYSHOPIFY_DOMAIN = MYSHOPIFY_DOMAIN;

// Validate required environment variables
if (!SHOPIFY_ACCESS_TOKEN && !useClientCredentials) {
  console.error("Error: Authentication credentials are required.");
  console.error("");
  console.error("Option 1 — Static access token (legacy apps):");
  console.error("  --accessToken=shpat_xxxxx");
  console.error("");
  console.error("Option 2 — Client credentials (Dev Dashboard apps, Jan 2026+):");
  console.error("  --clientId=your_client_id --clientSecret=your_client_secret");
  process.exit(1);
}

if (!MYSHOPIFY_DOMAIN) {
  console.error("Error: MYSHOPIFY_DOMAIN is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error("  Command line: --domain=your-store.myshopify.com");
  process.exit(1);
}

// Resolve access token (client credentials or static)
let accessToken: string;
let auth: ShopifyAuth | null = null;

if (useClientCredentials) {
  auth = new ShopifyAuth({
    clientId: SHOPIFY_CLIENT_ID!,
    clientSecret: SHOPIFY_CLIENT_SECRET!,
    shopDomain: MYSHOPIFY_DOMAIN,
  });
  accessToken = await auth.initialize();
} else {
  accessToken = SHOPIFY_ACCESS_TOKEN!;
}

process.env.SHOPIFY_ACCESS_TOKEN = accessToken;

// Create Shopify GraphQL client
const API_VERSION = argv.apiVersion || process.env.SHOPIFY_API_VERSION || "2026-01";
const shopifyClient = new GraphQLClient(
  `https://${MYSHOPIFY_DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
  {
    headers: {
      "X-Shopify-Access-Token": accessToken,
      "Content-Type": "application/json"
    }
  }
);

// Let the auth manager hot-swap the token header on refresh
if (auth) {
  auth.setGraphQLClient(shopifyClient);
}

// Initialize tools with shopifyClient
getProducts.initialize(shopifyClient);
getProductById.initialize(shopifyClient);
getCustomers.initialize(shopifyClient);
getOrders.initialize(shopifyClient);
getOrderById.initialize(shopifyClient);
updateOrder.initialize(shopifyClient);
getCustomerOrders.initialize(shopifyClient);
updateCustomer.initialize(shopifyClient);
createProduct.initialize(shopifyClient);
updateProduct.initialize(shopifyClient);
manageProductVariants.initialize(shopifyClient);
deleteProductVariants.initialize(shopifyClient);
deleteProduct.initialize(shopifyClient);
manageProductOptions.initialize(shopifyClient);

// Set up MCP server
const server = new McpServer({
  name: "shopify",
  version: "1.0.0",
  description:
    "MCP Server for Shopify API, enabling interaction with store data through GraphQL API"
});

// Add tools individually, using their schemas directly
server.tool(
  "get-products",
  {
    searchTitle: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getProducts.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-product-by-id",
  {
    productId: z.string().min(1)
  },
  async (args) => {
    const result = await getProductById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-customers",
  {
    searchQuery: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getCustomers.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-orders",
  {
    status: z.enum(["any", "open", "closed", "cancelled"]).default("any"),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getOrders.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getOrderById tool
server.tool(
  "get-order-by-id",
  {
    orderId: z.string().min(1)
  },
  async (args) => {
    const result = await getOrderById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateOrder tool
server.tool(
  "update-order",
  {
    id: z.string().min(1),
    tags: z.array(z.string()).optional(),
    email: z.string().email().optional(),
    note: z.string().optional(),
    customAttributes: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional(),
    metafields: z
      .array(
        z.object({
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional()
        })
      )
      .optional(),
    shippingAddress: z
      .object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        company: z.string().optional(),
        country: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        province: z.string().optional(),
        zip: z.string().optional()
      })
      .optional()
  },
  async (args) => {
    const result = await updateOrder.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getCustomerOrders tool
server.tool(
  "get-customer-orders",
  {
    customerId: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getCustomerOrders.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateCustomer tool
server.tool(
  "update-customer",
  {
    id: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    note: z.string().optional(),
    taxExempt: z.boolean().optional(),
    metafields: z
      .array(
        z.object({
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional()
        })
      )
      .optional()
  },
  async (args) => {
    const result = await updateCustomer.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the createProduct tool
server.tool(
  "create-product",
  {
    title: z.string().min(1),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("DRAFT"),
  },
  async (args) => {
    const result = await createProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateProduct tool
server.tool(
  "update-product",
  {
    id: z.string().min(1).describe("Shopify product GID, e.g. gid://shopify/Product/123"),
    title: z.string().optional(),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
    metafields: z
      .array(
        z.object({
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional(),
        })
      )
      .optional(),
  },
  async (args) => {
    const result = await updateProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// Add the manageProductVariants tool
server.tool(
  "manage-product-variants",
  {
    productId: z.string().min(1).describe("Shopify product GID"),
    variants: z
      .array(
        z.object({
          id: z.string().optional().describe("Variant GID for updates. Omit to create new."),
          price: z.string().optional().describe("Price as string, e.g. '49.00'"),
          sku: z.string().optional(),
          optionValues: z
            .array(
              z.object({
                optionName: z.string().describe("Option name, e.g. 'Size'"),
                name: z.string().describe("Option value, e.g. '8x10'"),
              })
            )
            .optional(),
        })
      )
      .min(1)
      .describe("Variants to create or update"),
    strategy: z
      .enum(["DEFAULT", "REMOVE_STANDALONE_VARIANT", "PRESERVE_STANDALONE_VARIANT"])
      .optional()
      .describe(
        "How to handle the Default Title variant when creating. DEFAULT removes it automatically."
      ),
  },
  async (args) => {
    const result = await manageProductVariants.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// Add the manageProductOptions tool
server.tool(
  "manage-product-options",
  {
    productId: z.string().min(1).describe("Shopify product GID"),
    action: z.enum(["create", "update", "delete"]),
    options: z
      .array(
        z.object({
          name: z.string().describe("Option name, e.g. 'Size'"),
          position: z.number().optional(),
          values: z.array(z.string()).optional().describe("Option values, e.g. ['A4', 'A3']"),
        })
      )
      .optional()
      .describe("Options to create (action=create)"),
    optionId: z.string().optional().describe("Option GID to update (action=update)"),
    name: z.string().optional().describe("New name for the option (action=update)"),
    position: z.number().optional().describe("New position (action=update)"),
    valuesToAdd: z.array(z.string()).optional().describe("Values to add (action=update)"),
    valuesToDelete: z.array(z.string()).optional().describe("Value GIDs to delete (action=update)"),
    optionIds: z.array(z.string()).optional().describe("Option GIDs to delete (action=delete)"),
  },
  async (args) => {
    const result = await manageProductOptions.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// Add the deleteProduct tool
server.tool(
  "delete-product",
  {
    id: z.string().min(1).describe("Shopify product GID, e.g. gid://shopify/Product/123"),
  },
  async (args) => {
    const result = await deleteProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// Add the deleteProductVariants tool
server.tool(
  "delete-product-variants",
  {
    productId: z.string().min(1).describe("Shopify product GID"),
    variantIds: z.array(z.string().min(1)).min(1).describe("Array of variant GIDs to delete"),
  },
  async (args) => {
    const result = await deleteProductVariants.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
server
  .connect(transport)
  .then(() => {})
  .catch((error: unknown) => {
    console.error("Failed to start Shopify MCP Server:", error);
  });
