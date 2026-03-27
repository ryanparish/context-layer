export function extractXapiIndexFields(statement: any) {
  const actorMbox =
    typeof statement?.actor?.mbox === "string" ? statement.actor.mbox : null;
  const verbId = typeof statement?.verb?.id === "string" ? statement.verb.id : null;
  const objectId =
    typeof statement?.object?.id === "string" ? statement.object.id : null;

  const occurredAtRaw =
    typeof statement?.timestamp === "string"
      ? statement.timestamp
      : typeof statement?.stored === "string"
        ? statement.stored
        : null;

  const occurredAt = occurredAtRaw ? new Date(occurredAtRaw) : null;
  const occurredAtValid = occurredAt && !Number.isNaN(occurredAt.getTime()) ? occurredAt : null;

  return { actorMbox, verbId, objectId, occurredAt: occurredAtValid };
}

