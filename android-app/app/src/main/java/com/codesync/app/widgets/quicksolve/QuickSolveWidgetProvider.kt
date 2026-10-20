package com.codesync.app.widgets.quicksolve

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

class QuickSolveWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_ITEM_CLICK = "com.codesync.app.quicksolve.ACTION_ITEM_CLICK"
        const val ACTION_REFRESH = "com.codesync.app.quicksolve.ACTION_REFRESH"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_solve)

            val listName = AuthStorage.getWidgetListName(context, appWidgetId) ?: "Quick Solve"
            views.setTextViewText(R.id.tv_widget_title, listName)

            val cachedBadge = AuthStorage.getWidgetCache(context, "qs_stats_$appWidgetId")
            if (!cachedBadge.isNullOrEmpty()) {
                views.setTextViewText(R.id.tv_solved_badge, cachedBadge)
            }

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

            // Set up RemoteViewsService Adapter for ListView with unique URI
            val serviceIntent = Intent(context, QuickSolveService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                data = Uri.parse("codesync://widget/quicksolve/$appWidgetId")
            }
            views.setRemoteAdapter(R.id.lv_problems, serviceIntent)
            views.setEmptyView(R.id.lv_problems, R.id.tv_empty)

            // PendingIntent template for ListView item clicks
            val itemClickIntent = Intent(context, QuickSolveWidgetProvider::class.java).apply {
                action = ACTION_ITEM_CLICK
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                putExtra("EXTRA_APPWIDGET_ID", appWidgetId)
            }
            val itemClickPi = PendingIntent.getBroadcast(
                context,
                appWidgetId,
                itemClickIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )
            views.setPendingIntentTemplate(R.id.lv_problems, itemClickPi)

            // Refresh PendingIntent
            val refreshIntent = Intent(context, QuickSolveWidgetProvider::class.java).apply {
                action = ACTION_REFRESH
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            val refreshPi = PendingIntent.getBroadcast(
                context,
                appWidgetId + 1000,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_refresh, refreshPi)

            // Config PendingIntent to switch list
            val configIntent = Intent(context, QuickSolveConfigureActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val configPi = PendingIntent.getActivity(
                context,
                appWidgetId + 2000,
                configIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_config, configPi)

            appWidgetManager.updateAppWidget(appWidgetId, views)
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_problems)
        }
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

    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        for (id in appWidgetIds) {
            AuthStorage.removeWidgetConfig(context, id)
        }
        super.onDeleted(context, appWidgetIds)
    }

    override fun onReceive(context: Context, intent: Intent) {
        super.onReceive(context, intent)

        when (intent.action) {
            ACTION_ITEM_CLICK -> {
                val actionType = intent.getStringExtra("EXTRA_ACTION_TYPE")
                val appWidgetId = intent.getIntExtra(
                    "EXTRA_APPWIDGET_ID",
                    intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                )

                if (actionType == "TOGGLE_SOLVE") {
                    val problemId = intent.getStringExtra("EXTRA_PROBLEM_ID")
                    if (!problemId.isNullOrEmpty()) {
                        val pendingResult = goAsync()
                        CoroutineScope(Dispatchers.IO).launch {
                            try {
                                val result = ApiClient.toggleProblemSolve(context, problemId)
                                CoroutineScope(Dispatchers.Main).launch {
                                    if (result.isSuccess) {
                                        val solveRes = result.getOrNull()
                                        val msg = if (solveRes?.isSolved == true) "Solved! Keep it up 🚀" else "Marked as unsolved"
                                        Toast.makeText(context, msg, Toast.LENGTH_SHORT).show()

                                        val appWidgetManager = AppWidgetManager.getInstance(context)
                                        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                                            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_problems)
                                            updateAppWidget(context, appWidgetManager, appWidgetId)
                                        }
                                        WidgetSyncWorker.enqueueImmediateSync(context)
                                    } else {
                                        Toast.makeText(
                                            context,
                                            result.exceptionOrNull()?.message ?: "Failed to update",
                                            Toast.LENGTH_SHORT
                                        ).show()
                                    }
                                }
                            } finally {
                                pendingResult.finish()
                            }
                        }
                    }
                } else if (actionType == "OPEN_URL") {
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
            }

            ACTION_REFRESH -> {
                val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_problems)
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }
}
