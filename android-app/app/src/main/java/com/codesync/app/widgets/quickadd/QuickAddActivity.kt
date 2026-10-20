package com.codesync.app.widgets.quickadd

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.codesync.app.MainActivity
import com.codesync.app.R
import com.codesync.app.api.ApiClient
import com.codesync.app.api.ListSummary
import com.codesync.app.auth.AuthStorage
import com.codesync.app.sync.WidgetSyncWorker
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class QuickAddActivity : AppCompatActivity() {

    private lateinit var spLists: Spinner
    private lateinit var etUrl: EditText
    private lateinit var etTitle: EditText
    private lateinit var rgDifficulty: RadioGroup
    private lateinit var etTopic: EditText
    private lateinit var btnSubmit: Button
    private lateinit var pbLoading: ProgressBar

    private var lists = listOf<ListSummary>()
    private var preselectedListId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_quick_add)

        if (!AuthStorage.isLoggedIn(this)) {
            Toast.makeText(this, getString(R.string.widget_not_logged_in), Toast.LENGTH_LONG).show()
            startActivity(Intent(this, MainActivity::class.java))
            finish()
            return
        }

        preselectedListId = intent.getStringExtra("EXTRA_TARGET_LIST_ID")

        initViews()
        loadLists()
    }

    private fun initViews() {
        spLists = findViewById(R.id.sp_lists)
        etUrl = findViewById(R.id.et_url)
        etTitle = findViewById(R.id.et_title)
        rgDifficulty = findViewById(R.id.rg_difficulty)
        etTopic = findViewById(R.id.et_topic)
        btnSubmit = findViewById(R.id.btn_submit)
        pbLoading = findViewById(R.id.pb_loading)

        // Auto-extract slug to problem title when URL is pasted
        etUrl.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val url = s?.toString()?.trim() ?: return
                if (etTitle.text.isNullOrEmpty() && url.contains("leetcode.com/problems/")) {
                    val parts = url.substringAfter("leetcode.com/problems/").split("/").filter { it.isNotEmpty() }
                    if (parts.isNotEmpty()) {
                        val slug = parts[0]
                        val guessedTitle = slug.split("-").joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
                        etTitle.setText(guessedTitle)
                    }
                }
            }
        })

        btnSubmit.setOnClickListener {
            submitProblem()
        }
    }

    private fun loadLists() {
        pbLoading.visibility = View.VISIBLE
        btnSubmit.isEnabled = false

        CoroutineScope(Dispatchers.IO).launch {
            val result = ApiClient.getUserLists(this@QuickAddActivity)
            CoroutineScope(Dispatchers.Main).launch {
                pbLoading.visibility = View.GONE
                btnSubmit.isEnabled = true

                if (result.isSuccess) {
                    lists = result.getOrNull() ?: emptyList()
                    if (lists.isEmpty()) {
                        Toast.makeText(this@QuickAddActivity, "No shared lists found. Create one in CodeSync first.", Toast.LENGTH_LONG).show()
                        finish()
                        return@launch
                    }

                    val adapter = ArrayAdapter(
                        this@QuickAddActivity,
                        android.R.layout.simple_spinner_dropdown_item,
                        lists.map { it.name }
                    )
                    spLists.adapter = adapter

                    // Select preselected list if matched
                    if (!preselectedListId.isNullOrEmpty()) {
                        val idx = lists.indexOfFirst { it.id == preselectedListId }
                        if (idx >= 0) {
                            spLists.setSelection(idx)
                        }
                    }
                } else {
                    Toast.makeText(
                        this@QuickAddActivity,
                        result.exceptionOrNull()?.message ?: "Failed to load lists",
                        Toast.LENGTH_LONG
                    ).show()
                    finish()
                }
            }
        }
    }

    private fun submitProblem() {
        val selectedIndex = spLists.selectedItemPosition
        if (selectedIndex < 0 || selectedIndex >= lists.size) {
            Toast.makeText(this, "Please select a target list", Toast.LENGTH_SHORT).show()
            return
        }

        val targetList = lists[selectedIndex]
        val url = etUrl.text.toString().trim()
        val title = etTitle.text.toString().trim()
        val topic = etTopic.text.toString().trim()

        if (url.isEmpty()) {
            etUrl.error = "LeetCode URL is required"
            return
        }
        if (!url.contains("leetcode.com", ignoreCase = true)) {
            etUrl.error = "Must be a valid LeetCode URL"
            return
        }
        if (title.isEmpty()) {
            etTitle.error = "Problem title is required"
            return
        }

        val difficulty = when (rgDifficulty.checkedRadioButtonId) {
            R.id.rb_easy -> "Easy"
            R.id.rb_hard -> "Hard"
            else -> "Medium"
        }

        pbLoading.visibility = View.VISIBLE
        btnSubmit.isEnabled = false

        CoroutineScope(Dispatchers.IO).launch {
            val result = ApiClient.addProblem(
                this@QuickAddActivity,
                title = title,
                difficulty = difficulty,
                url = url,
                listId = targetList.id,
                topic = if (topic.isNotEmpty()) topic else "General"
            )

            CoroutineScope(Dispatchers.Main).launch {
                pbLoading.visibility = View.GONE
                btnSubmit.isEnabled = true

                if (result.isSuccess) {
                    Toast.makeText(
                        this@QuickAddActivity,
                        "\"$title\" added to ${targetList.name}! 🎉",
                        Toast.LENGTH_SHORT
                    ).show()
                    WidgetSyncWorker.enqueueImmediateSync(this@QuickAddActivity)
                    finish()
                } else {
                    val errorMsg = result.exceptionOrNull()?.message ?: "Could not add problem"
                    Toast.makeText(this@QuickAddActivity, errorMsg, Toast.LENGTH_LONG).show()
                }
            }
        }
    }
}
