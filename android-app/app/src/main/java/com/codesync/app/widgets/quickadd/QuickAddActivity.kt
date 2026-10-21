package com.codesync.app.widgets.quickadd

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.ArrayAdapter
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.Spinner
import android.widget.TextView
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
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class QuickAddActivity : AppCompatActivity() {

    private lateinit var spLists: Spinner
    private lateinit var etUrl: EditText
    private lateinit var btnFetch: Button
    private lateinit var tvFetchStatus: TextView
    private lateinit var etTitle: EditText
    private lateinit var rgDifficulty: RadioGroup
    private lateinit var rgTopicType: RadioGroup
    private lateinit var rbTopicGeneral: RadioButton
    private lateinit var rbTopicSpecific: RadioButton
    private lateinit var layoutSpecificTopic: LinearLayout
    private lateinit var etTopic: EditText
    private lateinit var btnSubmit: Button
    private lateinit var pbLoading: ProgressBar

    private var lists = listOf<ListSummary>()
    private var preselectedListId: String? = null
    private var autoFetchJob: Job? = null
    private var resolvedUrl: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_quick_add)

        if (!AuthStorage.isLoggedIn(this)) {
            Toast.makeText(this, getString(R.string.widget_not_logged_in), Toast.LENGTH_LONG).show()
            val loginIntent = Intent(this, MainActivity::class.java).apply {
                putExtra("target_path", "/auth")
            }
            startActivity(loginIntent)
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
        btnFetch = findViewById(R.id.btn_fetch)
        tvFetchStatus = findViewById(R.id.tv_fetch_status)
        etTitle = findViewById(R.id.et_title)
        rgDifficulty = findViewById(R.id.rg_difficulty)
        rgTopicType = findViewById(R.id.rg_topic_type)
        rbTopicGeneral = findViewById(R.id.rb_topic_general)
        rbTopicSpecific = findViewById(R.id.rb_topic_specific)
        layoutSpecificTopic = findViewById(R.id.layout_specific_topic)
        etTopic = findViewById(R.id.et_topic)
        btnSubmit = findViewById(R.id.btn_submit)
        pbLoading = findViewById(R.id.pb_loading)

        // Topic Type toggle logic (General vs Specific Topic)
        rgTopicType.setOnCheckedChangeListener { _, checkedId ->
            if (checkedId == R.id.rb_topic_specific) {
                layoutSpecificTopic.visibility = View.VISIBLE
                etTopic.requestFocus()
            } else {
                layoutSpecificTopic.visibility = View.GONE
            }
        }

        // Manual Fetch button
        btnFetch.setOnClickListener {
            val input = etUrl.text.toString().trim()
            if (input.isNotEmpty()) {
                fetchLeetCodeDetails(input, andSubmit = false)
            } else {
                etUrl.error = "Enter a problem number or URL"
            }
        }

        // Auto-fetch on input change (debounced 800ms) without replacing the text user is typing
        etUrl.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val input = s?.toString()?.trim() ?: return
                resolvedUrl = null // Reset resolved URL when user edits input

                if (input.isEmpty()) {
                    tvFetchStatus.text = "Enter a LeetCode problem number to auto-fill details"
                    tvFetchStatus.setTextColor(getColor(R.color.text_muted))
                    autoFetchJob?.cancel()
                    return
                }

                // If user is typing digits and only has 1 digit, don't rush auto-fetch
                if (input.all { it.isDigit() } && input.length < 2) {
                    tvFetchStatus.text = "Type problem number and pause, or tap Fetch"
                    tvFetchStatus.setTextColor(getColor(R.color.text_muted))
                    autoFetchJob?.cancel()
                    return
                }

                autoFetchJob?.cancel()
                autoFetchJob = CoroutineScope(Dispatchers.Main).launch {
                    delay(800)
                    val currentText = etUrl.text.toString().trim()
                    if (currentText == input && currentText.isNotEmpty() && !isFinishing) {
                        fetchLeetCodeDetails(currentText, andSubmit = false)
                    }
                }
            }
        })

        btnSubmit.setOnClickListener {
            submitProblem()
        }
    }

    private fun fetchLeetCodeDetails(input: String, andSubmit: Boolean) {
        val query = extractProblemIdentifier(input)
        if (query.isEmpty()) return

        tvFetchStatus.text = "Fetching LeetCode details for '$query'..."
        tvFetchStatus.setTextColor(getColor(R.color.accent_cyan))

        CoroutineScope(Dispatchers.IO).launch {
            val result = ApiClient.getLeetCodeDetails(this@QuickAddActivity, query)
            CoroutineScope(Dispatchers.Main).launch {
                // Ensure current input still matches what we fetched
                val currentInput = etUrl.text.toString().trim()
                if (!andSubmit && extractProblemIdentifier(currentInput) != query && currentInput.isNotEmpty()) {
                    return@launch
                }

                if (result.isSuccess) {
                    val details = result.getOrNull()!!
                    resolvedUrl = details.url
                    etTitle.setText(details.title)

                    // Note: We deliberately DO NOT call etUrl.setText(details.url) here
                    // so the user's typed number or text is never overwritten while typing!

                    when (details.difficulty) {
                        "Easy" -> rgDifficulty.check(R.id.rb_easy)
                        "Hard" -> rgDifficulty.check(R.id.rb_hard)
                        else -> rgDifficulty.check(R.id.rb_medium)
                    }

                    // Auto-fill topic if specific
                    if (details.topic.isNotBlank() && !details.topic.equals("General", ignoreCase = true)) {
                        rbTopicSpecific.isChecked = true
                        layoutSpecificTopic.visibility = View.VISIBLE
                        etTopic.setText(details.topic)
                    } else if (rbTopicGeneral.isChecked) {
                        layoutSpecificTopic.visibility = View.GONE
                        etTopic.setText("")
                    }

                    tvFetchStatus.text = "✓ Found: #${details.id} ${details.title} (${details.difficulty})"
                    tvFetchStatus.setTextColor(getColor(R.color.diff_easy))

                    if (andSubmit) {
                        val topic = if (rbTopicSpecific.isChecked) {
                            etTopic.text.toString().trim().ifEmpty { "General" }
                        } else {
                            "General"
                        }
                        executeAdd(details.title, details.difficulty, details.url, topic)
                    }
                } else {
                    val err = result.exceptionOrNull()?.message ?: "Problem not found"
                    tvFetchStatus.text = "Could not auto-fetch: $err"
                    tvFetchStatus.setTextColor(getColor(R.color.diff_hard))

                    if (andSubmit) {
                        pbLoading.visibility = View.GONE
                        btnSubmit.isEnabled = true
                        Toast.makeText(this@QuickAddActivity, err, Toast.LENGTH_LONG).show()
                    }
                }
            }
        }
    }

    private fun extractProblemIdentifier(raw: String): String {
        val clean = raw.trim()
        if (clean.contains("leetcode.com/problems/")) {
            val parts = clean.substringAfter("leetcode.com/problems/").split("/").filter { it.isNotEmpty() }
            if (parts.isNotEmpty()) return parts[0]
        }
        return clean
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

        val rawInput = etUrl.text.toString().trim()
        val title = etTitle.text.toString().trim()

        if (rawInput.isEmpty() && title.isEmpty()) {
            etUrl.error = "Enter a LeetCode problem number or URL"
            return
        }

        // If title is missing or user just typed a number/slug, auto-resolve and submit
        if (title.isEmpty()) {
            pbLoading.visibility = View.VISIBLE
            btnSubmit.isEnabled = false
            fetchLeetCodeDetails(rawInput, andSubmit = true)
            return
        }

        val difficulty = when (rgDifficulty.checkedRadioButtonId) {
            R.id.rb_easy -> "Easy"
            R.id.rb_hard -> "Hard"
            else -> "Medium"
        }

        val finalUrl = resolvedUrl ?: if (rawInput.contains("leetcode.com")) {
            rawInput
        } else if (rawInput.isNotEmpty() && rawInput.all { it.isDigit() }) {
            "https://leetcode.com/problemset/all/?search=$rawInput"
        } else {
            "https://leetcode.com/problems/${extractProblemIdentifier(rawInput)}/"
        }

        val topic = if (rbTopicSpecific.isChecked) {
            etTopic.text.toString().trim().ifEmpty { "General" }
        } else {
            "General"
        }

        executeAdd(title, difficulty, finalUrl, topic)
    }

    private fun executeAdd(title: String, difficulty: String, url: String, topic: String) {
        val selectedIndex = spLists.selectedItemPosition
        if (selectedIndex < 0 || selectedIndex >= lists.size) return
        val targetList = lists[selectedIndex]

        pbLoading.visibility = View.VISIBLE
        btnSubmit.isEnabled = false

        CoroutineScope(Dispatchers.IO).launch {
            val result = ApiClient.addProblem(
                this@QuickAddActivity,
                title = title,
                difficulty = difficulty,
                url = url,
                listId = targetList.id,
                topic = topic
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
