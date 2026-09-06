import type { GraphQLClient } from "graphql-request";
import { z } from "zod";
import { handleToolError } from "../lib/toolUtils.js";

/**
 * Crumbs attribution tool — consent-gated agent-journey receipt.
 *
 * Records a merchant journey on a Crumbs attribution ledger (signed receipt:
 * rid/jid/agent anchor, did:pkh optional) so agent-assisted conversions can be
 * attributed end-to-end, and returns the x402 PAYMENT-RESPONSE referral field
 * to attach to downstream paid calls. The ledger URL is configured via the
 * CRUMBS_LEDGER_URL environment variable — there is deliberately NO default
 * endpoint (a receipt that cannot be verified is worse than none). This tool
 * needs no Shopify GraphQL access: attribution is orthogonal to store data.
 */

const CrumbAttributionInputSchema = z.object({
  merchant_id: z
    .string()
    .optional()
    .describe(
      "Ledger merchant id (mcr_/m_…). Defaults to CRUMBS_MERCHANT_ID env.",
    ),
  order_id: z
    .string()
    .optional()
    .describe(
      "Shopify order id/name used as the consent reference tying this receipt to the order.",
    ),
  agent_did: z
    .string()
    .optional()
    .describe(
      "did:pkh agent identifier (e.g. did:pkh:eip155:8453:0x…). Same did across merchants anchors the same agent id (cross-merchant stitching).",
    ),
  surface: z
    .enum(["chat", "api", "browser"])
    .optional()
    .describe(
      "Interaction surface recorded on the receipt (ledger contract: chat|api|browser). Defaults to chat — this tool runs inside an agent session.",
    ),
});
type CrumbAttributionInput = z.infer<typeof CrumbAttributionInputSchema>;

const crumbsAttribution = {
  name: "crumbs-attribution",
  description:
    "Issue a consent-gated Crumbs attribution receipt (signed journey record) for an agent-assisted order or conversion on the configured Crumbs ledger (CRUMBS_LEDGER_URL), and return the x402 referral field to attach to downstream paid agent calls. Needs no Shopify credentials.",
  schema: CrumbAttributionInputSchema,

  initialize(_client: GraphQLClient): void {
    // Attribution is ledger-side; the Shopify GraphQL client is not needed.
  },

  execute: async (input: CrumbAttributionInput) => {
    const ledgerUrl = process.env.CRUMBS_LEDGER_URL;
    if (!ledgerUrl) {
      throw new Error(
        "Failed to record crumbs attribution: CRUMBS_LEDGER_URL is not set. " +
          "Configure the Crumbs ledger base URL (e.g. https://ledger.example.com).",
      );
    }
    const merchantId =
      input.merchant_id ?? process.env.CRUMBS_MERCHANT_ID ?? "";
    if (!merchantId) {
      throw new Error(
        "Failed to record crumbs attribution: merchant_id is required either " +
          "as an argument or via CRUMBS_MERCHANT_ID.",
      );
    }

    const body: Record<string, unknown> = {
      merchant_id: merchantId,
      surface: input.surface ?? "chat",
      consent: {
        basis: "explicit",
        ref: input.order_id ? `shopify:${input.order_id}` : "shopify-mcp",
      },
    };
    if (input.agent_did) {
      body.agent_did = input.agent_did;
    }

    try {
      const resp = await fetch(
        `${ledgerUrl.replace(/\/+$/, "")}/v1/journeys`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const detail =
          typeof payload.detail === "string"
            ? payload.detail
            : JSON.stringify(payload.detail ?? payload);
        throw new Error(`ledger returned ${resp.status}: ${detail}`);
      }

      const jid: string = payload.journey_id ?? "";
      return {
        ok: true,
        ledger: ledgerUrl,
        rid: payload.rid ?? null,
        jid,
        agent_id: payload.agent_id ?? null,
        agent_did: payload.agent_did ?? null,
        consent: payload.consent ?? null,
        receipt: typeof payload.receipt === "string"
          ? JSON.parse(payload.receipt)
          : payload.receipt,
        // x402 PAYMENT-RESPONSE referral field for downstream paid calls.
        referral: jid
          ? { referral: { ref: jid, provider: "crumbs" } }
          : null,
      };
    } catch (error) {
      handleToolError("record crumbs attribution", error);
    }
  },
};

export { crumbsAttribution };
