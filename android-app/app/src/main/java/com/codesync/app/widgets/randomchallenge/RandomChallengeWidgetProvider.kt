package com.codesync.app.widgets.randomchallenge

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

class RandomChallengeWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_NEXT = "com.codesync.app.randomchallenge.ACTION_NEXT"
        const val ACTION_OPEN_URL = "com.codesync.app.randomchallenge.ACTION_OPEN_URL"
        const val ACTION_MARK_SOLVED = "com.codesync.app.randomchallenge.ACTION_MARK_SOLVED"
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, fetchNext = false)
        }
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            AuthStorage.removeWidgetConfig(context, id)
        }
        super.onDeleted(context, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)

        when (intent.action) {
            ACTION_NEXT -> {
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    updateAppWidget(context, appWidgetManager, appWidgetId, fetchNext = true)
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

            ACTION_MARK_SOLVED -> {
                val problemId = intent.getStringExtra("EXTRA_PROBLEM_ID")
                if (!problemId.isNullOrEmpty() && !problemId.startsWith("fallback-")) {
                    CoroutineScope(Dispatchers.IO).launch {
                        val result = ApiClient.toggleProblemSolve(context, problemId)
                        if (result.isSuccess) {
                            CoroutineScope(Dispatchers.Main).launch {
                                Toast.makeText(context, "Challenge solved! 🚀", Toast.LENGTH_SHORT).show()
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
        }
    }

    private fun updateAppWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        fetchNext: Boolean
    ) {
        val views = RemoteViews(context.packageName, R.layout.widget_random_challenge)

        val diff = AuthStorage.getWidgetDifficulty(context, appWidgetId)
        val topic = AuthStorage.getWidgetTopic(context, appWidgetId)
        views.setTextViewText(R.id.tv_active_filters, "Filter: $diff • $topic")

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

        // Next Challenge PendingIntent
        val nextIntent = Intent(context, RandomChallengeWidgetProvider::class.java).apply {
            action = ACTION_NEXT
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        val nextPi = PendingIntent.getBroadcast(
            context,
            appWidgetId + 12000,
            nextIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_next_challenge, nextPi)

        // Config PendingIntent
        val configIntent = Intent(context, RandomChallengeConfigureActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val configPi = PendingIntent.getActivity(
            context,
            appWidgetId + 13000,
            configIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_config_filter, configPi)

        // Load cached challenge if not forced next
        val cached = AuthStorage.getWidgetCache(context, "rc_$appWidgetId")
        if (!cached.isNullOrEmpty() && !fetchNext) {
            bindChallenge(context, views, cached, appWidgetId)
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }

        if (isLoggedIn && (fetchNext || cached.isNullOrEmpty())) {
            CoroutineScope(Dispatchers.IO).launch {
                val result = ApiClient.getRandomChallenge(context, diff, topic)
                if (result.isSuccess) {
                    val p = result.getOrNull()!!
                    val obj = JSONObject().apply {
                        put("id", p.id)
                        put("title", p.title)
                        put("difficulty", p.difficulty)
                        put("url", p.url)
                        put("topic", p.topic)
                        put("isSolved", p.isSolved)
                    }
                    AuthStorage.saveWidgetCache(context, "rc_$appWidgetId", obj.toString())

                    CoroutineScope(Dispatchers.Main).launch {
                        val freshViews = RemoteViews(context.packageName, R.layout.widget_random_challenge)
                        freshViews.setTextViewText(R.id.tv_active_filters, "Filter: $diff • $topic")
                        freshViews.setOnClickPendingIntent(R.id.btn_next_challenge, nextPi)
                        freshViews.setOnClickPendingIntent(R.id.btn_config_filter, configPi)
                        bindChallenge(context, freshViews, obj.toString(), appWidgetId)
                        appWidgetManager.updateAppWidget(appWidgetId, freshViews)
                    }
                }
            }
        }
    }

    private fun bindChallenge(
        context: Context,
        views: RemoteViews,
        jsonStr: String,
        appWidgetId: Int
    ) {
        try {
            val obj = JSONObject(jsonStr)
            val title = obj.getString("title")
            val diff = obj.optString("difficulty", "Medium")
            val topic = obj.optString("topic", "General")
            val url = obj.optString("url", "https://leetcode.com")
            val id = obj.getString("id")
            val isSolved = obj.optBoolean("isSolved", false)

            views.setTextViewText(R.id.tv_challenge_title, title)
            views.setTextViewText(R.id.tv_challenge_diff, diff)
            views.setTextViewText(R.id.tv_challenge_topic, topic)

            when (diff) {
                "Easy" -> {
                    views.setInt(R.id.tv_challenge_diff, "setBackgroundResource", R.drawable.bg_pill_easy)
                    views.setTextColor(R.id.tv_challenge_diff, context.getColor(R.color.diff_easy))
                }
                "Medium" -> {
                    views.setInt(R.id.tv_challenge_diff, "setBackgroundResource", R.drawable.bg_pill_medium)
                    views.setTextColor(R.id.tv_challenge_diff, context.getColor(R.color.diff_medium))
                }
                "Hard" -> {
                    views.setInt(R.id.tv_challenge_diff, "setBackgroundResource", R.drawable.bg_pill_hard)
                    views.setTextColor(R.id.tv_challenge_diff, context.getColor(R.color.diff_hard))
                }
            }

            if (isSolved) {
                views.setViewVisibility(R.id.tv_solved_status, View.VISIBLE)
            } else {
                views.setViewVisibility(R.id.tv_solved_status, View.GONE)
            }

            // Open LeetCode PendingIntent
            val urlIntent = Intent(context, RandomChallengeWidgetProvider::class.java).apply {
                action = ACTION_OPEN_URL
                putExtra("EXTRA_URL", url)
            }
            val urlPi = PendingIntent.getBroadcast(
                context,
                appWidgetId + 14000,
                urlIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_open_leetcode, urlPi)

            // Mark Solved PendingIntent
            val solveIntent = Intent(context, RandomChallengeWidgetProvider::class.java).apply {
                action = ACTION_MARK_SOLVED
                putExtra("EXTRA_PROBLEM_ID", id)
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            val solvePi = PendingIntent.getBroadcast(
                context,
                appWidgetId + 15000,
                solveIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_mark_solved, solvePi)
        } catch (ignored: Exception) {}
    }
}
