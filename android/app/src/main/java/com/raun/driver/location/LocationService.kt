package com.raun.driver.location

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import com.google.android.gms.location.*

class LocationService : Service() {

    private lateinit var fusedClient: FusedLocationProviderClient

    override fun onCreate() {
        super.onCreate()
        fusedClient = LocationServices.getFusedLocationProviderClient(this)
        startForeground(1, NotificationHelper.getNotification(this))
        startUpdates()
    }

    private fun startUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 10000).build()

        val callback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                val loc = result.lastLocation ?: return
                LocationModuleHolder.instance?.sendLocationToJS(loc.latitude, loc.longitude)
            }
        }

        fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper())
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
