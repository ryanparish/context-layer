export type XapiVerbRegistryItem = {
  iri: string;
  display: string;
  description: string;
};

// Common approved verbs (seeded from Tin Can/xAPI ecosystem references).
export const defaultXapiVerbRegistry: XapiVerbRegistryItem[] = [
  { iri: "http://adlnet.gov/expapi/verbs/experienced", display: "experienced", description: "Indicates that the actor experienced the object." },
  { iri: "http://adlnet.gov/expapi/verbs/completed", display: "completed", description: "Indicates that the actor completed the object." },
  { iri: "http://adlnet.gov/expapi/verbs/attempted", display: "attempted", description: "Indicates that the actor attempted the object." },
  { iri: "http://adlnet.gov/expapi/verbs/passed", display: "passed", description: "Indicates that the actor passed the object." },
  { iri: "http://adlnet.gov/expapi/verbs/failed", display: "failed", description: "Indicates that the actor failed the object." },
  { iri: "http://adlnet.gov/expapi/verbs/answered", display: "answered", description: "Indicates that the actor answered a question object." },
  { iri: "http://adlnet.gov/expapi/verbs/interacted", display: "interacted", description: "Indicates that the actor interacted with the object." },
  { iri: "http://adlnet.gov/expapi/verbs/progressed", display: "progressed", description: "Indicates that the actor progressed in the object." },
  { iri: "http://adlnet.gov/expapi/verbs/initialized", display: "initialized", description: "Indicates that the actor initialized the object." },
  { iri: "http://adlnet.gov/expapi/verbs/terminated", display: "terminated", description: "Indicates that the actor terminated engagement with the object." },
  { iri: "http://adlnet.gov/expapi/verbs/launched", display: "launched", description: "Indicates that the actor launched the object." },
  { iri: "http://adlnet.gov/expapi/verbs/suspended", display: "suspended", description: "Indicates that the actor suspended interaction with the object." },
  { iri: "http://adlnet.gov/expapi/verbs/resumed", display: "resumed", description: "Indicates that the actor resumed interaction with the object." },
  { iri: "http://adlnet.gov/expapi/verbs/scored", display: "scored", description: "Indicates that the actor scored the object." },
  { iri: "http://adlnet.gov/expapi/verbs/voided", display: "voided", description: "Indicates that the actor voided a statement." },

  // Activity Streams / social-style verbs that are commonly reused.
  { iri: "http://activitystrea.ms/schema/1.0/acknowledge", display: "acknowledged", description: "Indicates that the actor has acknowledged the object. This effectively signals that the actor is aware of the object's existence." },
  { iri: "http://activitystrea.ms/schema/1.0/like", display: "liked", description: "Indicates that the actor likes the object." },
  { iri: "http://activitystrea.ms/schema/1.0/dislike", display: "disliked", description: "Indicates that the actor dislikes the object." },
  { iri: "http://activitystrea.ms/schema/1.0/favorite", display: "favorited", description: "Indicates that the actor marked the object as a favorite." },
  { iri: "http://activitystrea.ms/schema/1.0/share", display: "shared", description: "Indicates that the actor shared the object." },
  { iri: "http://activitystrea.ms/schema/1.0/comment", display: "commented", description: "Indicates that the actor commented on the object." },
  { iri: "http://activitystrea.ms/schema/1.0/submit", display: "submitted", description: "Indicates that the actor submitted the object." },
  { iri: "http://activitystrea.ms/schema/1.0/approve", display: "approved", description: "Indicates that the actor approved the object." },
  { iri: "http://activitystrea.ms/schema/1.0/reject", display: "rejected", description: "Indicates that the actor rejected the object." },
  { iri: "http://activitystrea.ms/schema/1.0/complete", display: "completed (AS)", description: "Indicates that the actor completed the object (Activity Streams verb)." },
  { iri: "http://activitystrea.ms/schema/1.0/create", display: "created", description: "Indicates that the actor created the object." },
  { iri: "http://activitystrea.ms/schema/1.0/update", display: "updated", description: "Indicates that the actor updated the object." },
  { iri: "http://activitystrea.ms/schema/1.0/delete", display: "deleted", description: "Indicates that the actor deleted the object." },
  { iri: "http://activitystrea.ms/schema/1.0/archive", display: "archived", description: "Indicates that the actor archived the object." },
  { iri: "http://activitystrea.ms/schema/1.0/unarchive", display: "unarchived", description: "Indicates that the actor unarchived the object." },
  { iri: "http://activitystrea.ms/schema/1.0/assign", display: "assigned", description: "Indicates that the actor assigned the object to someone." },
  { iri: "http://activitystrea.ms/schema/1.0/unassign", display: "unassigned", description: "Indicates that the actor unassigned the object." },
  { iri: "http://activitystrea.ms/schema/1.0/start", display: "started", description: "Indicates that the actor started the object." },
  { iri: "http://activitystrea.ms/schema/1.0/finish", display: "finished", description: "Indicates that the actor finished the object." },
  { iri: "http://activitystrea.ms/schema/1.0/open", display: "opened", description: "Indicates that the actor opened the object." },
  { iri: "http://activitystrea.ms/schema/1.0/close", display: "closed", description: "Indicates that the actor closed the object." },
  { iri: "http://activitystrea.ms/schema/1.0/resolve", display: "resolved", description: "Indicates that the actor resolved the object." },
  { iri: "http://activitystrea.ms/schema/1.0/flag-as-inappropriate", display: "flagged", description: "Indicates that the actor flagged the object as inappropriate." },
  { iri: "http://activitystrea.ms/schema/1.0/read", display: "read", description: "Indicates that the actor read the object." },
  { iri: "http://activitystrea.ms/schema/1.0/view", display: "viewed", description: "Indicates that the actor viewed the object." },
  { iri: "http://activitystrea.ms/schema/1.0/watch", display: "watched", description: "Indicates that the actor watched the object." },
  { iri: "http://activitystrea.ms/schema/1.0/listen", display: "listened", description: "Indicates that the actor listened to the object." },
  { iri: "http://activitystrea.ms/schema/1.0/download", display: "downloaded", description: "Indicates that the actor downloaded the object." },
  { iri: "http://activitystrea.ms/schema/1.0/upload", display: "uploaded", description: "Indicates that the actor uploaded the object." },
  {
    iri: "http://activitystrea.ms/schema/1.0/join",
    display: "joined",
    description: "Indicates that the actor joined the object (e.g., group, course, channel).",
  },
  { iri: "http://activitystrea.ms/schema/1.0/leave", display: "left", description: "Indicates that the actor left the object (e.g., group, course, channel)." },
  { iri: "http://activitystrea.ms/schema/1.0/follow", display: "followed", description: "Indicates that the actor followed the object." },
  { iri: "http://activitystrea.ms/schema/1.0/unfollow", display: "unfollowed", description: "Indicates that the actor unfollowed the object." },
];

