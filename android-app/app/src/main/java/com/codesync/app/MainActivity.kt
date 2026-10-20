package com.codesync.app

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
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
        private const val PREFS_NAME = "codesync_prefs"
        private const val KEY_SERVER_URL = "server_url"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        // Apply main theme before setContentView to clear splash window background
        setTheme(R.style.Theme_CodeSync)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupStatusBarAndNavigationBar()
        initViews()
        setupWebView()
        setupSwipeRefresh()
        setupBackNavigation()

        AuthStorage.setServerUrl(this, getServerUrl())
        WidgetSyncWorker.schedulePeriodicSync(this)

        loadServerUrl()
    }

    private fun setupStatusBarAndNavigationBar() {
        window.statusBarColor = getColor(R.color.background_dark)
        window.navigationBarColor = getColor(R.color.background_dark)

        WindowCompat.setDecorFitsSystemWindows(window, true)
        val insetsController = WindowInsetsControllerCompat(window, window.decorView)
        // White/light icons on dark background
        insetsController.isAppearanceLightStatusBars = false
        insetsController.isAppearanceLightNavigationBars = false
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
            loadServerUrl()
        }

        btnConfigServer.setOnClickListener {
            showServerConfigDialog()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView.setBackgroundColor(getColor(R.color.background_dark))

        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(false)
        settings.displayZoomControls = false
        settings.mediaPlaybackRequiresUserGesture = false

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        }
        CookieManager.getInstance().setAcceptCookie(true)

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

                // Probe and sync existing session token from localStorage if present
                view?.evaluateJavascript(
                    "(function() { try { var token = localStorage.getItem('codesync_token'); if (token && window.CodeSyncNative) { window.CodeSyncNative.syncAuth(token, '', ''); } } catch(e){} })();",
                    null
                )
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                // Only show fullscreen error if the main frame failed to load
                if (request?.isForMainFrame == true) {
                    showError(error?.description?.toString())
                }
            }
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

                if (webView.canGoBack()) {
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

        val url = getServerUrl()
        webView.loadUrl(url)
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
        input.setTextColor(getColor(R.color.text_white))
        input.setHintTextColor(getColor(R.color.text_muted))
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
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = connectivityManager.activeNetwork ?: return false
        val actNw = connectivityManager.getNetworkCapabilities(network) ?: return false
        return actNw.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        webView.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    inner class NativeAuthBridge {
        @JavascriptInterface
        fun syncAuth(token: String?, userId: String?, username: String?) {
            if (!token.isNullOrEmpty()) {
                val cleanToken = token.trim().removeSurrounding("\"")
                AuthStorage.saveAuth(this@MainActivity, cleanToken, userId, username)
                WidgetSyncWorker.enqueueImmediateSync(this@MainActivity)
            }
        }

        @JavascriptInterface
        fun logout() {
            AuthStorage.clearAuth(this@MainActivity)
            WidgetSyncWorker.enqueueImmediateSync(this@MainActivity)
        }
    }
}
