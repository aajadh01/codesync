package com.codesync.app.auth

import android.content.Context
import android.content.SharedPreferences
import com.codesync.app.BuildConfig

object AuthStorage {
    private const val PREFS_NAME = "codesync_secure_auth_prefs"
    private const val KEY_JWT_TOKEN = "jwt_token"
    private const val KEY_USER_ID = "user_id"
    private const val KEY_USERNAME = "username"
    private const val KEY_SERVER_URL = "server_url"

    // Widget specific preference prefixes
    private const val PREFIX_WIDGET_LIST_ID = "widget_list_id_"
    private const val PREFIX_WIDGET_LIST_NAME = "widget_list_name_"
    private const val PREFIX_WIDGET_DIFF = "widget_diff_"
    private const val PREFIX_WIDGET_TOPIC = "widget_topic_"
    private const val PREFIX_WIDGET_CACHE = "widget_cache_"

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun saveAuth(context: Context, token: String?, userId: String?, username: String?) {
        getPrefs(context).edit().apply {
            putString(KEY_JWT_TOKEN, token)
            putString(KEY_USER_ID, userId)
            putString(KEY_USERNAME, username)
            apply()
        }
    }

    fun getToken(context: Context): String? {
        return getPrefs(context).getString(KEY_JWT_TOKEN, null)
    }

    fun getUserId(context: Context): String? {
        return getPrefs(context).getString(KEY_USER_ID, null)
    }

    fun getUsername(context: Context): String? {
        return getPrefs(context).getString(KEY_USERNAME, null)
    }

    fun isLoggedIn(context: Context): Boolean {
        val token = getToken(context)
        return !token.isNullOrEmpty()
    }

    fun clearAuth(context: Context) {
        val prefs = getPrefs(context)
        val editor = prefs.edit()
        editor.remove(KEY_JWT_TOKEN)
        editor.remove(KEY_USER_ID)
        editor.remove(KEY_USERNAME)
        // Clear all widget cache entries on logout
        val allKeys = prefs.all.keys
        for (k in allKeys) {
            if (k.startsWith(PREFIX_WIDGET_CACHE)) {
                editor.remove(k)
            }
        }
        editor.apply()
    }

    fun getServerUrl(context: Context): String {
        return getPrefs(context).getString(KEY_SERVER_URL, BuildConfig.SERVER_URL)
            ?: BuildConfig.SERVER_URL
    }

    fun setServerUrl(context: Context, url: String) {
        val clean = if (!url.startsWith("http://") && !url.startsWith("https://")) {
            "https://$url"
        } else {
            url
        }
        getPrefs(context).edit().putString(KEY_SERVER_URL, clean).apply()
    }

    // Widget Configuration Persistence
    fun setWidgetListId(context: Context, appWidgetId: Int, listId: String, listName: String? = null) {
        getPrefs(context).edit().apply {
            putString(PREFIX_WIDGET_LIST_ID + appWidgetId, listId)
            if (listName != null) {
                putString(PREFIX_WIDGET_LIST_NAME + appWidgetId, listName)
            }
            apply()
        }
    }

    fun getWidgetListId(context: Context, appWidgetId: Int): String? {
        return getPrefs(context).getString(PREFIX_WIDGET_LIST_ID + appWidgetId, null)
    }

    fun getWidgetListName(context: Context, appWidgetId: Int): String? {
        return getPrefs(context).getString(PREFIX_WIDGET_LIST_NAME + appWidgetId, null)
    }

    /**
     * Fallback lookup: Returns the most recently configured list ID and name across all
     * widgets if an explicit widget ID mapping is unavailable or lost during IPC.
     */
    fun getFallbackWidgetList(context: Context): Pair<String, String>? {
        val prefs = getPrefs(context)
        for (k in prefs.all.keys) {
            if (k.startsWith(PREFIX_WIDGET_LIST_ID)) {
                val listId = prefs.getString(k, null)
                if (!listId.isNullOrEmpty()) {
                    val idSuffix = k.removePrefix(PREFIX_WIDGET_LIST_ID)
                    val listName = prefs.getString(PREFIX_WIDGET_LIST_NAME + idSuffix, "Group Focus")
                    return Pair(listId, listName ?: "Group Focus")
                }
            }
        }
        return null
    }

    fun setWidgetFilters(context: Context, appWidgetId: Int, difficulty: String, topic: String) {
        getPrefs(context).edit().apply {
            putString(PREFIX_WIDGET_DIFF + appWidgetId, difficulty)
            putString(PREFIX_WIDGET_TOPIC + appWidgetId, topic)
            apply()
        }
    }

    fun getWidgetDifficulty(context: Context, appWidgetId: Int): String {
        return getPrefs(context).getString(PREFIX_WIDGET_DIFF + appWidgetId, "All") ?: "All"
    }

    fun getWidgetTopic(context: Context, appWidgetId: Int): String {
        return getPrefs(context).getString(PREFIX_WIDGET_TOPIC + appWidgetId, "All") ?: "All"
    }

    fun saveWidgetCache(context: Context, cacheKey: String, json: String) {
        getPrefs(context).edit().putString(PREFIX_WIDGET_CACHE + cacheKey, json).apply()
    }

    fun getWidgetCache(context: Context, cacheKey: String): String? {
        return getPrefs(context).getString(PREFIX_WIDGET_CACHE + cacheKey, null)
    }

    fun removeWidgetConfig(context: Context, appWidgetId: Int) {
        getPrefs(context).edit().apply {
            remove(PREFIX_WIDGET_LIST_ID + appWidgetId)
            remove(PREFIX_WIDGET_LIST_NAME + appWidgetId)
            remove(PREFIX_WIDGET_DIFF + appWidgetId)
            remove(PREFIX_WIDGET_TOPIC + appWidgetId)
            remove(PREFIX_WIDGET_CACHE + appWidgetId)
            apply()
        }
    }
}
