export type ConnectionCredentials =
  | { authType: "API_KEY"; apiKey: string }
  | { authType: "BASIC"; username: string; password: string }
  | { authType: "OAUTH2"; accessToken: string; refreshToken?: string; expiresAt?: string };

/** LRS GET /statements probe may attach parsed JSON (xAPI StatementResult + first statement). */
export type ConnectorTestResult =
  | { ok: true; lrsLatestStatement?: unknown | null; lrsStatementsResult?: unknown }
  | { ok: false; error: string };

export interface ConnectorAdapter {
  type: string;
  test(credentials: ConnectionCredentials, options?: Record<string, unknown>): Promise<ConnectorTestResult>;
}

