package com.codesync.app.api

import android.content.Context
import com.codesync.app.auth.AuthStorage
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

object ApiClient {

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private val client = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(12, TimeUnit.SECONDS)
        .writeTimeout(12, TimeUnit.SECONDS)
        .build()

    private fun getBaseUrl(context: Context): String {
        var base = AuthStorage.getServerUrl(context).trim()
        if (base.endsWith("/")) {
            base = base.substring(0, base.length - 1)
        }
        return "$base/api"
    }

    private fun buildRequest(context: Context, url: String, method: String = "GET", body: String? = null): Request {
        val builder = Request.Builder().url(url)
        val token = AuthStorage.getToken(context)

        if (!token.isNullOrEmpty()) {
            builder.addHeader("Authorization", "Bearer $token")
        }
        builder.addHeader("Content-Type", "application/json")
        builder.addHeader("Accept", "application/json")

        when (method.uppercase()) {
            "POST" -> builder.post((body ?: "{}").toRequestBody(JSON_MEDIA_TYPE))
            "PUT" -> builder.put((body ?: "{}").toRequestBody(JSON_MEDIA_TYPE))
            "DELETE" -> builder.delete()
            else -> builder.get()
        }

        return builder.build()
    }

    fun getUserLists(context: Context): Result<List<ListSummary>> {
        return try {
            val url = "${getBaseUrl(context)}/widgets/lists"
            val request = buildRequest(context, url)
            client.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    return Result.failure(AuthException("Session expired. Please open CodeSync and log in."))
                }
                if (!response.isSuccessful) {
                    return Result.failure(IOException("Server returned status ${response.code}"))
                }
                val bodyStr = response.body?.string() ?: ""
                val json = JSONObject(bodyStr)
                val listsArray = json.optJSONArray("lists") ?: JSONArray()
                val list = mutableListOf<ListSummary>()
                for (i in 0 until listsArray.length()) {
                    val item = listsArray.getJSONObject(i)
                    list.add(
                        ListSummary(
                            id = item.getString("id"),
                            name = item.getString("name"),
                            inviteCode = item.optString("inviteCode", ""),
                            totalProblems = item.optInt("totalProblems", 0),
                            solvedCount = item.optInt("solvedCount", 0)
                        )
                    )
                }
                Result.success(list)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getListDetails(context: Context, listId: String): Result<ListDetailResponse> {
        return try {
            val url = "${getBaseUrl(context)}/widgets/list/$listId"
            val request = buildRequest(context, url)
            client.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    return Result.failure(AuthException("Session expired. Please log in."))
                }
                if (!response.isSuccessful) {
                    return Result.failure(IOException("Failed to fetch list: HTTP ${response.code}"))
                }
                val bodyStr = response.body?.string() ?: ""
                val json = JSONObject(bodyStr)
                val problemsArray = json.optJSONArray("problems") ?: JSONArray()
                val problems = mutableListOf<ProblemItem>()

                for (i in 0 until problemsArray.length()) {
                    val p = problemsArray.getJSONObject(i)
                    problems.add(
                        ProblemItem(
                            id = p.getString("id"),
                            title = p.getString("title"),
                            difficulty = p.optString("difficulty", "Medium"),
                            url = p.optString("url", "https://leetcode.com"),
                            topic = p.optString("topic", "General"),
                            isSolved = p.optBoolean("isSolved", false)
                        )
                    )
                }

                Result.success(
                    ListDetailResponse(
                        id = json.getString("id"),
                        name = json.getString("name"),
                        totalProblems = json.optInt("totalProblems", problems.size),
                        solvedCount = json.optInt("solvedCount", problems.count { it.isSolved }),
                        completionPercentage = json.optInt("completionPercentage", 0),
                        problems = problems
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun toggleProblemSolve(context: Context, problemId: String): Result<ToggleSolveResult> {
        return try {
            val url = "${getBaseUrl(context)}/widgets/solve-toggle"
            val payload = JSONObject().apply { put("problemId", problemId) }
            val request = buildRequest(context, url, "POST", payload.toString())

            client.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    return Result.failure(AuthException("Authentication required"))
                }
                if (!response.isSuccessful) {
                    return Result.failure(IOException("Failed to toggle solve: HTTP ${response.code}"))
                }
                val bodyStr = response.body?.string() ?: ""
                val json = JSONObject(bodyStr)
                Result.success(
                    ToggleSolveResult(
                        success = json.optBoolean("success", true),
                        problemId = json.getString("problemId"),
                        isSolved = json.optBoolean("isSolved", false),
                        completedToday = json.optInt("completedToday", 0),
                        dailyTarget = json.optInt("dailyTarget", 3)
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getDailyMission(context: Context): Result<DailyMissionResponse> {
        return try {
            val url = "${getBaseUrl(context)}/widgets/daily-mission"
            val request = buildRequest(context, url)
            client.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    return Result.failure(AuthException("Authentication required"))
                }
                if (!response.isSuccessful) {
                    return Result.failure(IOException("HTTP ${response.code}"))
                }
                val bodyStr = response.body?.string() ?: ""
                val json = JSONObject(bodyStr)
                var nextProblem: ProblemItem? = null
                if (json.has("nextProblem") && !json.isNull("nextProblem")) {
                    val p = json.getJSONObject("nextProblem")
                    nextProblem = ProblemItem(
                        id = p.getString("id"),
                        title = p.getString("title"),
                        difficulty = p.optString("difficulty", "Medium"),
                        url = p.optString("url", "https://leetcode.com"),
                        topic = p.optString("topic", "General"),
                        isSolved = p.optBoolean("isSolved", false)
                    )
                }

                Result.success(
                    DailyMissionResponse(
                        dailyTarget = json.optInt("dailyTarget", 3),
                        completedToday = json.optInt("completedToday", 0),
                        remaining = json.optInt("remaining", 0),
                        progressPercentage = json.optInt("progressPercentage", 0),
                        nextProblem = nextProblem
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun setDailyTarget(context: Context, target: Int): Result<Boolean> {
        return try {
            val url = "${getBaseUrl(context)}/widgets/daily-target"
            val payload = JSONObject().apply { put("target", target) }
            val request = buildRequest(context, url, "POST", payload.toString())
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) return Result.failure(IOException("Failed to set target"))
                Result.success(true)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getRandomChallenge(context: Context, difficulty: String, topic: String): Result<ProblemItem> {
        return try {
            val queryParams = mutableListOf<String>()
            if (difficulty != "All") queryParams.add("difficulty=$difficulty")
            if (topic != "All") queryParams.add("topic=$topic")
            val queryString = if (queryParams.isNotEmpty()) "?" + queryParams.joinToString("&") else ""
            val url = "${getBaseUrl(context)}/widgets/random-challenge$queryString"

            val request = buildRequest(context, url)
            client.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    return Result.failure(AuthException("Authentication required"))
                }
                if (!response.isSuccessful) {
                    return Result.failure(IOException("HTTP ${response.code}"))
                }
                val bodyStr = response.body?.string() ?: ""
                val json = JSONObject(bodyStr)
                val p = json.getJSONObject("problem")
                Result.success(
                    ProblemItem(
                        id = p.getString("id"),
                        title = p.getString("title"),
                        difficulty = p.optString("difficulty", "Medium"),
                        url = p.optString("url", "https://leetcode.com"),
                        topic = p.optString("topic", "General"),
                        isSolved = p.optBoolean("isSolved", false)
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun getListLeaderboard(context: Context, listId: String): Result<LeaderboardResponse> {
        return try {
            val url = "${getBaseUrl(context)}/widgets/leaderboard/$listId"
            val request = buildRequest(context, url)
            client.newCall(request).execute().use { response ->
                if (response.code == 401 || response.code == 403) {
                    return Result.failure(AuthException("Authentication required"))
                }
                if (!response.isSuccessful) {
                    return Result.failure(IOException("HTTP ${response.code}"))
                }
                val bodyStr = response.body?.string() ?: ""
                val json = JSONObject(bodyStr)
                val membersArray = json.optJSONArray("leaderboard") ?: JSONArray()
                val members = mutableListOf<LeaderboardMember>()

                for (i in 0 until membersArray.length()) {
                    val m = membersArray.getJSONObject(i)
                    members.add(
                        LeaderboardMember(
                            rank = m.optInt("rank", i + 1),
                            userId = m.getString("userId"),
                            username = m.getString("username"),
                            avatar = m.optString("avatar", "avatar1"),
                            totalSolved = m.optInt("totalSolved", 0)
                        )
                    )
                }

                Result.success(
                    LeaderboardResponse(
                        listId = json.getString("listId"),
                        listName = json.getString("listName"),
                        totalMembers = json.optInt("totalMembers", members.size),
                        leaderboard = members
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun addProblem(
        context: Context,
        title: String,
        difficulty: String,
        url: String,
        listId: String,
        topic: String
    ): Result<ProblemItem> {
        return try {
            val apiUrl = "${getBaseUrl(context)}/problems"
            val payload = JSONObject().apply {
                put("title", title)
                put("difficulty", difficulty)
                put("url", url)
                put("listId", listId)
                put("topic", topic)
            }
            val request = buildRequest(context, apiUrl, "POST", payload.toString())

            client.newCall(request).execute().use { response ->
                val bodyStr = response.body?.string() ?: ""
                if (response.code == 401 || response.code == 403) {
                    return Result.failure(AuthException("Authentication required"))
                }
                if (!response.isSuccessful) {
                    val errorMsg = try {
                        JSONObject(bodyStr).optString("message", "Failed to add problem")
                    } catch (e: Exception) {
                        "Failed to add problem: HTTP ${response.code}"
                    }
                    return Result.failure(IOException(errorMsg))
                }
                val json = JSONObject(bodyStr)
                Result.success(
                    ProblemItem(
                        id = json.getString("_id"),
                        title = json.getString("title"),
                        difficulty = json.getString("difficulty"),
                        url = json.getString("url"),
                        topic = json.optString("topic", "General"),
                        isSolved = false
                    )
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    class AuthException(message: String) : Exception(message)
}
