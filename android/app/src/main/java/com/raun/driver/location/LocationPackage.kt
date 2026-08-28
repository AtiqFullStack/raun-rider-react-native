package com.raun.driver.location

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class LocationPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext)
            : List<NativeModule> {
        return listOf(LocationModule(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
