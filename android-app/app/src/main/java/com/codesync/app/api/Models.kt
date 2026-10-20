package com.codesync.app.api

data class ListSummary(
    val id: String,
    val name: String,
    val inviteCode: String,
    val totalProblems: Int,
    val solvedCount: Int
)

data class ProblemItem(
    val id: String,
    val title: String,
    val difficulty: String,
    val url: String,
    val topic: String,
    val isSolved: Boolean
)

data class ListDetailResponse(
    val id: String,
    val name: String,
    val totalProblems: Int,
    val solvedCount: Int,
    val completionPercentage: Int,
    val problems: List<ProblemItem>
)

data class DailyMissionResponse(
    val dailyTarget: Int,
    val completedToday: Int,
    val remaining: Int,
    val progressPercentage: Int,
    val nextProblem: ProblemItem?
)

data class LeaderboardMember(
    val rank: Int,
    val userId: String,
    val username: String,
    val avatar: String,
    val totalSolved: Int
)

data class LeaderboardResponse(
    val listId: String,
    val listName: String,
    val totalMembers: Int,
    val leaderboard: List<LeaderboardMember>
)

data class ToggleSolveResult(
    val success: Boolean,
    val problemId: String,
    val isSolved: Boolean,
    val completedToday: Int,
    val dailyTarget: Int
)
