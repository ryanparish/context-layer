import { randomUUID } from "crypto";

/**
 * Minimal valid xAPI 1.0.x statement for integration smoke tests (LRS POST /statements).
 * Uses reserved `.invalid` mailto host (RFC 2606) so it is not a real mailbox.
 */
export function buildGenericXapiTestStatement() {
  const id = randomUUID();
  const timestamp = new Date().toISOString();
  return {
    id,
    timestamp,
    actor: {
      objectType: "Agent" as const,
      mbox: "mailto:xapivate-connection-test@localhost.invalid",
    },
    verb: {
      id: "http://adlnet.gov/expapi/verbs/experienced",
      display: { "en-US": "experienced" },
    },
    object: {
      objectType: "Activity" as const,
      id: "https://xapivate.app/connection-test/activity",
      definition: {
        name: { "en-US": "xAPIvate connection validation" },
        description: {
          "en-US": "Synthetic statement used only to verify LRS connectivity (POST /statements). Safe to delete in the LRS.",
        },
      },
    },
    context: {
      extensions: {
        "https://xapivate.app/extensions/connection-test": {
          purpose: "connection_validation",
          generatedAt: timestamp,
        },
      },
    },
  };
}
