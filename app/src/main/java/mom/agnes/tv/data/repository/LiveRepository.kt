package mom.agnes.tv.data.repository

import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.combine
import mom.agnes.tv.data.cache.LiveChannelDao
import mom.agnes.tv.data.cache.LiveChannelEntity
import mom.agnes.tv.data.xtream.XtreamClient
import mom.agnes.tv.data.xtream.XtreamConfig

class LiveRepository(
    private val dao: LiveChannelDao,
    private val client: XtreamClient,
    private val clock: () -> Long = System::currentTimeMillis
) {
    private val refreshState = MutableStateFlow(RefreshState())

    val snapshot: Flow<LiveSnapshot> = combine(dao.observeAll(), refreshState) { channels, state ->
        LiveSnapshot(
            channels = channels,
            refreshing = state.refreshing,
            stale = state.stale,
            lastError = state.lastError
        )
    }

    suspend fun refresh(config: XtreamConfig) {
        refreshState.value = refreshState.value.copy(refreshing = true)
        try {
            val remote = client.fetchLiveChannels(config)
            val refreshedAt = clock()
            val mapped = remote.mapIndexed { index, channel ->
                LiveChannelEntity(
                    streamId = channel.streamId,
                    name = channel.name,
                    logoUrl = channel.logoUrl,
                    currentProgramme = null,
                    refreshedAt = refreshedAt,
                    sortKey = index
                )
            }
            dao.replaceAll(mapped)
            refreshState.value = RefreshState(
                refreshing = true,
                stale = false,
                lastError = null
            )
        } catch (error: Throwable) {
            refreshState.value = RefreshState(
                refreshing = true,
                stale = true,
                lastError = sanitize(error.message, config)
            )
        } finally {
            refreshState.value = refreshState.value.copy(refreshing = false)
        }
    }

    private fun sanitize(message: String?, config: XtreamConfig): String {
        val fallback = "Αποτυχία ανανέωσης Live IPTV"
        return message
            ?.replace(config.username, "•••")
            ?.replace(config.password, "•••")
            ?.take(180)
            ?.takeIf { it.isNotBlank() }
            ?: fallback
    }

    private data class RefreshState(
        val refreshing: Boolean = false,
        val stale: Boolean = false,
        val lastError: String? = null
    )
}
