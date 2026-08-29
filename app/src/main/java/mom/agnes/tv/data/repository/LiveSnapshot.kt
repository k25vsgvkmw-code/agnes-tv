package mom.agnes.tv.data.repository

import mom.agnes.tv.data.cache.LiveChannelEntity

data class LiveSnapshot(
    val channels: List<LiveChannelEntity>,
    val refreshing: Boolean,
    val stale: Boolean,
    val lastError: String?
)
