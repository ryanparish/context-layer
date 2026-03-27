import { httpApiKeyConnector } from "./httpApiKey";
import { ConnectorAdapter } from "./types";
import { slackWebConnector } from "./slackWeb";
import { microsoftGraphConnector } from "./microsoftGraph";
import { googleWorkspaceConnector } from "./googleWorkspace";
import { salesforceRestConnector } from "./salesforceRest";
import { oktaApiConnector } from "./oktaApi";
import { servicenowBasicConnector } from "./servicenowBasic";
import { jiraCloudConnector } from "./jiraCloud";
import { hubspotPrivateAppConnector } from "./hubspotPrivateApp";
import { lrsXapiBasicConnector } from "./lrsXapiBasic";

const adapters: ConnectorAdapter[] = [
  httpApiKeyConnector,
  slackWebConnector,
  microsoftGraphConnector,
  googleWorkspaceConnector,
  salesforceRestConnector,
  hubspotPrivateAppConnector,
  oktaApiConnector,
  servicenowBasicConnector,
  jiraCloudConnector,
  lrsXapiBasicConnector,
];

export function getConnectorAdapter(type: string) {
  return adapters.find((a) => a.type === type) ?? null;
}

