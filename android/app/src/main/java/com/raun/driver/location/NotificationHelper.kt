package com.raun.driver.location

import android.app.*
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat

object NotificationHelper {

    fun getNotification(context: Context): Notification {
        val channelId = "location_channel"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(channelId, "Location Tracking", NotificationManager.IMPORTANCE_LOW)
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(context, channelId)
            .setContentTitle("Tracking location")
            .setContentText("App is running in background")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()
    }
}
