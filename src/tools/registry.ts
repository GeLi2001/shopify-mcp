import type { ShopifyTool } from "../lib/toolUtils.js";

// Product tools
import { getProducts } from "./getProducts.js";
import { getProductById } from "./getProductById.js";
import { createProduct } from "./createProduct.js";
import { updateProduct } from "./updateProduct.js";
import { deleteProduct } from "./deleteProduct.js";
import { manageProductVariants } from "./manageProductVariants.js";
import { deleteProductVariants } from "./deleteProductVariants.js";
import { manageProductOptions } from "./manageProductOptions.js";

// Order tools
import { getOrders } from "./getOrders.js";
import { getOrderById } from "./getOrderById.js";
import { updateOrder } from "./updateOrder.js";
import { createDraftOrder } from "./createDraftOrder.js";
import { completeDraftOrder } from "./completeDraftOrder.js";
import { orderCancel } from "./orderCancel.js";
import { orderCloseOpen } from "./orderCloseOpen.js";
import { orderMarkAsPaid } from "./orderMarkAsPaid.js";
import { createFulfillment } from "./createFulfillment.js";
import { createRefund } from "./createRefund.js";

// Customer tools
import { getCustomers } from "./getCustomers.js";
import { getCustomerById } from "./getCustomerById.js";
import { getCustomerOrders } from "./getCustomerOrders.js";
import { createCustomer } from "./createCustomer.js";
import { updateCustomer } from "./updateCustomer.js";
import { deleteCustomer } from "./deleteCustomer.js";
import { mergeCustomers } from "./mergeCustomers.js";
import { manageCustomerAddress } from "./manageCustomerAddress.js";

// Metafield tools
import { getMetafields } from "./getMetafields.js";
import { setMetafields } from "./setMetafields.js";
import { deleteMetafields } from "./deleteMetafields.js";

// Convenience / cross-resource tools
import { manageTags } from "./manageTags.js";
import { manageTagsBulk } from "./manageTagsBulk.js";
import { setInventoryQuantities } from "./setInventoryQuantities.js";

// Configuration & discovery tools
import { getShopInfo } from "./getShopInfo.js";
import { getMetafieldDefinitions } from "./getMetafieldDefinitions.js";
import { getLocations } from "./getLocations.js";
import { getMarkets } from "./getMarkets.js";
import { getCollections } from "./getCollections.js";

// Enhanced order & fulfillment tools
import { getOrderTransactions } from "./getOrderTransactions.js";
import { getFulfillmentOrders } from "./getFulfillmentOrders.js";
import { getOrderRefundDetails } from "./getOrderRefundDetails.js";
import { getCollectionById } from "./getCollectionById.js";

// Inventory & pricing read tools
import { getInventoryLevels } from "./getInventoryLevels.js";
import { getInventoryItems } from "./getInventoryItems.js";
import { getPriceLists } from "./getPriceLists.js";
import { getProductVariantsDetailed } from "./getProductVariantsDetailed.js";

export const tools: ShopifyTool[] = [
  // Products (8)
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  manageProductVariants,
  deleteProductVariants,
  manageProductOptions,
  // Orders (10)
  getOrders,
  getOrderById,
  updateOrder,
  createDraftOrder,
  completeDraftOrder,
  orderCancel,
  orderCloseOpen,
  orderMarkAsPaid,
  createFulfillment,
  createRefund,
  // Customers (8)
  getCustomers,
  getCustomerById,
  getCustomerOrders,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  mergeCustomers,
  manageCustomerAddress,
  // Metafields (3)
  getMetafields,
  setMetafields,
  deleteMetafields,
  // Convenience (3)
  manageTags,
  manageTagsBulk,
  setInventoryQuantities,
  // Configuration & discovery (5)
  getShopInfo,
  getMetafieldDefinitions,
  getLocations,
  getMarkets,
  getCollections,
  // Enhanced order & fulfillment (4)
  getOrderTransactions,
  getFulfillmentOrders,
  getOrderRefundDetails,
  getCollectionById,
  // Inventory & pricing reads (4)
  getInventoryLevels,
  getInventoryItems,
  getPriceLists,
  getProductVariantsDetailed,
];
