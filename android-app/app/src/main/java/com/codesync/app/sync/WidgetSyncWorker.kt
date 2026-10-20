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
import com.codesync.app.widgets.dailymission.DailyMissionWidgetProvider
import com.codesync.app.widgets.groupfocus.GroupFocusWidgetProvider
import com.codesync.app.widgets.leaderboard.GroupLeaderboardWidgetProvider
import com.codesync.app.widgets.quickadd.QuickAddWidgetProvider
import com.codesync.app.widgets.quicksolve.QuickSolveWidgetProvider
import com.codesync.app.widgets.randomchallenge.RandomChallengeWidgetProvider
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
        }

        fun enqueueImmediateSync(context: Context) {
            val oneTimeWork = OneTimeWorkRequestBuilder<WidgetSyncWorker>()
                .build()
            WorkManager.getInstance(context).enqueue(oneTimeWork)
            // Also notify immediately in case worker takes a few ms
            notifyAllWidgets(context)
        }

        fun notifyAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)

            // Update Quick Solve
            val qsComp = ComponentName(context, QuickSolveWidgetProvider::class.java)
            val qsIds = appWidgetManager.getAppWidgetIds(qsComp)
            if (qsIds.isNotEmpty()) {
                val intent = Intent(context, QuickSolveWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, qsIds)
                }
                context.sendBroadcast(intent)
            }

            // Update Quick Add
            val qaComp = ComponentName(context, QuickAddWidgetProvider::class.java)
            val qaIds = appWidgetManager.getAppWidgetIds(qaComp)
            if (qaIds.isNotEmpty()) {
                val intent = Intent(context, QuickAddWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, qaIds)
                }
                context.sendBroadcast(intent)
            }

            // Update Group Focus
            val gfComp = ComponentName(context, GroupFocusWidgetProvider::class.java)
            val gfIds = appWidgetManager.getAppWidgetIds(gfComp)
            if (gfIds.isNotEmpty()) {
                val intent = Intent(context, GroupFocusWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, gfIds)
                }
                context.sendBroadcast(intent)
            }

            // Update Daily Mission
            val dmComp = ComponentName(context, DailyMissionWidgetProvider::class.java)
            val dmIds = appWidgetManager.getAppWidgetIds(dmComp)
            if (dmIds.isNotEmpty()) {
                val intent = Intent(context, DailyMissionWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, dmIds)
                }
                context.sendBroadcast(intent)
            }

            // Update Random Challenge
            val rcComp = ComponentName(context, RandomChallengeWidgetProvider::class.java)
            val rcIds = appWidgetManager.getAppWidgetIds(rcComp)
            if (rcIds.isNotEmpty()) {
                val intent = Intent(context, RandomChallengeWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, rcIds)
                }
                context.sendBroadcast(intent)
            }

            // Update Leaderboard
            val lbComp = ComponentName(context, GroupLeaderboardWidgetProvider::class.java)
            val lbIds = appWidgetManager.getAppWidgetIds(lbComp)
            if (lbIds.isNotEmpty()) {
                val intent = Intent(context, GroupLeaderboardWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, lbIds)
                }
                context.sendBroadcast(intent)
            }
        }
    }
}
