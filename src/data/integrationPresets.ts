export type IntegrationAuthMode = "api_key" | "oauth2_bearer" | "basic";

export type IntegrationOptionField = {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
};

export type IntegrationPreset = {
  /** Stored as Connection.type; must match adapter.type */
  id: string;
  name: string;
  category: string;
  description: string;
  authMode: IntegrationAuthMode;
  oauthRedirect?: { provider: "microsoft" | "google"; scopes: string[] };
  /** Extra fields stored in Connection secret JSON `options` */
  optionFields: IntegrationOptionField[];
  docsUrl?: string;
};

export const integrationPresets: IntegrationPreset[] = [
  {
    id: "microsoft_graph",
    name: "Microsoft 365 (Microsoft Graph)",
    category: "Productivity & Identity",
    description:
      "Call Microsoft Graph with an OAuth2 access token from Entra ID. Use for M365, Teams, and directory data.",
    authMode: "oauth2_bearer",
    oauthRedirect: { provider: "microsoft", scopes: ["https://graph.microsoft.com/.default"] },
    optionFields: [],
    docsUrl: "https://learn.microsoft.com/en-us/graph/auth-v2-user",
  },
  {
    id: "google_workspace",
    name: "Google Workspace",
    category: "Productivity & Identity",
    description: "Access Google APIs with an OAuth2 access token (userinfo or Workspace admin scopes).",
    authMode: "oauth2_bearer",
    oauthRedirect: { provider: "google", scopes: ["openid", "email", "profile"] },
    optionFields: [],
    docsUrl: "https://developers.google.com/identity/protocols/oauth2",
  },
  {
    id: "salesforce_rest",
    name: "Salesforce (REST API)",
    category: "CRM & Sales",
    description: "Salesforce REST API using a connected-app OAuth2 access token and your My Domain instance URL.",
    authMode: "oauth2_bearer",
    optionFields: [
      {
        key: "salesforceInstanceUrl",
        label: "Instance URL",
        placeholder: "https://your-domain.my.salesforce.com",
        required: true,
      },
    ],
    docsUrl: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm",
  },
  {
    id: "hubspot_private_app",
    name: "HubSpot (private app)",
    category: "CRM & Sales",
    description: "HubSpot CRM using a private app access token (Bearer).",
    authMode: "api_key",
    optionFields: [],
    docsUrl: "https://developers.hubspot.com/docs/api/private-apps",
  },
  {
    id: "slack_web",
    name: "Slack",
    category: "Collaboration",
    description: "Slack Web API using a bot token (xoxb-…). Tests with auth.test.",
    authMode: "api_key",
    optionFields: [],
    docsUrl: "https://api.slack.com/authentication/token-types",
  },
  {
    id: "jira_cloud",
    name: "Atlassian Jira Cloud",
    category: "IT & Delivery",
    description: "Jira Cloud REST API using email + API token (HTTP Basic).",
    authMode: "basic",
    optionFields: [
      {
        key: "jiraSiteUrl",
        label: "Jira site",
        placeholder: "your-company.atlassian.net",
        required: true,
      },
    ],
    docsUrl: "https://developer.atlassian.com/cloud/jira/platform/rest/v3/",
  },
  {
    id: "servicenow_basic",
    name: "ServiceNow",
    category: "IT & Delivery",
    description: "ServiceNow Table API using instance URL + integration user (Basic).",
    authMode: "basic",
    optionFields: [
      {
        key: "servicenowInstanceUrl",
        label: "Instance URL",
        placeholder: "https://your-instance.service-now.com",
        required: true,
      },
    ],
    docsUrl: "https://developer.servicenow.com/dev.do#!/reference/api/rome/rest/c_TableAPI",
  },
  {
    id: "okta_api",
    name: "Okta",
    category: "Security & IAM",
    description: "Okta Management APIs using an API token (SSWS) and your Okta org domain.",
    authMode: "api_key",
    optionFields: [
      {
        key: "oktaDomain",
        label: "Okta domain",
        placeholder: "dev-12345.okta.com",
        required: true,
      },
    ],
    docsUrl: "https://developer.okta.com/docs/reference/core-okta-api/",
  },
  {
    id: "lrs_xapi_basic",
    name: "xAPI LRS (endpoint + key + secret)",
    category: "Learning",
    description:
      "xAPI 1.0.x LRS over HTTPS with HTTP Basic auth—matches SCORM Cloud and other vendors that issue an LRS endpoint URL plus a Key and Secret (Key = Basic username, Secret = Basic password). Used for sending and receiving statements on demand; there is no scheduled sync or cron.",
    authMode: "basic",
    optionFields: [
      {
        key: "lrsBaseUrl",
        label: "LRS endpoint",
        placeholder: "https://cloud.scorm.com/…/xAPI (your tenant’s xAPI base URL)",
        required: true,
      },
    ],
    docsUrl: "https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md",
  },
  {
    id: "http_api_key",
    name: "Custom HTTP (Bearer + health URL)",
    category: "Advanced",
    description: "Generic integration: Bearer token and any GET URL you control for connectivity checks.",
    authMode: "api_key",
    optionFields: [
      {
        key: "healthUrl",
        label: "Health / probe URL",
        placeholder: "https://api.vendor.com/v1/health",
        required: true,
      },
    ],
  },
];
