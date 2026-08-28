package com.raun.driver.location

import android.content.Intent
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class LocationModule(private val reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    init {
        LocationModuleHolder.instance = this
    }

    override fun getName() = "LocationModule"

    @ReactMethod
    fun startTracking() {
        val intent = Intent(reactContext, LocationService::class.java)
        reactContext.startForegroundService(intent)
    }

    @ReactMethod
    fun stopTracking() {
        val intent = Intent(reactContext, LocationService::class.java)
        reactContext.stopService(intent)
    }

    fun sendLocationToJS(lat: Double, lng: Double) {
        val params = Arguments.createMap()
        params.putDouble("latitude", lat)
        params.putDouble("longitude", lng)

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("locationUpdate", params)
    }

    @ReactMethod
    fun addListener(eventName: String?) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
