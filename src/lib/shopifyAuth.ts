/**
 * Shopify OAuth Client Credentials flow.
 *
 * As of January 1 2026 Shopify no longer exposes static Admin API access
 * tokens in the UI.  New apps created in the Dev Dashboard receive a
 * client_id + client_secret pair which must be exchanged for a short-lived
 * access token (expires_in ≈ 86 400 s / 24 h).
 *
 * This module handles the token exchange and transparent refresh so the
 * rest of the codebase can keep using a plain access-token string.
 */

import type { GraphQLClient } from "graphql-request";

export interface ClientCredentialsConfig {
  clientId: string;
  clientSecret: string;
  shopDomain: string; // e.g. "my-store.myshopify.com"
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
}

// Refresh 5 minutes before actual expiry to avoid race conditions.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export class ShopifyAuth {
  private config: ClientCredentialsConfig;
  private accessToken: string | null = null;
  private expiresAt = 0;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private graphqlClient: GraphQLClient | null = null;

  constructor(config: ClientCredentialsConfig) {
    this.config = config;
  }

  /** Attach the GraphQL client so the token can be hot-swapped on refresh. */
  setGraphQLClient(client: GraphQLClient): void {
    this.graphqlClient = client;
  }

  /** Fetch an initial token. Must be called before the server starts. */
  async initialize(): Promise<string> {
    await this.fetchToken();
    this.scheduleRefresh();
    return this.accessToken!;
  }

  /** Return the current (valid) access token. */
  getAccessToken(): string {
    if (!this.accessToken) {
      throw new Error("ShopifyAuth not initialized — call initialize() first");
    }
    return this.accessToken;
  }

  /** Stop the background refresh timer (for clean shutdown). */
  destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private async fetchToken(): Promise<void> {
    const url = `https://${this.config.shopDomain}/admin/oauth/access_token`;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Shopify token exchange failed (${res.status}): ${text}`
      );
    }

    const data = (await res.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;

    // Hot-swap the header on the existing GraphQL client so every tool
    // automatically picks up the new token.
    if (this.graphqlClient) {
      this.graphqlClient.setHeader(
        "X-Shopify-Access-Token",
        this.accessToken
      );
    }
  }

  private scheduleRefresh(): void {
    const msUntilRefresh = this.expiresAt - Date.now() - REFRESH_MARGIN_MS;
    const delay = Math.max(msUntilRefresh, 0);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.fetchToken();
        this.scheduleRefresh();
      } catch (err) {
        console.error("Failed to refresh Shopify access token:", err);
        // Retry in 60 s rather than dying.
        this.refreshTimer = setTimeout(() => this.scheduleRefresh(), 60_000);
      }
    }, delay);

    // Allow the Node process to exit even if the timer is pending.
    if (this.refreshTimer && typeof this.refreshTimer === "object" && "unref" in this.refreshTimer) {
      this.refreshTimer.unref();
    }
  }
}
