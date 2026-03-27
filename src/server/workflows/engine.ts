import { prisma } from "@/server/db";
import { getWorkflowQueue } from "@/server/jobs/queue";

type TriggerDefinition = {
  type: "xapi_match";
  actorMbox?: string;
  verbId?: string;
  objectId?: string;
};

type ActionDefinition = {
  type: "webhook";
  url: string;
};

function matches(trigger: TriggerDefinition, stmt: { actorMbox?: string | null; verbId?: string | null; objectId?: string | null }) {
  if (trigger.type !== "xapi_match") return false;
  if (trigger.actorMbox && trigger.actorMbox !== stmt.actorMbox) return false;
  if (trigger.verbId && trigger.verbId !== stmt.verbId) return false;
  if (trigger.objectId && trigger.objectId !== stmt.objectId) return false;
  return true;
}

export async function enqueueWorkflowsForStatement(statementId: string) {
  const statement = await prisma.xapiStatement.findUnique({ where: { id: statementId } });
  if (!statement) return;

  const workflows = await prisma.workflow.findMany({
    where: { tenantId: statement.tenantId, enabled: true },
  });

  for (const wf of workflows) {
    const trigger = wf.trigger as TriggerDefinition;
    if (!matches(trigger, statement)) continue;

    const action = wf.action as ActionDefinition;
    const run = await prisma.workflowRun.create({
      data: {
        tenantId: wf.tenantId,
        workflowId: wf.id,
        status: "QUEUED",
        log: { statementId },
      },
      select: { id: true },
    });

    const queue = getWorkflowQueue();

    if (action.type === "webhook") {
      await queue.add("workflow_action_webhook", {
        kind: "workflow_action_webhook",
        workflowRunId: run.id,
        url: action.url,
        payload: { statementId },
      });
    } else {
      await queue.add("noop", { kind: "noop", workflowRunId: run.id });
    }
  }
}

