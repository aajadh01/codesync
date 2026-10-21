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
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap

class GroupFocusWidgetProvider : AppWidgetProvider() {

    companion object {
        const val ACTION_ITEM_CLICK = "com.codesync.app.groupfocus.ACTION_ITEM_CLICK"
        const val ACTION_REFRESH = "com.codesync.app.groupfocus.ACTION_REFRESH"

        // Deduplication set to prevent concurrent double-mutations on the same problem
        private val inFlightMutations = ConcurrentHashMap.newKeySet<String>()

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
                    putExtra("target_path", "/auth")
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

            // Immediately apply cached stats if available
            var cachedTotal = 0
            var cachedSolved = 0
            if (listId != null) {
                val cached = AuthStorage.getWidgetCache(context, "gf_$listId")
                if (!cached.isNullOrEmpty()) {
                    try {
                        val obj = JSONObject(cached)
                        cachedSolved = obj.optInt("solvedCount", 0)
                        cachedTotal = obj.optInt("totalProblems", 0)
                        val pct = obj.optInt("completionPercentage", 0)
                        views.setTextViewText(R.id.tv_progress_stats, "$cachedSolved of $cachedTotal Solved ($pct%)")
                        views.setProgressBar(R.id.pb_completion, 100, pct, false)
                    } catch (ignored: Exception) {}
                }
            }

            // Set empty view text dynamically based on state
            if (!isLoggedIn) {
                views.setTextViewText(R.id.tv_empty, context.getString(R.string.widget_not_logged_in))
            } else if (listId.isNullOrEmpty()) {
                views.setTextViewText(R.id.tv_empty, "Tap the target icon above to select a study group")
            } else if (cachedTotal > 0 && cachedSolved >= cachedTotal) {
                views.setTextViewText(R.id.tv_empty, "All problems solved in this group! 🎉")
            } else if (cachedTotal == 0 && listId != null) {
                views.setTextViewText(R.id.tv_empty, "No problems in this group yet. Tap + Add!")
            } else {
                views.setTextViewText(R.id.tv_empty, "Loading pending problems...")
            }

            // Set up RemoteViewsService Adapter for ListView with unique URI
            val serviceIntent = Intent(context, GroupFocusService::class.java).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                this.data = Uri.parse("codesync://widget/groupfocus/$appWidgetId")
            }
            views.setRemoteAdapter(R.id.lv_pending_problems, serviceIntent)
            views.setEmptyView(R.id.lv_pending_problems, R.id.tv_empty)

            // PendingIntent template for ListView item clicks with unique instance URI to prevent collisions
            val itemClickIntent = Intent(context, GroupFocusWidgetProvider::class.java).apply {
                action = ACTION_ITEM_CLICK
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                putExtra("EXTRA_APPWIDGET_ID", appWidgetId)
                this.data = Uri.parse("codesync://widget/itemclick/$appWidgetId")
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
                data = Uri.parse("codesync://widget/refresh/$appWidgetId")
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
                if (!listId.isNullOrEmpty()) {
                    putExtra("target_path", "/lists/$listId")
                } else {
                    putExtra("target_path", "/lists")
                }
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

        // Asynchronously fetch fresh data from server, cache it, and push updates immediately
        fun fetchAndUpdateWidget(
            context: Context,
            appWidgetId: Int,
            onComplete: (() -> Unit)? = null
        ) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            // 1. Immediately render current/cached view
            updateAppWidget(context, appWidgetManager, appWidgetId)

            if (!AuthStorage.isLoggedIn(context)) {
                onComplete?.invoke()
                return
            }

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    var listId = AuthStorage.getWidgetListId(context, appWidgetId)
                    var listName = AuthStorage.getWidgetListName(context, appWidgetId)

                    // If no list assigned, discover user's first list automatically
                    if (listId.isNullOrEmpty()) {
                        val listsResult = ApiClient.getUserLists(context)
                        if (listsResult.isSuccess && listsResult.getOrNull()?.isNotEmpty() == true) {
                            val firstList = listsResult.getOrNull()!![0]
                            listId = firstList.id
                            listName = firstList.name
                            AuthStorage.setWidgetListId(context, appWidgetId, listId, listName)
                        }
                    }

                    if (listId != null) {
                        val detailResult = ApiClient.getListDetails(context, listId)
                        if (detailResult.isSuccess) {
                            val listDetails = detailResult.getOrNull()!!
                            listName = listDetails.name
                            AuthStorage.setWidgetListId(context, appWidgetId, listId, listName)

                            // Save full cache
                            val obj = JSONObject().apply {
                                put("totalProblems", listDetails.totalProblems)
                                put("solvedCount", listDetails.solvedCount)
                                put("completionPercentage", listDetails.completionPercentage)
                                val arr = JSONArray()
                                for (p in listDetails.problems) {
                                    arr.put(
                                        JSONObject().apply {
                                            put("id", p.id)
                                            put("title", p.title)
                                            put("difficulty", p.difficulty)
                                            put("url", p.url)
                                            put("topic", p.topic)
                                            put("isSolved", p.isSolved)
                                        }
                                    )
                                }
                                put("problems", arr)
                            }
                            AuthStorage.saveWidgetCache(context, "gf_$listId", obj.toString())

                            // Push updated view on Main thread
                            withContext(Dispatchers.Main) {
                                val views = RemoteViews(context.packageName, R.layout.widget_group_focus)
                                views.setTextViewText(R.id.tv_group_name, listName)
                                views.setTextViewText(
                                    R.id.tv_progress_stats,
                                    "${listDetails.solvedCount} of ${listDetails.totalProblems} Solved (${listDetails.completionPercentage}%)"
                                )
                                views.setProgressBar(R.id.pb_completion, 100, listDetails.completionPercentage, false)
                                views.setViewVisibility(R.id.tv_unauth_banner, View.GONE)

                                if (listDetails.totalProblems > 0 && listDetails.solvedCount >= listDetails.totalProblems) {
                                    views.setTextViewText(R.id.tv_empty, "All problems solved in this group! 🎉")
                                } else if (listDetails.totalProblems == 0) {
                                    views.setTextViewText(R.id.tv_empty, "No problems in this group yet. Tap + Add!")
                                } else {
                                    views.setTextViewText(R.id.tv_empty, "Loading pending problems...")
                                }

                                // Connect adapter with clean, stable URI keyed to appWidgetId
                                val serviceIntent = Intent(context, GroupFocusService::class.java).apply {
                                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                                    this.data = Uri.parse("codesync://widget/groupfocus/$appWidgetId")
                                }
                                views.setRemoteAdapter(R.id.lv_pending_problems, serviceIntent)
                                views.setEmptyView(R.id.lv_pending_problems, R.id.tv_empty)

                                // Item click PendingIntent template with unique instance URI
                                val itemClickIntent = Intent(context, GroupFocusWidgetProvider::class.java).apply {
                                    action = ACTION_ITEM_CLICK
                                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                                    this.data = Uri.parse("codesync://widget/itemclick/$appWidgetId")
                                }
                                val itemClickPi = PendingIntent.getBroadcast(
                                    context,
                                    appWidgetId,
                                    itemClickIntent,
                                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                                )
                                views.setPendingIntentTemplate(R.id.lv_pending_problems, itemClickPi)

                                // Refresh action
                                val refreshIntent = Intent(context, GroupFocusWidgetProvider::class.java).apply {
                                    action = ACTION_REFRESH
                                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
                                    data = Uri.parse("codesync://widget/refresh/$appWidgetId")
                                }
                                val refreshPi = PendingIntent.getBroadcast(
                                    context,
                                    appWidgetId + 4000,
                                    refreshIntent,
                                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                )
                                views.setOnClickPendingIntent(R.id.btn_refresh, refreshPi)

                                // Quick Add action
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

                                // Open List action
                                val openListIntent = Intent(context, MainActivity::class.java).apply {
                                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                                    if (!listId.isNullOrEmpty()) {
                                        putExtra("target_path", "/lists/$listId")
                                    } else {
                                        putExtra("target_path", "/lists")
                                    }
                                }
                                val openListPi = PendingIntent.getActivity(
                                    context,
                                    appWidgetId + 6000,
                                    openListIntent,
                                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                                )
                                views.setOnClickPendingIntent(R.id.btn_open_list, openListPi)

                                // Config action
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
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                } finally {
                    onComplete?.invoke()
                }
            }
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                for (appWidgetId in appWidgetIds) {
                    fetchAndUpdateWidget(context, appWidgetId)
                }
            } finally {
                pendingResult.finish()
            }
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
                    val targetSolved = intent.getBooleanExtra("EXTRA_TARGET_SOLVED", true)

                    if (!problemId.isNullOrEmpty()) {
                        // Prevent duplicate in-flight requests for same problem
                        if (!inFlightMutations.add(problemId)) {
                            return
                        }

                        if (!AuthStorage.isLoggedIn(context)) {
                            inFlightMutations.remove(problemId)
                            Toast.makeText(context, context.getString(R.string.widget_not_logged_in), Toast.LENGTH_LONG).show()
                            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                                updateAppWidget(context, AppWidgetManager.getInstance(context), appWidgetId)
                            }
                            return
                        }

                        val listId = AuthStorage.getWidgetListId(context, appWidgetId)
                        var backupCache: String? = null

                        // 1. OPTIMISTIC UPDATE: Update local cache immediately so checkbox ticks in 0ms!
                        if (listId != null) {
                            val cachedStr = AuthStorage.getWidgetCache(context, "gf_$listId")
                            backupCache = cachedStr
                            if (!cachedStr.isNullOrEmpty()) {
                                try {
                                    val obj = JSONObject(cachedStr)
                                    val arr = obj.optJSONArray("problems") ?: JSONArray()
                                    var found = false
                                    for (i in 0 until arr.length()) {
                                        val pObj = arr.getJSONObject(i)
                                        if (pObj.optString("id") == problemId) {
                                            pObj.put("isSolved", targetSolved)
                                            found = true
                                            break
                                        }
                                    }
                                    if (found) {
                                        var solvedCount = 0
                                        for (i in 0 until arr.length()) {
                                            if (arr.getJSONObject(i).optBoolean("isSolved")) solvedCount++
                                        }
                                        val totalProblems = arr.length()
                                        val pct = if (totalProblems > 0) Math.round((solvedCount.toFloat() / totalProblems) * 100) else 0
                                        obj.put("solvedCount", solvedCount)
                                        obj.put("completionPercentage", pct)
                                        AuthStorage.saveWidgetCache(context, "gf_$listId", obj.toString())

                                        // Push optimistic UI update immediately
                                        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                                            val appWidgetManager = AppWidgetManager.getInstance(context)
                                            updateAppWidget(context, appWidgetManager, appWidgetId)
                                            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_pending_problems)
                                        }
                                    }
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                }
                            }
                        }

                        // 2. Perform network mutation with explicit targetSolved state
                        val pendingResult = goAsync()
                        CoroutineScope(Dispatchers.IO).launch {
                            try {
                                val result = ApiClient.toggleProblemSolve(context, problemId, targetSolved)
                                if (result.isSuccess) {
                                    val data = result.getOrNull()!!
                                    // Authoritative update from backend response
                                    if (listId != null) {
                                        val cachedStr = AuthStorage.getWidgetCache(context, "gf_$listId")
                                        if (!cachedStr.isNullOrEmpty()) {
                                            try {
                                                val obj = JSONObject(cachedStr)
                                                if (data.totalProblems > 0) {
                                                    obj.put("totalProblems", data.totalProblems)
                                                    obj.put("solvedCount", data.solvedCount)
                                                    obj.put("completionPercentage", data.completionPercentage)
                                                }
                                                val arr = obj.optJSONArray("problems") ?: JSONArray()
                                                for (i in 0 until arr.length()) {
                                                    val pObj = arr.getJSONObject(i)
                                                    if (pObj.optString("id") == problemId) {
                                                        pObj.put("isSolved", data.isSolved)
                                                        break
                                                    }
                                                }
                                                AuthStorage.saveWidgetCache(context, "gf_$listId", obj.toString())
                                            } catch (ignored: Exception) {}
                                        }
                                    }

                                    withContext(Dispatchers.Main) {
                                        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                                            val appWidgetManager = AppWidgetManager.getInstance(context)
                                            updateAppWidget(context, appWidgetManager, appWidgetId)
                                            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_pending_problems)
                                        }
                                    }
                                    WidgetSyncWorker.enqueueImmediateSync(context)
                                } else {
                                    // ROLLBACK on failure
                                    if (listId != null && backupCache != null) {
                                        AuthStorage.saveWidgetCache(context, "gf_$listId", backupCache)
                                    }
                                    withContext(Dispatchers.Main) {
                                        if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                                            val appWidgetManager = AppWidgetManager.getInstance(context)
                                            updateAppWidget(context, appWidgetManager, appWidgetId)
                                            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetId, R.id.lv_pending_problems)
                                        }
                                        val ex = result.exceptionOrNull()
                                        if (ex is ApiClient.AuthException) {
                                            Toast.makeText(context, ex.message ?: "Session expired. Please log in.", Toast.LENGTH_LONG).show()
                                        } else {
                                            Toast.makeText(context, ex?.message ?: "Could not update status. Tap to retry.", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            } finally {
                                inFlightMutations.remove(problemId)
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
                val appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID).let { id ->
                    if (id != AppWidgetManager.INVALID_APPWIDGET_ID) id
                    else intent.data?.lastPathSegment?.toIntOrNull() ?: AppWidgetManager.INVALID_APPWIDGET_ID
                }
                if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                    Toast.makeText(context, "Syncing Group Focus...", Toast.LENGTH_SHORT).show()
                    val pendingResult = goAsync()
                    fetchAndUpdateWidget(context, appWidgetId) {
                        pendingResult.finish()
                    }
                }
            }
        }
    }
}
