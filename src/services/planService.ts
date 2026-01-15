import { getSupabaseClient } from "../lib/supabaseClient";
import type { DatePlan, PlanInvite, PlanInviteStatus, PlanStatus } from "../types";

type PlanInput = {
  dateType: string;
  startTime: Date;
  endTime: Date;
  areaLabel: string;
  vibeTags?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  notes?: string;
  status?: PlanStatus;
};

const mapPlan = (row: any): DatePlan => ({
  id: row.id,
  creatorId: row.creator_id,
  status: row.status,
  dateType: row.date_type,
  startTime: row.start_time,
  endTime: row.end_time,
  areaLabel: row.area_label,
  vibeTags: row.vibe_tags ?? null,
  budgetMin: row.budget_min ?? null,
  budgetMax: row.budget_max ?? null,
  notes: row.notes ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const mapInvite = (row: any): PlanInvite => ({
  id: row.id,
  planId: row.plan_id,
  fromUserId: row.from_user_id,
  toUserId: row.to_user_id,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const fetchProfilesMap = async (ids: string[]) => {
  if (!ids.length) {
    return new Map<string, string>();
  }
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", ids);
  if (error) {
    throw error;
  }
  const map = new Map<string, string>();
  (data ?? []).forEach((row) => {
    map.set(row.id, row.display_name ?? "");
  });
  return map;
};

export const fetchPlansForUser = async (userId: string) => {
  const supabase = getSupabaseClient();
  const { data: ownRows, error: ownError } = await supabase
    .from("date_plans")
    .select("*")
    .eq("creator_id", userId)
    .order("start_time", { ascending: true });
  if (ownError) {
    throw ownError;
  }

  const { data: inviteRows, error: inviteError } = await supabase
    .from("plan_invites")
    .select("*")
    .eq("to_user_id", userId)
    .order("created_at", { ascending: false });
  if (inviteError) {
    throw inviteError;
  }

  const invitePlansIds = Array.from(new Set((inviteRows ?? []).map((row) => row.plan_id)));
  let invitedPlans: DatePlan[] = [];
  if (invitePlansIds.length) {
    const { data: planRows, error: planError } = await supabase
      .from("date_plans")
      .select("*")
      .in("id", invitePlansIds);
    if (planError) {
      throw planError;
    }
    invitedPlans = (planRows ?? []).map(mapPlan);
  }

  const creatorIds = Array.from(new Set(invitedPlans.map((plan) => plan.creatorId)));
  const creatorNames = await fetchProfilesMap(creatorIds);

  return {
    ownPlans: (ownRows ?? []).map(mapPlan),
    invitedPlans,
    invites: (inviteRows ?? []).map(mapInvite),
    creatorNames
  };
};

export const fetchPlanById = async (planId: string): Promise<DatePlan | null> => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("date_plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data ? mapPlan(data) : null;
};

export const fetchPlanInvites = async (planId: string) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("plan_invites")
    .select("*")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  const invites = (data ?? []).map(mapInvite);
  const profileIds = Array.from(
    new Set(invites.flatMap((invite) => [invite.fromUserId, invite.toUserId]))
  );
  const profileNames = await fetchProfilesMap(profileIds);
  return { invites, profileNames };
};

export const createPlan = async (userId: string, input: PlanInput): Promise<DatePlan> => {
  const supabase = getSupabaseClient();
  const payload = {
    creator_id: userId,
    status: input.status ?? "published",
    date_type: input.dateType.trim(),
    start_time: input.startTime.toISOString(),
    end_time: input.endTime.toISOString(),
    area_label: input.areaLabel.trim(),
    vibe_tags: input.vibeTags?.length ? input.vibeTags : null,
    budget_min: input.budgetMin ?? null,
    budget_max: input.budgetMax ?? null,
    notes: input.notes?.trim() ?? null
  };

  const { data, error } = await supabase
    .from("date_plans")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    throw error;
  }
  return mapPlan(data);
};

export const updatePlanStatus = async (planId: string, status: PlanStatus) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("date_plans")
    .update({ status })
    .eq("id", planId);
  if (error) {
    throw error;
  }
};

export const sendPlanInvite = async ({
  planId,
  fromUserId,
  toUserId
}: {
  planId: string;
  fromUserId: string;
  toUserId: string;
}) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("plan_invites").insert({
    plan_id: planId,
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: "pending"
  });
  if (error) {
    throw error;
  }
};

export const respondToInvite = async (inviteId: string, status: PlanInviteStatus) => {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("plan_invites")
    .update({ status })
    .eq("id", inviteId);
  if (error) {
    throw error;
  }
};
