package com.codesync.app

import android.app.Application
import android.util.Log
import androidx.appcompat.app.AppCompatDelegate

class CodeSyncApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // 1. Enable AppCompat vector drawable support on older Android devices
        AppCompatDelegate.setCompatVectorFromResourcesEnabled(true)

        // 2. Global uncaught exception logger to capture startup issues safely
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e("CodeSyncApp", "FATAL CRASH on thread '${thread.name}': ${throwable.message}", throwable)
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    override fun onLowMemory() {
        super.onLowMemory()
        Log.w("CodeSyncApp", "Low memory warning from Android OS")
    }

    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        Log.w("CodeSyncApp", "Memory trim signaled: level=$level")
    }
}
