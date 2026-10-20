package com.codesync.app.widgets.leaderboard

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.codesync.app.R
import com.codesync.app.api.ApiClient
import com.codesync.app.api.LeaderboardMember
import com.codesync.app.auth.AuthStorage
import org.json.JSONArray
import org.json.JSONObject

class GroupLeaderboardService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return GroupLeaderboardViewsFactory(applicationContext, intent)
    }
}

class GroupLeaderboardViewsFactory(
    private val context: Context,
    intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private val appWidgetId = intent.getIntExtra(
        android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,
        android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID
    )

    private val members = mutableListOf<LeaderboardMember>()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        if (!AuthStorage.isLoggedIn(context)) {
            members.clear()
            return
        }

        var listId = AuthStorage.getWidgetListId(context, appWidgetId)
        if (listId.isNullOrEmpty()) {
            val listsResult = ApiClient.getUserLists(context)
            if (listsResult.isSuccess && listsResult.getOrNull()?.isNotEmpty() == true) {
                val firstList = listsResult.getOrNull()!![0]
                listId = firstList.id
                AuthStorage.setWidgetListId(context, appWidgetId, listId, firstList.name)
            }
        }

        if (listId != null) {
            val result = ApiClient.getListLeaderboard(context, listId)
            if (result.isSuccess) {
                val data = result.getOrNull()!!
                members.clear()
                members.addAll(data.leaderboard)

                // Cache
                try {
                    val arr = JSONArray()
                    for (m in data.leaderboard) {
                        arr.put(
                            JSONObject().apply {
                                put("rank", m.rank)
                                put("userId", m.userId)
                                put("username", m.username)
                                put("avatar", m.avatar)
                                put("totalSolved", m.totalSolved)
                            }
                        )
                    }
                    AuthStorage.saveWidgetCache(context, "lb_$listId", arr.toString())
                } catch (ignored: Exception) {}
            } else {
                // Offline fallback
                val cached = AuthStorage.getWidgetCache(context, "lb_$listId")
                if (!cached.isNullOrEmpty()) {
                    try {
                        val arr = JSONArray(cached)
                        members.clear()
                        for (i in 0 until arr.length()) {
                            val m = arr.getJSONObject(i)
                            members.add(
                                LeaderboardMember(
                                    rank = m.optInt("rank", i + 1),
                                    userId = m.getString("userId"),
                                    username = m.getString("username"),
                                    avatar = m.optString("avatar", "avatar1"),
                                    totalSolved = m.optInt("totalSolved", 0)
                                )
                            )
                        }
                    } catch (ignored: Exception) {}
                }
            }
        }
    }

    override fun onDestroy() {
        members.clear()
    }

    override fun getCount(): Int = members.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_leaderboard_item)
        if (position >= members.size) return views

        val member = members[position]
        views.setTextViewText(R.id.tv_rank, "#${member.rank}")
        views.setTextViewText(R.id.tv_username, member.username)
        views.setTextViewText(R.id.tv_total_solved, "${member.totalSolved} Solved")

        when (member.rank) {
            1 -> {
                views.setInt(R.id.tv_rank, "setBackgroundResource", R.drawable.bg_pill_medium)
                views.setTextColor(R.id.tv_rank, context.getColor(R.color.diff_medium))
            }
            2 -> {
                views.setInt(R.id.tv_rank, "setBackgroundResource", R.drawable.bg_pill_topic)
                views.setTextColor(R.id.tv_rank, context.getColor(R.color.accent_cyan))
            }
            3 -> {
                views.setInt(R.id.tv_rank, "setBackgroundResource", R.drawable.bg_pill_easy)
                views.setTextColor(R.id.tv_rank, context.getColor(R.color.diff_easy))
            }
            else -> {
                views.setInt(R.id.tv_rank, "setBackgroundResource", R.drawable.bg_pill_topic)
                views.setTextColor(R.id.tv_rank, context.getColor(R.color.text_muted))
            }
        }

        // FillInIntent to open full leaderboard
        val fillIn = Intent().apply {
            putExtra("EXTRA_ACTION_TYPE", "VIEW_LEADERBOARD")
        }
        views.setOnClickFillInIntent(R.id.tv_username, fillIn)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false
}
