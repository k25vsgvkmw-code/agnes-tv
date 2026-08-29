package mom.agnes.tv.data.cache

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "live_channels")
data class LiveChannelEntity(
    @PrimaryKey val streamId: Int,
    val name: String,
    val logoUrl: String,
    val currentProgramme: String?,
    val refreshedAt: Long,
    val sortKey: Int
)
