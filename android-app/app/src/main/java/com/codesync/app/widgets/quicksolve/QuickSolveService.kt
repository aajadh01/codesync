package com.codesync.app.widgets.quicksolve

import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import com.codesync.app.R
import com.codesync.app.api.ApiClient
import com.codesync.app.api.ProblemItem
import com.codesync.app.auth.AuthStorage
import org.json.JSONArray
import org.json.JSONObject

class QuickSolveService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return QuickSolveViewsFactory(applicationContext, intent)
    }
}

class QuickSolveViewsFactory(
    private val context: Context,
    intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private val appWidgetId = intent.getIntExtra(
        android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,
        android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID
    ).let {
        if (it != android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID) it
        else intent.data?.lastPathSegment?.toIntOrNull() ?: android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID
    }

    private val problems = mutableListOf<ProblemItem>()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        if (!AuthStorage.isLoggedIn(context)) {
            problems.clear()
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
            val result = ApiClient.getListDetails(context, listId)
            if (result.isSuccess) {
                val data = result.getOrNull()!!
                problems.clear()
                problems.addAll(data.problems)

                val stats = "${data.solvedCount}/${data.totalProblems}"
                if (appWidgetId != android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID) {
                    AuthStorage.saveWidgetCache(context, "qs_stats_$appWidgetId", stats)
                    try {
                        val appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context)
                        val views = RemoteViews(context.packageName, R.layout.widget_quick_solve)
                        views.setTextViewText(R.id.tv_solved_badge, stats)
                        views.setTextViewText(R.id.tv_widget_title, data.name)
                        appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views)
                    } catch (ignored: Exception) {}
                }

                // Cache for offline support
                try {
                    val arr = JSONArray()
                    for (p in data.problems) {
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
                    AuthStorage.saveWidgetCache(context, "qs_$listId", arr.toString())
                } catch (ignored: Exception) {}
            } else {
                // Offline fallback from cache
                val cached = AuthStorage.getWidgetCache(context, "qs_$listId")
                if (!cached.isNullOrEmpty()) {
                    try {
                        val arr = JSONArray(cached)
                        problems.clear()
                        for (i in 0 until arr.length()) {
                            val obj = arr.getJSONObject(i)
                            problems.add(
                                ProblemItem(
                                    id = obj.getString("id"),
                                    title = obj.getString("title"),
                                    difficulty = obj.optString("difficulty", "Medium"),
                                    url = obj.optString("url", "https://leetcode.com"),
                                    topic = obj.optString("topic", "General"),
                                    isSolved = obj.optBoolean("isSolved", false)
                                )
                            )
                        }
                    } catch (ignored: Exception) {}
                }
            }
        }
    }

    override fun onDestroy() {
        problems.clear()
    }

    override fun getCount(): Int = problems.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_problem_item)
        if (position >= problems.size) return views

        val problem = problems[position]
        views.setTextViewText(R.id.tv_problem_title, problem.title)
        views.setTextViewText(R.id.tv_problem_difficulty, problem.difficulty)
        views.setTextViewText(R.id.tv_problem_topic, problem.topic)

        // Difficulty Pill styling
        when (problem.difficulty) {
            "Easy" -> {
                views.setInt(R.id.tv_problem_difficulty, "setBackgroundResource", R.drawable.bg_pill_easy)
                views.setTextColor(R.id.tv_problem_difficulty, context.getColor(R.color.diff_easy))
            }
            "Medium" -> {
                views.setInt(R.id.tv_problem_difficulty, "setBackgroundResource", R.drawable.bg_pill_medium)
                views.setTextColor(R.id.tv_problem_difficulty, context.getColor(R.color.diff_medium))
            }
            "Hard" -> {
                views.setInt(R.id.tv_problem_difficulty, "setBackgroundResource", R.drawable.bg_pill_hard)
                views.setTextColor(R.id.tv_problem_difficulty, context.getColor(R.color.diff_hard))
            }
        }

        // Checkbox status
        if (problem.isSolved) {
            views.setImageViewResource(R.id.btn_checkbox, R.drawable.ic_check_circle)
        } else {
            views.setImageViewResource(R.id.btn_checkbox, R.drawable.ic_check_empty)
        }

        // FillInIntent for toggle solve
        val toggleFillIn = Intent().apply {
            putExtra("EXTRA_ACTION_TYPE", "TOGGLE_SOLVE")
            putExtra("EXTRA_PROBLEM_ID", problem.id)
            putExtra("EXTRA_APPWIDGET_ID", appWidgetId)
            putExtra(android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
        }
        views.setOnClickFillInIntent(R.id.btn_checkbox, toggleFillIn)

        // FillInIntent for opening LeetCode problem link
        val urlFillIn = Intent().apply {
            putExtra("EXTRA_ACTION_TYPE", "OPEN_URL")
            putExtra("EXTRA_URL", problem.url)
        }
        views.setOnClickFillInIntent(R.id.btn_open_leetcode, urlFillIn)
        views.setOnClickFillInIntent(R.id.layout_problem_info, urlFillIn)
        views.setOnClickFillInIntent(R.id.item_root, urlFillIn)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false
}
