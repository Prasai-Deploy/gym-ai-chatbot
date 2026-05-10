/**
 * services/activity.service.ts
 * Logic for tracking user actions and generating the Recent Activity feed.
 */
import pool from "../db.js";
/**
 * Creates a new activity log entry.
 */
export async function createActivity(userId, type, title, description, metadata) {
    const [result] = await pool.execute(`INSERT INTO activity_logs (user_id, activity_type, activity_title, activity_description, metadata_json)
     VALUES (?, ?, ?, ?, ?)`, [userId, type, title, description || null, metadata ? JSON.stringify(metadata) : null]);
    const activityId = result.insertId;
    // Update tracking state
    await pool.execute(`INSERT INTO activity_tracking_state (user_id, latest_activity_id, unread_activity_count)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE 
       latest_activity_id = VALUES(latest_activity_id),
       unread_activity_count = unread_activity_count + 1`, [userId, activityId]);
    return activityId;
}
/**
 * Fetches the most recent activities for a user.
 */
export async function getRecentActivities(userId, limit = 15, offset = 0) {
    const [rows] = await pool.execute(`SELECT * FROM activity_logs 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`, [userId, limit, offset]);
    return rows;
}
/**
 * Marks all activities as read for a user.
 */
export async function markActivitiesAsRead(userId) {
    await pool.execute("UPDATE activity_tracking_state SET unread_activity_count = 0 WHERE user_id = ?", [userId]);
}
/**
 * Deletes an activity log.
 */
export async function deleteActivity(userId, activityId) {
    await pool.execute("DELETE FROM activity_logs WHERE id = ? AND user_id = ?", [activityId, userId]);
}
