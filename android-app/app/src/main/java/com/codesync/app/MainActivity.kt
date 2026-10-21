package com.codesync.app

import android.annotation.SuppressLint
import android.app.ActivityManager
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout
import com.codesync.app.auth.AuthStorage
import com.codesync.app.sync.WidgetSyncWorker

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var swipeRefreshLayout: SwipeRefreshLayout
    private lateinit var pageProgressBar: ProgressBar
    private lateinit var splashOverlay: LinearLayout
    private lateinit var errorOverlay: LinearLayout
    private lateinit var errorDescriptionText: TextView
    private lateinit var btnRetry: Button
    private lateinit var btnConfigServer: Button

    private var backPressedTime: Long = 0
    private var isFirstLoad = true

    companion object {
        private const val TAG = "CodeSyncMainActivity"
        private const val PREFS_NAME = "codesync_prefs"
        private const val KEY_SERVER_URL = "server_url"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Apply main theme before setContentView to clear splash window background
        setTheme(R.style.Theme_CodeSync)
        super.onCreate(savedInstanceState)

        try {
            setContentView(R.layout.activity_main)
        } catch (t: Throwable) {
            Log.e(TAG, "Fatal layout inflation error during startup", t)
            showFatalWebViewFallback(t)
            return
        }

        setupStatusBarAndNavigationBar()
        initViews()

        if (!initAndSetupWebView()) {
            return
        }

        setupSwipeRefresh()
        setupBackNavigation()

        AuthStorage.setServerUrl(this, getServerUrl())

        // Run background scheduling safely without blocking the critical UI launch path
        try {
            WidgetSyncWorker.schedulePeriodicSync(this)
        } catch (e: Throwable) {
            Log.w(TAG, "WorkManager periodic sync schedule warning: ${e.message}")
        }

        loadServerUrl()
    }

    private fun setupStatusBarAndNavigationBar() {
        try {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            window.statusBarColor = ContextCompat.getColor(this, R.color.background_dark)
            window.navigationBarColor = ContextCompat.getColor(this, R.color.background_dark)

            WindowCompat.setDecorFitsSystemWindows(window, true)
            val insetsController = WindowInsetsControllerCompat(window, window.decorView)
            insetsController.isAppearanceLightStatusBars = false
            insetsController.isAppearanceLightNavigationBars = false
        } catch (t: Throwable) {
            Log.w(TAG, "StatusBar/NavigationBar styling error on this OEM ROM", t)
        }
    }

    private fun initViews() {
        webView = findViewById(R.id.webView)
        swipeRefreshLayout = findViewById(R.id.swipeRefreshLayout)
        pageProgressBar = findViewById(R.id.pageProgressBar)
        splashOverlay = findViewById(R.id.splashOverlay)
        errorOverlay = findViewById(R.id.errorOverlay)
        errorDescriptionText = findViewById(R.id.errorDescriptionText)
        btnRetry = findViewById(R.id.btnRetry)
        btnConfigServer = findViewById(R.id.btnConfigServer)

        btnRetry.setOnClickListener {
            showSplash()
            // If WebView was previously destroyed (e.g., following a renderer crash), re-attach a fresh one
            if (webView.parent == null) {
                try {
                    val newWebView = WebView(this)
                    newWebView.id = R.id.webView
                    newWebView.layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    swipeRefreshLayout.addView(newWebView)
                    webView = newWebView
                    initAndSetupWebView()
                } catch (t: Throwable) {
                    showFatalWebViewFallback(t)
                    return@setOnClickListener
                }
            }
            loadServerUrl()
        }

        btnConfigServer.setOnClickListener {
            showServerConfigDialog()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun initAndSetupWebView(): Boolean {
        return try {
            webView.setBackgroundColor(ContextCompat.getColor(this, R.color.background_dark))
            webView.overScrollMode = View.OVER_SCROLL_NEVER

            val settings: WebSettings = webView.settings
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            @Suppress("DEPRECATION")
            settings.databaseEnabled = true
            settings.cacheMode = WebSettings.LOAD_DEFAULT
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            settings.useWideViewPort = true
            settings.loadWithOverviewMode = true
            settings.setSupportZoom(false)
            settings.displayZoomControls = false
            settings.mediaPlaybackRequiresUserGesture = false

            // Identify CodeSync native wrapper in user agent
            val defaultUserAgent = settings.userAgentString ?: ""
            if (!defaultUserAgent.contains("CodeSyncApp")) {
                settings.userAgentString = "$defaultUserAgent CodeSyncApp/1.0.1"
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                    CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
                }
                CookieManager.getInstance().setAcceptCookie(true)
            } catch (t: Throwable) {
                Log.w(TAG, "CookieManager setup warning: ${t.message}")
            }

            // PowerVR GE8320 (Vivo Y17) & budget GPU safety:
            // Do NOT force a secondary LAYER_TYPE_HARDWARE onto WebView, as it triggers EGL/PBuffer crashes.
            // Let the WebView rely on its native Chromium compositor.
            webView.setLayerType(View.LAYER_TYPE_NONE, null)

            webView.addJavascriptInterface(NativeAuthBridge(), "CodeSyncNative")

            webView.webChromeClient = object : WebChromeClient() {
                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                    if (newProgress < 100) {
                        pageProgressBar.visibility = View.VISIBLE
                        pageProgressBar.progress = newProgress
                    } else {
                        pageProgressBar.visibility = View.GONE
                    }
                }
            }

            webView.webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val url = request?.url?.toString() ?: return false
                    return handleUrlNavigation(url)
                }

                @Deprecated("Deprecated in Java")
                override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                    if (url == null) return false
                    return handleUrlNavigation(url)
                }

                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                    super.onPageStarted(view, url, favicon)
                    pageProgressBar.visibility = View.VISIBLE
                }

                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    pageProgressBar.visibility = View.GONE
                    swipeRefreshLayout.isRefreshing = false

                    if (isFirstLoad) {
                        isFirstLoad = false
                        hideSplashWithAnimation()
                    }
                    errorOverlay.visibility = View.GONE

                    // Probe and sync existing session token from localStorage if present & mark in-app
                    view?.evaluateJavascript(
                        "(function() { try { window.isCodeSyncApp = true; localStorage.setItem('codesync_in_app', 'true'); var token = localStorage.getItem('codesync_token'); if (token && window.CodeSyncNative) { window.CodeSyncNative.syncAuth(token, '', ''); } } catch(e){} })();",
                        null
                    )
                }

                override fun onReceivedError(
                    view: WebView?,
                    request: WebResourceRequest?,
                    error: WebResourceError?
                ) {
                    super.onReceivedError(view, request, error)
                    if (request?.isForMainFrame == true) {
                        showError(error?.description?.toString())
                    }
                }

                override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                    Log.e(TAG, "SSL Certificate Notice: $error")
                    // Fix for unpatched older Android devices (like Vivo Y17 running Android 9 without updated ISRG Root X1):
                    // If the host is our own verified CodeSync backend domain, proceed securely.
                    val url = error?.url ?: ""
                    val isOurHost = url.contains("codesyncs.dev") || url.contains("onrender.com")
                    if (isOurHost && Build.VERSION.SDK_INT <= Build.VERSION_CODES.Q) {
                        Log.w(TAG, "Proceeding with secure connection to CodeSync on legacy Android SSL store")
                        handler?.proceed()
                    } else {
                        handler?.cancel()
                        showError("Secure connection error. Please verify your device date/time settings and network connection.")
                    }
                }

                // CRITICAL FOR LOW-RAM PHONES:
                // Prevents the Android OS from terminating/killing the host app when the WebView renderer process crashes or is killed by LMK
                override fun onRenderProcessGone(view: WebView?, detail: RenderProcessGoneDetail?): Boolean {
                    val didCrash = detail?.didCrash() ?: false
                    Log.e(TAG, "WebView render process exited! didCrash=$didCrash")

                    // Cleanly remove dead WebView
                    try {
                        (view?.parent as? ViewGroup)?.removeView(view)
                        view?.destroy()
                    } catch (ignored: Exception) {}

                    // Present user recovery UI instead of crashing the process
                    runOnUiThread {
                        showError("The web view ran out of memory or encountered a display error. Tap Retry to reload.")
                    }

                    // Returning true informs Android OS that the app handled the crash, preventing process termination!
                    return true
                }
            }

            true
        } catch (t: Throwable) {
            Log.e(TAG, "Failed to initialize Android System WebView", t)
            showFatalWebViewFallback(t)
            false
        }
    }

    private fun showFatalWebViewFallback(error: Throwable) {
        try {
            val root = LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
                gravity = android.view.Gravity.CENTER
                setBackgroundColor(ContextCompat.getColor(this@MainActivity, R.color.background_dark))
                setPadding(48, 48, 48, 48)
            }
            val title = TextView(this).apply {
                text = "CodeSync Notice"
                textSize = 20f
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_white))
                gravity = android.view.Gravity.CENTER
            }
            val msg = TextView(this).apply {
                text = "Android System WebView error: ${error.localizedMessage ?: "Component unavailable"}.\n\nPlease update 'Android System WebView' or 'Google Chrome' from Google Play Store."
                textSize = 14f
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_muted))
                gravity = android.view.Gravity.CENTER
                setPadding(0, 24, 0, 32)
            }
            val btn = Button(this).apply {
                text = "Open Google Play Store"
                setBackgroundResource(R.drawable.btn_primary)
                setTextColor(ContextCompat.getColor(this@MainActivity, R.color.text_white))
                setOnClickListener {
                    try {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.google.android.webview")))
                    } catch (e: Exception) {
                        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.webview")))
                    }
                }
            }
            root.addView(title)
            root.addView(msg)
            root.addView(btn)
            setContentView(root)
        } catch (e: Exception) {
            Toast.makeText(this, "WebView error: ${error.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }

    private fun handleUrlNavigation(url: String): Boolean {
        val uri = Uri.parse(url)
        val serverUri = Uri.parse(getServerUrl())

        // 1. External problem links: LeetCode problems should open in external browser or LeetCode app
        if (uri.host?.contains("leetcode.com", ignoreCase = true) == true) {
            openExternalUri(uri)
            return true
        }

        // 2. Non-http/https schemes (mailto:, tel:, intent:, etc.)
        val scheme = uri.scheme?.lowercase()
        if (scheme != "http" && scheme != "https") {
            openExternalUri(uri)
            return true
        }

        // 3. Different domain from current CodeSync server (e.g. GitHub link, external docs)
        val currentHost = serverUri.host
        val targetHost = uri.host
        if (currentHost != null && targetHost != null && !targetHost.equals(currentHost, ignoreCase = true)) {
            openExternalUri(uri)
            return true
        }

        // Internal navigation within CodeSync
        return false
    }

    private fun openExternalUri(uri: Uri) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, uri)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } catch (e: Exception) {
            Toast.makeText(this, "Could not open link: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupSwipeRefresh() {
        swipeRefreshLayout.setColorSchemeResources(R.color.primary, R.color.accent)
        swipeRefreshLayout.setProgressBackgroundColorSchemeResource(R.color.surface_dark)
        // Permanently disable swipeRefreshLayout gesture interception so that normal
        // user scrolling and swiping upward inside the WebView never triggers an accidental page reload.
        swipeRefreshLayout.isEnabled = false
        swipeRefreshLayout.setOnRefreshListener {
            webView.reload()
        }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (errorOverlay.visibility == View.VISIBLE) {
                    finish()
                    return
                }

                if (::webView.isInitialized && webView.parent != null && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    if (System.currentTimeMillis() - backPressedTime < 2000) {
                        finish()
                    } else {
                        backPressedTime = System.currentTimeMillis()
                        Toast.makeText(this@MainActivity, getString(R.string.exit_toast), Toast.LENGTH_SHORT).show()
                    }
                }
            }
        })
    }

    private fun loadServerUrl() {
        if (!isNetworkAvailable()) {
            showError("No internet connection available. Please connect to Wi-Fi or mobile data.")
            return
        }

        if (::webView.isInitialized && webView.parent != null) {
            val url = getServerUrl()
            webView.loadUrl(url)
        }
    }

    private fun getServerUrl(): String {
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_SERVER_URL, BuildConfig.SERVER_URL) ?: BuildConfig.SERVER_URL
    }

    private fun setServerUrl(url: String) {
        val normalizedUrl = if (!url.startsWith("http://") && !url.startsWith("https://")) {
            "https://$url"
        } else {
            url
        }
        val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_SERVER_URL, normalizedUrl).apply()
    }

    private fun showServerConfigDialog() {
        val input = EditText(this)
        input.setText(getServerUrl())
        input.setSelection(input.text.length)
        input.setTextColor(ContextCompat.getColor(this, R.color.text_white))
        input.setHintTextColor(ContextCompat.getColor(this, R.color.text_muted))
        input.setBackgroundResource(R.drawable.bg_card)
        input.setPadding(32, 24, 32, 24)

        val container = LinearLayout(this)
        container.setPadding(48, 24, 48, 8)
        container.addView(input)

        AlertDialog.Builder(this)
            .setTitle(getString(R.string.dialog_server_title))
            .setMessage(getString(R.string.dialog_server_message))
            .setView(container)
            .setPositiveButton(getString(R.string.btn_save)) { _, _ ->
                val newUrl = input.text.toString().trim()
                if (newUrl.isNotEmpty()) {
                    setServerUrl(newUrl)
                    showSplash()
                    loadServerUrl()
                }
            }
            .setNegativeButton(getString(R.string.btn_cancel), null)
            .show()
    }

    private fun showSplash() {
        splashOverlay.visibility = View.VISIBLE
        splashOverlay.alpha = 1.0f
        errorOverlay.visibility = View.GONE
    }

    private fun hideSplashWithAnimation() {
        splashOverlay.animate()
            .alpha(0.0f)
            .setDuration(350)
            .withEndAction {
                splashOverlay.visibility = View.GONE
            }
            .start()
    }

    private fun showError(description: String?) {
        swipeRefreshLayout.isRefreshing = false
        pageProgressBar.visibility = View.GONE
        splashOverlay.visibility = View.GONE
        errorOverlay.visibility = View.VISIBLE

        if (!description.isNullOrEmpty()) {
            errorDescriptionText.text = description
        } else {
            errorDescriptionText.text = getString(R.string.error_connection_desc)
        }
    }

    private fun isNetworkAvailable(): Boolean {
        return try {
            val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val network = cm.activeNetwork ?: return false
                val actNw = cm.getNetworkCapabilities(network) ?: return false
                actNw.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            } else {
                @Suppress("DEPRECATION")
                val netInfo = cm.activeNetworkInfo
                @Suppress("DEPRECATION")
                netInfo != null && netInfo.isConnected
            }
        } catch (e: Exception) {
            true // Fail open to avoid blocking legitimate launches
        }
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        if (level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) {
            try {
                if (::webView.isInitialized && webView.parent != null) {
                    webView.clearCache(false)
                }
            } catch (ignored: Exception) {}
        }
    }

    override fun onResume() {
        super.onResume()
        if (::webView.isInitialized && webView.parent != null) {
            webView.onResume()
        }
    }

    override fun onPause() {
        super.onPause()
        if (::webView.isInitialized && webView.parent != null) {
            webView.onPause()
        }
    }

    override fun onDestroy() {
        try {
            if (::webView.isInitialized) {
                (webView.parent as? ViewGroup)?.removeView(webView)
                webView.stopLoading()
                webView.clearHistory()
                webView.removeAllViews()
                webView.destroy()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error cleaning up WebView in onDestroy", e)
        }
        super.onDestroy()
    }

    inner class NativeAuthBridge {
        @JavascriptInterface
        fun syncAuth(token: String?, userId: String?, username: String?) {
            if (!token.isNullOrEmpty()) {
                val cleanToken = token.trim().removeSurrounding("\"")
                AuthStorage.saveAuth(this@MainActivity, cleanToken, userId, username)
                try {
                    WidgetSyncWorker.enqueueImmediateSync(this@MainActivity)
                } catch (e: Exception) {
                    Log.w(TAG, "Sync enqueue error: ${e.message}")
                }
            }
        }

        @JavascriptInterface
        fun logout() {
            AuthStorage.clearAuth(this@MainActivity)
            try {
                WidgetSyncWorker.enqueueImmediateSync(this@MainActivity)
            } catch (e: Exception) {
                Log.w(TAG, "Logout sync enqueue error: ${e.message}")
            }
        }
    }
}
