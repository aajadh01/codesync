package com.codesync.app.widgets.groupfocus

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

class GroupFocusService : RemoteViewsService() {
    override fun onGetViewFactory(intent: Intent): RemoteViewsFactory {
        return GroupFocusViewsFactory(applicationContext, intent)
    }
}

class GroupFocusViewsFactory(
    private val context: Context,
    intent: Intent
) : RemoteViewsService.RemoteViewsFactory {

    private val appWidgetId = intent.getIntExtra(
        android.appwidget.AppWidgetManager.EXTRA_APPWIDGET_ID,
        android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID
    ).let {
        if (it != android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID) it
        else intent.data?.pathSegments?.getOrNull(2)?.toIntOrNull() ?: android.appwidget.AppWidgetManager.INVALID_APPWIDGET_ID
    }

    private val pendingProblems = mutableListOf<ProblemItem>()

    override fun onCreate() {}

    override fun onDataSetChanged() {
        if (!AuthStorage.isLoggedIn(context)) {
            pendingProblems.clear()
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
            // 1. FAST PATH: First check cache for instant render (avoids binder timeout)
            val cached = AuthStorage.getWidgetCache(context, "gf_$listId")
            if (!cached.isNullOrEmpty()) {
                try {
                    val obj = JSONObject(cached)
                    val arr = obj.optJSONArray("problems") ?: JSONArray()
                    val loaded = mutableListOf<ProblemItem>()
                    for (i in 0 until arr.length()) {
                        val pObj = arr.getJSONObject(i)
                        loaded.add(
                            ProblemItem(
                                id = pObj.getString("id"),
                                title = pObj.getString("title"),
                                difficulty = pObj.optString("difficulty", "Medium"),
                                url = pObj.optString("url", "https://leetcode.com"),
                                topic = pObj.optString("topic", "General"),
                                isSolved = pObj.optBoolean("isSolved", false)
                            )
                        )
                    }

                    if (loaded.isNotEmpty()) {
                        pendingProblems.clear()
                        val pending = loaded.filter { !it.isSolved }
                        if (pending.isNotEmpty()) {
                            pendingProblems.addAll(pending)
                        } else {
                            pendingProblems.addAll(loaded)
                        }
                        return
                    }
                } catch (ignored: Exception) {}
            }

            // 2. SLOW PATH: If cache was completely empty, fetch synchronously
            val result = ApiClient.getListDetails(context, listId)
            if (result.isSuccess) {
                val data = result.getOrNull()!!
                pendingProblems.clear()
                val pending = data.problems.filter { !it.isSolved }
                if (pending.isNotEmpty()) {
                    pendingProblems.addAll(pending)
                } else {
                    pendingProblems.addAll(data.problems)
                }

                // Cache metadata & problems
                try {
                    val obj = JSONObject().apply {
                        put("totalProblems", data.totalProblems)
                        put("solvedCount", data.solvedCount)
                        put("completionPercentage", data.completionPercentage)
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
                        put("problems", arr)
                    }
                    AuthStorage.saveWidgetCache(context, "gf_$listId", obj.toString())
                } catch (ignored: Exception) {}
            }
        }
    }

    override fun onDestroy() {
        pendingProblems.clear()
    }

    override fun getCount(): Int = pendingProblems.size

    override fun getViewAt(position: Int): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_problem_item)
        if (position >= pendingProblems.size) return views

        val problem = pendingProblems[position]
        views.setTextViewText(R.id.tv_problem_title, problem.title)
        views.setTextViewText(R.id.tv_problem_difficulty, problem.difficulty)
        views.setTextViewText(R.id.tv_problem_topic, problem.topic)

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

        if (problem.isSolved) {
            views.setImageViewResource(R.id.btn_checkbox, R.drawable.ic_check_circle)
        } else {
            views.setImageViewResource(R.id.btn_checkbox, R.drawable.ic_check_empty)
        }

        val toggleFillIn = Intent().apply {
            putExtra("EXTRA_ACTION_TYPE", "TOGGLE_SOLVE")
            putExtra("EXTRA_PROBLEM_ID", problem.id)
            putExtra("EXTRA_APPWIDGET_ID", appWidgetId)
        }
        views.setOnClickFillInIntent(R.id.btn_checkbox, toggleFillIn)

        val urlFillIn = Intent().apply {
            putExtra("EXTRA_ACTION_TYPE", "OPEN_URL")
            putExtra("EXTRA_URL", problem.url)
        }
        views.setOnClickFillInIntent(R.id.btn_open_leetcode, urlFillIn)
        views.setOnClickFillInIntent(R.id.layout_problem_info, urlFillIn)

        return views
    }

    override fun getLoadingView(): RemoteViews? = null

    override fun getViewTypeCount(): Int = 1

    override fun getItemId(position: Int): Long = position.toLong()

    override fun hasStableIds(): Boolean = false
}
