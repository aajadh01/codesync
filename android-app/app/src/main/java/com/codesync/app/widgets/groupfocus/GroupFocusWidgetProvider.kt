package com.codesync.app.widgets.groupfocus

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
import com.codesync.app.widgets.quickadd.QuickAddActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class GroupFocusWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_ITEM_CLICK = "com.codesync.app.groupfocus.ACTION_ITEM_CLICK"
        const val ACTION_REFRESH = "com.codesync.app.groupfocus.ACTION_REFRESH"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_group_focus)

        val listId = AuthStorage.getWidgetListId(context, appWidgetId)
        val listName = AuthStorage.getWidgetListName(context, appWidgetId) ?: "Group Focus"
        views.setTextViewText(R.id.tv_group_name, listName)

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

        // Read cached stats for immediate display
        if (listId != null) {
            val cached = AuthStorage.getWidgetCache(context, "gf_$listId")
            if (!cached.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(cached)
                    val solved = obj.optInt("solvedCount", 0)
                    val total = obj.optInt("totalProblems", 0)
                    val pct = obj.optInt("completionPercentage", 0)
                    views.setTextViewText(R.id.tv_progress_stats, "$solved of $total Solved ($pct%)")
                    views.setProgressBar(R.id.pb_completion, 100, pct, false)
                } catch (ignored: Exception) {}
            }
        }

        // Set up RemoteViewsService Adapter for ListView
        val serviceIntent = Intent(context, GroupFocusService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            data = Uri.parse("codesync://widget/groupfocus/$appWidgetId")
        }
        views.setRemoteAdapter(R.id.lv_pending_problems, serviceIntent)
        views.setEmptyView(R.id.lv_pending_problems, R.id.tv_empty)

        // PendingIntent template for ListView item clicks
        val itemClickIntent = Intent(context, GroupFocusWidgetProvider::class.java).apply {
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
        views.setPendingIntentTemplate(R.id.lv_pending_problems, itemClickPi)

        // Refresh Action
        val refreshIntent = Intent(context, GroupFocusWidgetProvider::class.java).apply {
            action = ACTION_REFRESH
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        val refreshPi = PendingIntent.getBroadcast(
            context,
            appWidgetId + 4000,
            refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPi)

        // Quick Add Action
        val addIntent = Intent(context, QuickAddActivity::class.java).apply {
            putExtra("EXTRA_TARGET_LIST_ID", listId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val addPi = PendingIntent.getActivity(
            context,
            appWidgetId + 5000,
            addIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_quick_add, addPi)

        // Open List Action
        val openListIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val openListPi = PendingIntent.getActivity(
            context,
            appWidgetId + 6000,
            openListIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_open_list, openListPi)

        // Config Action
        val configIntent = Intent(context, GroupFocusConfigureActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val configPi = PendingIntent.getActivity(
            context,
            appWidgetId + 7000,
            configIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_config, configPi)

        appWidgetManager.updateAppWidget(appWidgetId, views)
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_pending_problems)
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
                                        val appWidgetManager = AppWidgetManager.getInstance(context)
                                        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                                            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_pending_problems)
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
                    appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_pending_problems)
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }
        }
    }
}
