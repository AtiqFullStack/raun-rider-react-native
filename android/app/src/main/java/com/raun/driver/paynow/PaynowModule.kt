package com.raun.driver.paynow

import com.facebook.react.bridge.*
import zw.co.paynow.core.Paynow
import zw.co.paynow.constants.MobileMoneyMethod
import zw.co.paynow.responses.MobileInitResponse

class PaynowModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PaynowModule"

    private val INTEGRATION_ID = "24203"
    private val INTEGRATION_KEY = "66f92305-8ca4-4ed1-85c6-6e6ab5d04da4"

    @ReactMethod
    fun createPayment(amount: String, email: String, phone: String, promise: Promise) {
        Thread {
            try {
                val paynow = Paynow(INTEGRATION_ID, INTEGRATION_KEY)
                paynow.resultUrl = "https://truck-bikeload.com/backend/paynow/result"
                paynow.returnUrl = "https://truck-bikeload.com/backend/paynow/return"

                val payment = paynow.createPayment("Truck n Bike Order", email)
                payment.add("Order Payment", amount.toDouble())

                val response: MobileInitResponse = paynow.sendMobile(payment, phone, MobileMoneyMethod.ECOCASH)

                val result = Arguments.createMap()
                result.putBoolean("success", response.success())
                result.putString("pollUrl", response.pollUrl() ?: "")
                result.putString("instructions", response.instructions() ?: "")
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("PAYNOW_ERROR", e.message ?: "Unknown error")
            }
        }.start()
    }

    @ReactMethod
    fun checkPaymentStatus(pollUrl: String, promise: Promise) {
        Thread {
            try {
                val paynow = Paynow(INTEGRATION_ID, INTEGRATION_KEY)
                val status = paynow.pollTransaction(pollUrl)

                val result = Arguments.createMap()
                result.putBoolean("paid", status.paid())
                result.putString("status", status.status?.toString() ?: "UNKNOWN")
                promise.resolve(result)
            } catch (e: Exception) {
                val result = Arguments.createMap()
                result.putBoolean("paid", false)
                result.putString("status", "ERROR")
                promise.resolve(result)
            }
        }.start()
    }
}
