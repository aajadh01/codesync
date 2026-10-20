package com.codesync.app.widgets.dailymission

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import android.widget.Toast
import com.codesync.app.MainActivity
import com.codesync.app.R
import com.codesync.app.api.ApiClient
import com.codesync.app.auth.AuthStorage
import com.codesync.app.sync.WidgetSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class DailyMissionWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_MARK_SOLVED = "com.codesync.app.dailymission.ACTION_MARK_SOLVED"
        const val ACTION_REFRESH = "com.codesync.app.dailymission.ACTION_REFRESH"
        const val ACTION_OPEN_URL = "com.codesync.app.dailymission.ACTION_OPEN_URL"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_MARK_SOLVED -> {
                val problemId = intent.getStringExtra("EXTRA_PROBLEM_ID")
                if (!problemId.isNullOrEmpty() && !problemId.startsWith("fallback-")) {
                    CoroutineScope(Dispatchers.IO).launch {
                        val result = ApiClient.toggleProblemSolve(context, problemId)
                        if (result.isSuccess) {
                            CoroutineScope(Dispatchers.Main).launch {
                                Toast.makeText(context, "Daily mission problem solved! 🎯", Toast.LENGTH_SHORT).show()
                            }
                            WidgetSyncWorker.enqueueImmediateSync(context)
                        } else {
                            CoroutineScope(Dispatchers.Main).launch {
                                Toast.makeText(
                                    context,
                                    result.exceptionOrNull()?.message ?: "Failed to update",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        }
                    }
                } else if (problemId?.startsWith("fallback-") == true) {
                    Toast.makeText(context, "Completed recommended problem! Great job!", Toast.LENGTH_SHORT).show()
                }
            }

            ACTION_OPEN_URL -> {
                val url = intent.getStringExtra("EXTRA_URL")
                if (!url.isNullOrEmpty()) {
                    try {
                        val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
                            flags = Intent.FLAG_ACTIVITY_NEW_TASK
                        }
                        context.startActivity(browserIntent)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Could not open link", Toast.LENGTH_SHORT).show()
                    }
                }
            }

            ACTION_REFRESH -> {
                val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_daily_mission)

        val isLoggedIn = AuthStorage.isLoggedIn(context)
        if (!isLoggedIn) {
            views.setViewVisibility(R.id.tv_unauth_banner, View.VISIBLE)
            val loginIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val loginPi = PendingIntent.getActivity(
                context,
                appWidgetId,
                loginIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.tv_unauth_banner, loginPi)
        } else {
            views.setViewVisibility(R.id.tv_unauth_banner, View.GONE)
        }

        // Render from cache first for instantaneous rendering
        val cached = AuthStorage.getWidgetCache(context, "daily_mission")
        if (!cached.isNullOrEmpty()) {
            bindCachedData(context, views, cached, appWidgetId)
        }

        // Refresh Action
        val refreshIntent = Intent(context, DailyMissionWidgetProvider::class.java).apply {
            action = ACTION_REFRESH
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        val refreshPi = PendingIntent.getBroadcast(
            context,
            appWidgetId + 8000,
            refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPi)

        // Config Target Action
        val configIntent = Intent(context, DailyMissionConfigureActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val configPi = PendingIntent.getActivity(
            context,
            appWidgetId + 9000,
            configIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_config_target, configPi)

        appWidgetManager.updateAppWidget(appWidgetId, views)

        // Fetch fresh data in background
        if (isLoggedIn) {
            CoroutineScope(Dispatchers.IO).launch {
                val result = ApiClient.getDailyMission(context)
                if (result.isSuccess) {
                    val data = result.getOrNull()!!
                    val json = JSONObject().apply {
                        put("dailyTarget", data.dailyTarget)
                        put("completedToday", data.completedToday)
                        put("progressPercentage", data.progressPercentage)
                        if (data.nextProblem != null) {
                            val pObj = JSONObject().apply {
                                put("id", data.nextProblem.id)
                                put("title", data.nextProblem.title)
                                put("difficulty", data.nextProblem.difficulty)
                                put("url", data.nextProblem.url)
                                put("topic", data.nextProblem.topic)
                            }
                            put("nextProblem", pObj)
                        }
                    }
                    AuthStorage.saveWidgetCache(context, "daily_mission", json.toString())

                    CoroutineScope(Dispatchers.Main).launch {
                        val freshViews = RemoteViews(context.packageName, R.layout.widget_daily_mission)
                        bindCachedData(context, freshViews, json.toString(), appWidgetId)
                        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPi)
                        views.setOnClickPendingIntent(R.id.btn_config_target, configPi)
                        appWidgetManager.updateAppWidget(appWidgetId, freshViews)
                    }
                }
            }
        }
    }

    private fun bindCachedData(
        context: Context,
        views: RemoteViews,
        jsonStr: String,
        appWidgetId: Int
    ) {
        try {
            val json = JSONObject(jsonStr)
            val target = json.optInt("dailyTarget", 3)
            val completed = json.optInt("completedToday", 0)
            val pct = json.optInt("progressPercentage", 0)

            views.setTextViewText(R.id.tv_daily_stats, "$completed / $target Solved Today")
            views.setTextViewText(R.id.tv_daily_percentage, "$pct%")
            views.setProgressBar(R.id.pb_daily, 100, pct, false)

            if (json.has("nextProblem") && !json.isNull("nextProblem")) {
                val p = json.getJSONObject("nextProblem")
                val title = p.getString("title")
                val diff = p.optString("difficulty", "Medium")
                val topic = p.optString("topic", "General")
                val url = p.optString("url", "https://leetcode.com")
                val id = p.getString("id")

                views.setTextViewText(R.id.tv_next_title, title)
                views.setTextViewText(R.id.tv_next_diff, diff)
                views.setTextViewText(R.id.tv_next_topic, topic)

                when (diff) {
                    "Easy" -> {
                        views.setInt(R.id.tv_next_diff, "setBackgroundResource", R.drawable.bg_pill_easy)
                        views.setTextColor(R.id.tv_next_diff, context.getColor(R.color.diff_easy))
                    }
                    "Medium" -> {
                        views.setInt(R.id.tv_next_diff, "setBackgroundResource", R.drawable.bg_pill_medium)
                        views.setTextColor(R.id.tv_next_diff, context.getColor(R.color.diff_medium))
                    }
                    "Hard" -> {
                        views.setInt(R.id.tv_next_diff, "setBackgroundResource", R.drawable.bg_pill_hard)
                        views.setTextColor(R.id.tv_next_diff, context.getColor(R.color.diff_hard))
                    }
                }

                // Open LeetCode button
                val urlIntent = Intent(context, DailyMissionWidgetProvider::class.java).apply {
                    action = ACTION_OPEN_URL
                    putExtra("EXTRA_URL", url)
                }
                val urlPi = PendingIntent.getBroadcast(
                    context,
                    appWidgetId + 10000,
                    urlIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.btn_solve_leetcode, urlPi)

                // Mark Solved button
                val solveIntent = Intent(context, DailyMissionWidgetProvider::class.java).apply {
                    action = ACTION_MARK_SOLVED
                    putExtra("EXTRA_PROBLEM_ID", id)
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                }
                val solvePi = PendingIntent.getBroadcast(
                    context,
                    appWidgetId + 11000,
                    solveIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                views.setOnClickPendingIntent(R.id.btn_mark_solved, solvePi)
            }
        } catch (ignored: Exception) {}
    }
}
