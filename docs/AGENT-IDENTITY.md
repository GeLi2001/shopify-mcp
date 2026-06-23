# Agent Identity and Per-Tool Authorization

This guide covers how to verify which agent is acting and restrict what
tools it can call when multiple agents or third-party tools connect to
your Shopify MCP server.

## When this matters

- Multiple agents share the same Shopify API credentials
- A third-party tool or wrapper connects to your MCP server
- You want to attribute store changes to specific agent software for debugging or operational visibility
- You want to restrict some agents to read-only access (no product deletions or order modifications)

## Pattern: authorization proxy

Place a reverse proxy between agents and the Shopify MCP server. The proxy
verifies agent credentials and enforces a per-tool permission policy before
forwarding requests. The MCP server does not need code changes.

```
Agent → Authorization Proxy (verify + enforce) → shopify-mcp
```

The proxy should:
1. Verify the agent's identity (signed attestation, API key, certificate, etc.)
2. Check the requested tool against a permission policy
3. Reject unauthorized or replayed requests
4. Log the decision for troubleshooting and accountability

## Example tool permission tiers

The 31 tools in shopify-mcp have different risk levels. As an illustrative
starting point, you might group them like this:

| Tier | Example tools | Rationale |
|------|--------------|-----------|
| Read-only | `get-products`, `get-customers`, `get-orders`, `get-customer-orders` | No side effects |
| Write | `update-product`, `set-inventory`, `add-tags`, `remove-tags`, `set-metafield` | Modifies state but does not create financial exposure |
| Financial | `create-order`, `create-draft-order`, `mark-order-as-paid`, `create-refund` | Creates or modifies financial state |
| Destructive | `delete-product`, `cancel-order`, `delete-metafield` | Irreversible or high-impact operations |

> **This is illustrative, not exhaustive.** Check the tool definitions in
> the source for the current tool list and review each tool's risk level
> before building your policy. Tools may be added or renamed between versions.

An agent authorized for "Read-only" should not be able to call
`delete-product` or `create-refund`. The proxy enforces this before the
request reaches the MCP server.

## Implementation options

Several approaches can implement this pattern:

- **API gateway with tool-name routing** (e.g., nginx + Lua, Envoy, Kong):
  inspect the JSON-RPC `params.name` field and enforce allow/deny rules
  per agent identity.
- **MCP-aware auth proxy** (e.g., [@bolyra/gateway](https://github.com/bolyra/bolyra/tree/main/integrations/gateway)):
  a reverse proxy purpose-built for MCP servers with per-tool policy
  enforcement and decision logging.
- **Custom middleware**: wrap the MCP server's HTTP transport with
  authentication and authorization checks.

The choice depends on your deployment topology and trust model.

## What the proxy should log

For each `tools/call` request, the proxy should record:
- Agent identity (however you identify agents)
- Tool name requested
- Decision (allowed or denied)
- Timestamp
- Reason for denial (if applicable)

This creates a record that answers "which software deleted that product?"
or "which agent issued that refund?"
