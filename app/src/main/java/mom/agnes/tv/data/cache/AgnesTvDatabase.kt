package mom.agnes.tv.data.cache

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [LiveChannelEntity::class],
    version = 1,
    exportSchema = true
)
abstract class AgnesTvDatabase : RoomDatabase() {
    abstract fun liveChannelDao(): LiveChannelDao

    companion object {
        @Volatile
        private var instance: AgnesTvDatabase? = null

        fun get(context: Context): AgnesTvDatabase =
            instance ?: synchronized(this) {
                instance ?: Room.databaseBuilder(
                    context.applicationContext,
                    AgnesTvDatabase::class.java,
                    "agnes-tv.db"
                ).build().also { instance = it }
            }
    }
}
