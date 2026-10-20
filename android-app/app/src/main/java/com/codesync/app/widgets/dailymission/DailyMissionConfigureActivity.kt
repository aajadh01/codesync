package com.codesync.app.widgets.dailymission

import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.codesync.app.R
import com.codesync.app.api.ApiClient
import com.codesync.app.auth.AuthStorage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class DailyMissionConfigureActivity : AppCompatActivity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID
    private var currentTarget = 3
    private lateinit var tvTargetValue: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        setContentView(R.layout.activity_daily_mission_configure)

        appWidgetId = intent?.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID

        tvTargetValue = findViewById(R.id.tv_target_value)
        val btnDecrement = findViewById<Button>(R.id.btn_decrement)
        val btnIncrement = findViewById<Button>(R.id.btn_increment)
        val btnSave = findViewById<Button>(R.id.btn_save_target)

        updateDisplay()

        btnDecrement.setOnClickListener {
            if (currentTarget > 1) {
                currentTarget--
                updateDisplay()
            }
        }

        btnIncrement.setOnClickListener {
            if (currentTarget < 30) {
                currentTarget++
                updateDisplay()
            }
        }

        btnSave.setOnClickListener {
            saveTarget()
        }
    }

    private fun updateDisplay() {
        tvTargetValue.text = currentTarget.toString()
    }

    private fun saveTarget() {
        if (!AuthStorage.isLoggedIn(this)) {
            Toast.makeText(this, getString(R.string.widget_not_logged_in), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            ApiClient.setDailyTarget(this@DailyMissionConfigureActivity, currentTarget)
            CoroutineScope(Dispatchers.Main).launch {
                val updateIntent = Intent(this@DailyMissionConfigureActivity, DailyMissionWidgetProvider::class.java).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
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
}
