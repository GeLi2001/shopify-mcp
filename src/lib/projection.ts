import type { GraphQLClient } from "graphql-request";
import { z } from "zod";
import { edgesToNodes } from "./toolUtils.js";

// ── Field projection ──────────────────────────────────────────────────
//
// A Projection is the single source of truth for a tool's selectable fields.
// Each field maps to its GraphQL fragment. From that one definition a
// Projection derives:
//   - the GraphQL selection set (selection)
//   - the zod `fields` parameter, including the shared agent guidance (fieldsParam)
//   - response normalisation that flattens connection-shaped values (normalize)
//
// This keeps the fragment, the enum, and the docs for a field in one place
// instead of spread across a field map, an enum, and a describe string in every
// tool. `normalize` flattens any top-level Shopify connection ({ edges: [...] })
// on a node to an array of nodes — detected by shape, so field aliases (e.g. a
// fragment using addressesV2 under the key "addresses") are handled correctly.

const SHARED_FIELDS_GUIDANCE =
  "IMPORTANT: Always specify this to minimize token usage and avoid flooding context with unnecessary data. " +
  "Only the listed fields will be fetched from the API and returned. 'id' is always included. " +
  "If you are unsure which fields are needed, ask the user before fetching all fields. ";

const COUNT_ONLY_GUIDANCE =
  "IMPORTANT: Use this to check result set size before fetching data. " +
  "Returns only { count: N } without any resource data, saving significant context. " +
  "Recommended before paginating large result sets.";

export interface Projection {
  /** All selectable field names, in declaration order ('id' is always implicitly selected). */
  readonly fieldNames: string[];

  /**
   * GraphQL selection set for the requested fields (or all when omitted).
   * Always includes 'id'. Joined with newlines — GraphQL is whitespace-insensitive,
   * so callers can interpolate this at any indentation.
   */
  selection(fields?: string[]): string;

  /**
   * Zod parameter for the `fields` argument, carrying the shared agent guidance.
   * @param opts.noun  word used in the example sentence (e.g. "product", "collection").
   * @param opts.extra extra guidance appended before the "Available:" list.
   */
  fieldsParam(opts?: { noun?: string; extra?: string }): z.ZodOptional<
    z.ZodArray<z.ZodEnum<[string, ...string[]]>>
  >;

  /** Flatten any top-level connection-shaped value ({ edges: [...] }) on a node to an array of nodes. */
  normalize<T extends Record<string, unknown>>(node: T): T;
}

/** Build a Projection from a map of field name → GraphQL fragment. */
export function defineProjection(spec: Record<string, string>): Projection {
  const names = Object.keys(spec);

  return {
    fieldNames: names,

    selection(fields?: string[]): string {
      const selected = fields ?? names;
      const ordered = [...new Set(["id", ...selected])];
      return ordered
        .map((n) => spec[n])
        .filter(Boolean)
        .join("\n");
    },

    fieldsParam(opts: { noun?: string; extra?: string } = {}) {
      const noun = opts.noun ?? "resource";
      const enumNames = names as [string, ...string[]];
      const description =
        SHARED_FIELDS_GUIDANCE +
        `Example: ["id", "title"] returns only ${noun} GID and title. ` +
        (opts.extra ? `${opts.extra} ` : "") +
        `Available: ${names.join(", ")}`;
      return z.array(z.enum(enumNames)).optional().describe(description);
    },

    normalize<T extends Record<string, unknown>>(node: T): T {
      const result: Record<string, unknown> = { ...node };
      for (const [key, value] of Object.entries(result)) {
        if (
          value &&
          typeof value === "object" &&
          Array.isArray((value as { edges?: unknown[] }).edges)
        ) {
          result[key] = edgesToNodes(value as never);
        }
      }
      return result as T;
    },
  };
}

/** Shared zod parameter for the `countOnly` argument. */
export function countOnlyParam() {
  return z.boolean().optional().describe(COUNT_ONLY_GUIDANCE);
}

/**
 * Run a Shopify *Count query (e.g. "productsCount", "ordersCount") and return { count }.
 * Backs the `countOnly` mode of the list tools.
 */
export async function fetchCount(
  client: GraphQLClient,
  countField: string,
  query?: string,
): Promise<{ count: number }> {
  const countQuery = `
    query Count($query: String) {
      ${countField}(query: $query) { count }
    }
  `;
  const data = (await client.request(countQuery, { query })) as Record<
    string,
    { count: number }
  >;
  return { count: data[countField].count };
}
