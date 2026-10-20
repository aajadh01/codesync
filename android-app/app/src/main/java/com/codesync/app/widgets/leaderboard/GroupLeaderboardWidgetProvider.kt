package com.codesync.app.widgets.leaderboard

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import com.codesync.app.MainActivity
import com.codesync.app.R
import com.codesync.app.auth.AuthStorage

class GroupLeaderboardWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_REFRESH = "com.codesync.app.leaderboard.ACTION_REFRESH"
        const val ACTION_ITEM_CLICK = "com.codesync.app.leaderboard.ACTION_ITEM_CLICK"

        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
        val views = RemoteViews(context.packageName, R.layout.widget_group_leaderboard)

        val listName = AuthStorage.getWidgetListName(context, appWidgetId) ?: "Leaderboard"
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

        // Set up RemoteViewsService Adapter for ListView
        val serviceIntent = Intent(context, GroupLeaderboardService::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            data = Uri.parse("codesync://widget/leaderboard/$appWidgetId")
        }
        views.setRemoteAdapter(R.id.lv_rankings, serviceIntent)
        views.setEmptyView(R.id.lv_rankings, R.id.tv_empty)

        // PendingIntent template for ListView item clicks
        val itemClickIntent = Intent(context, GroupLeaderboardWidgetProvider::class.java).apply {
            action = ACTION_ITEM_CLICK
        }
        val itemClickPi = PendingIntent.getBroadcast(
            context,
            appWidgetId,
            itemClickIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        views.setPendingIntentTemplate(R.id.lv_rankings, itemClickPi)

        // Refresh Action
        val refreshIntent = Intent(context, GroupLeaderboardWidgetProvider::class.java).apply {
            action = ACTION_REFRESH
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        val refreshPi = PendingIntent.getBroadcast(
            context,
            appWidgetId + 16000,
            refreshIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_refresh, refreshPi)

        // View Full Leaderboard in app Action
        val fullLbIntent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val fullLbPi = PendingIntent.getActivity(
            context,
            appWidgetId + 17000,
            fullLbIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_full_leaderboard, fullLbPi)

        // Config Action
        val configIntent = Intent(context, GroupLeaderboardConfigureActivity::class.java).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        val configPi = PendingIntent.getActivity(
            context,
            appWidgetId + 18000,
            configIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.btn_config, configPi)

        appWidgetManager.updateAppWidget(appWidgetId, views)
        appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_rankings)
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
            ACTION_REFRESH -> {
                val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    val appWidgetManager = AppWidgetManager.getInstance(context)
                    appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_rankings)
                    updateAppWidget(context, appWidgetManager, appWidgetId)
                }
            }

            ACTION_ITEM_CLICK -> {
                val openIntent = Intent(context, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                }
                context.startActivity(openIntent)
            }
        }
    }
}
