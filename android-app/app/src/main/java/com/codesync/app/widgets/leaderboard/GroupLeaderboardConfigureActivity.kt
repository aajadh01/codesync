package com.codesync.app.widgets.leaderboard

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.ListView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.codesync.app.R
import com.codesync.app.api.ApiClient
import com.codesync.app.api.ListSummary
import com.codesync.app.auth.AuthStorage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class GroupLeaderboardConfigureActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private lateinit var progressBar: ProgressBar
    private lateinit var tvEmpty: TextView
    private lateinit var lvLists: ListView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        setContentView(R.layout.activity_widget_configure)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish()
            return
        }

        findViewById<TextView>(R.id.tv_config_title).text = "Leaderboard: Select Study Group"
        progressBar = findViewById(R.id.progressBar)
        tvEmpty = findViewById(R.id.tv_empty)
        lvLists = findViewById(R.id.lv_lists)

        loadLists()
    }

    private fun loadLists() {
        if (!AuthStorage.isLoggedIn(this)) {
            tvEmpty.text = getString(R.string.widget_not_logged_in)
            tvEmpty.visibility = View.VISIBLE
            return
        }

        progressBar.visibility = View.VISIBLE
        tvEmpty.visibility = View.GONE

        CoroutineScope(Dispatchers.IO).launch {
            val result = ApiClient.getUserLists(this@GroupLeaderboardConfigureActivity)
            CoroutineScope(Dispatchers.Main).launch {
                progressBar.visibility = View.GONE
                if (result.isSuccess) {
                    val lists = result.getOrNull() ?: emptyList()
                    if (lists.isEmpty()) {
                        tvEmpty.visibility = View.VISIBLE
                    } else {
                        setupAdapter(lists)
                    }
                } else {
                    Toast.makeText(
                        this@GroupLeaderboardConfigureActivity,
                        result.exceptionOrNull()?.message ?: "Failed to load lists",
                        Toast.LENGTH_LONG
                    ).show()
                    tvEmpty.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun setupAdapter(lists: List<ListSummary>) {
        val adapter = object : ArrayAdapter<ListSummary>(this, R.layout.item_config_list, lists) {
            override fun getView(position: Int, convertView: View?, parent: ViewGroup): View {
                val view = convertView ?: LayoutInflater.from(context).inflate(R.layout.item_config_list, parent, false)
                val item = getItem(position)!!
                view.findViewById<TextView>(R.id.tv_list_name).text = item.name
                view.findViewById<TextView>(R.id.tv_list_meta).text = "${item.solvedCount} of ${item.totalProblems} solved"
                view.findViewById<TextView>(R.id.tv_invite_code).text = item.inviteCode
                return view
            }
        }
        lvLists.adapter = adapter

        lvLists.setOnItemClickListener { _, _, position, _ ->
            val selected = lists[position]
            AuthStorage.setWidgetListId(this, appWidgetId, selected.id, selected.name)

            // Directly push RemoteViews update before returning
            val appWidgetManager = AppWidgetManager.getInstance(this)
            GroupLeaderboardWidgetProvider.updateAppWidget(this, appWidgetManager, appWidgetId)

            val resultValue = Intent().apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            setResult(RESULT_OK, resultValue)
            finish()
        }
    }
}
