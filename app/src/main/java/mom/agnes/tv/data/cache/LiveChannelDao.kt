package mom.agnes.tv.data.cache

import androidx.room.Dao
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Upsert
import kotlinx.coroutines.flow.Flow

@Dao
interface LiveChannelDao {
    @Query("SELECT * FROM live_channels ORDER BY sortKey, name")
    fun observeAll(): Flow<List<LiveChannelEntity>>

    @Query("SELECT * FROM live_channels ORDER BY sortKey, name")
    suspend fun getAll(): List<LiveChannelEntity>

    @Upsert
    suspend fun upsertAll(items: List<LiveChannelEntity>)

    @Query("DELETE FROM live_channels")
    suspend fun clear()

    @Transaction
    suspend fun replaceAll(items: List<LiveChannelEntity>) {
        clear()
        upsertAll(items)
    }
}
