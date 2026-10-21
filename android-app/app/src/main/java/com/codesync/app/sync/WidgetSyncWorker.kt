package com.codesync.app.sync

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.codesync.app.widgets.groupfocus.GroupFocusWidgetProvider
import com.codesync.app.widgets.quickadd.QuickAddWidgetProvider
import java.util.concurrent.TimeUnit

class WidgetSyncWorker(
    private val context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        notifyAllWidgets(context)
        return Result.success()
    }

    companion object {
        private const val PERIODIC_WORK_TAG = "codesync_widget_periodic_sync"

        fun schedulePeriodicSync(context: Context) {
            try {
                val constraints = Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()

                // WorkManager minimum periodic interval is 15 minutes
                val workRequest = PeriodicWorkRequestBuilder<WidgetSyncWorker>(15, TimeUnit.MINUTES)
                    .setConstraints(constraints)
                    .build()

                WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                    PERIODIC_WORK_TAG,
                    ExistingPeriodicWorkPolicy.KEEP,
                    workRequest
                )
            } catch (e: Throwable) {
                android.util.Log.w("WidgetSyncWorker", "schedulePeriodicSync warning: ${e.message}")
            }
        }

        fun enqueueImmediateSync(context: Context) {
            try {
                val oneTimeWork = OneTimeWorkRequestBuilder<WidgetSyncWorker>()
                    .build()
                WorkManager.getInstance(context).enqueue(oneTimeWork)
            } catch (e: Throwable) {
                android.util.Log.w("WidgetSyncWorker", "enqueueImmediateSync warning: ${e.message}")
            }
            // Also notify immediately in case worker takes a few ms
            try {
                notifyAllWidgets(context)
            } catch (e: Throwable) {
                android.util.Log.w("WidgetSyncWorker", "notifyAllWidgets warning: ${e.message}")
            }
        }

        fun notifyAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)

            // Update Quick Add Widget
            val qaComp = ComponentName(context, QuickAddWidgetProvider::class.java)
            val qaIds = appWidgetManager.getAppWidgetIds(qaComp)
            if (qaIds.isNotEmpty()) {
                val intent = Intent(context, QuickAddWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, qaIds)
                }
                context.sendBroadcast(intent)
            }

            // Update Group Focus Widget
            val gfComp = ComponentName(context, GroupFocusWidgetProvider::class.java)
            val gfIds = appWidgetManager.getAppWidgetIds(gfComp)
            if (gfIds.isNotEmpty()) {
                val intent = Intent(context, GroupFocusWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, gfIds)
                }
                context.sendBroadcast(intent)
            }
        }
    }
}
