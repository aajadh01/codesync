package com.codesync.app.widgets.quickadd

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import com.codesync.app.R
import com.codesync.app.auth.AuthStorage

class QuickAddWidgetProvider : AppWidgetProvider() {

    companion object {
        fun updateAppWidget(
            context: Context,
            appWidgetManager: AppWidgetManager,
            appWidgetId: Int
        ) {
            val views = RemoteViews(context.packageName, R.layout.widget_quick_add)

            val listId = AuthStorage.getWidgetListId(context, appWidgetId)
            val listName = AuthStorage.getWidgetListName(context, appWidgetId) ?: "Select List"
            views.setTextViewText(R.id.tv_target_list, listName)

            // Add action PendingIntent -> Opens QuickAddActivity
            val addIntent = Intent(context, QuickAddActivity::class.java).apply {
                putExtra("EXTRA_TARGET_LIST_ID", listId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            val addPi = PendingIntent.getActivity(
                context,
                appWidgetId,
                addIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_add_action, addPi)
            views.setOnClickPendingIntent(R.id.tv_target_list, addPi)

            // Config button -> Opens QuickAddConfigureActivity
            val configIntent = Intent(context, QuickAddConfigureActivity::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            val configPi = PendingIntent.getActivity(
                context,
                appWidgetId + 3000,
                configIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.btn_config, configPi)

            appWidgetManager.updateAppWidget(appWidgetId, views)
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
}
