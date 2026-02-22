export type ActivityLogEntry = {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor_id: string | null;
  target_user_id: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: { full_name: string | null } | null;
  target_user: { full_name: string | null } | null;
};
