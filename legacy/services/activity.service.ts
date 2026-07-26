/**
 * services/activity.service.ts
 * Activity feed tracking via Supabase client.
 */
import supabase from "../db.js";

export async function createActivity(
  userId: number,
  type: string,
  title: string,
  description?: string,
  metadata?: any
) {
  const { data } = await supabase
    .from("activity_logs")
    .insert({
      user_id: userId,
      activity_type: type,
      activity_title: title,
      activity_description: description || null,
      metadata_json: metadata ? JSON.stringify(metadata) : null,
    })
    .select("id")
    .single();
  const activityId = data?.id;

  const { data: existing } = await supabase
    .from("activity_tracking_state")
    .select("unread_activity_count")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    await supabase.from("activity_tracking_state").update({
      latest_activity_id: activityId,
      unread_activity_count: (existing.unread_activity_count || 0) + 1,
    }).eq("user_id", userId);
  } else {
    await supabase.from("activity_tracking_state").insert({
      user_id: userId,
      latest_activity_id: activityId,
      unread_activity_count: 1,
    });
  }
  return activityId;
}

export async function getRecentActivities(userId: number, limit = 15, offset = 0) {
  const { data } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  return data || [];
}

export async function markActivitiesAsRead(userId: number) {
  await supabase
    .from("activity_tracking_state")
    .update({ unread_activity_count: 0 })
    .eq("user_id", userId);
}

export async function deleteActivity(userId: number, activityId: number) {
  await supabase
    .from("activity_logs")
    .delete()
    .eq("id", activityId)
    .eq("user_id", userId);
}
