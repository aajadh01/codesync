package com.codesync.app.widgets.randomchallenge

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.RadioGroup
import android.widget.Spinner
import androidx.appcompat.app.AppCompatActivity
import com.codesync.app.R
import com.codesync.app.auth.AuthStorage

class RandomChallengeConfigureActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    private val topics = listOf(
        "All",
        "Array",
        "String",
        "Dynamic Programming",
        "Two Pointers",
        "Trees",
        "Hash Table",
        "Stack",
        "Binary Search",
        "Graph",
        "Sliding Window"
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        setContentView(R.layout.activity_random_challenge_configure)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        val rgDifficulty = findViewById<RadioGroup>(R.id.rg_difficulty)
        val spTopics = findViewById<Spinner>(R.id.sp_topics)
        val btnSave = findViewById<Button>(R.id.btn_save_filters)

        val adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, topics)
        spTopics.adapter = adapter

        // Set existing selection
        val savedDiff = AuthStorage.getWidgetDifficulty(this, appWidgetId)
        when (savedDiff) {
            "Easy" -> rgDifficulty.check(R.id.rb_easy)
            "Medium" -> rgDifficulty.check(R.id.rb_medium)
            "Hard" -> rgDifficulty.check(R.id.rb_hard)
            else -> rgDifficulty.check(R.id.rb_all_diff)
        }

        val savedTopic = AuthStorage.getWidgetTopic(this, appWidgetId)
        val topicIdx = topics.indexOf(savedTopic)
        if (topicIdx >= 0) {
            spTopics.setSelection(topicIdx)
        }

        btnSave.setOnClickListener {
            val selectedDiff = when (rgDifficulty.checkedRadioButtonId) {
                R.id.rb_easy -> "Easy"
                R.id.rb_medium -> "Medium"
                R.id.rb_hard -> "Hard"
                else -> "All"
            }
            val selectedTopic = topics[spTopics.selectedItemPosition]

            AuthStorage.setWidgetFilters(this, appWidgetId, selectedDiff, selectedTopic)

            // Notify widget to fetch new random challenge with these filters
            val updateIntent = Intent(this, RandomChallengeWidgetProvider::class.java).apply {
                action = RandomChallengeWidgetProvider.ACTION_NEXT
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            sendBroadcast(updateIntent)

            val resultValue = Intent().apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            setResult(RESULT_OK, resultValue)
            finish()
        }
    }
}
