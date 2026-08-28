package com.trucknbike.customer.paynow

import com.facebook.react.bridge.*
import zw.co.paynow.core.Paynow
import zw.co.paynow.constants.MobileMoneyMethod
import zw.co.paynow.responses.MobileInitResponse

class PaynowModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PaynowModule"

    // ⚠️ Replace INTEGRATION_KEY with the correct key from your Paynow dashboard
    // Go to paynow.co.zw → Receive Payment → API Integration → find ID 24203 → copy the key
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

                val response: MobileInitResponse = paynow.sendMobile(
                    payment,
                    phone,
                    MobileMoneyMethod.ECOCASH
                )

                android.util.Log.d("PaynowModule", "success=${response.success()}")
                android.util.Log.d("PaynowModule", "pollUrl=${response.pollUrl()}")
                android.util.Log.d("PaynowModule", "instructions=${response.instructions()}")

                val result = Arguments.createMap()
                result.putBoolean("success", response.success())
                result.putString("pollUrl", response.pollUrl() ?: "")
                result.putString("instructions", response.instructions() ?: "")
                promise.resolve(result)

            } catch (e: Exception) {
                android.util.Log.e("PaynowModule", "Exception: ${e.message}", e)
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

                android.util.Log.d("PaynowPoll", "paid=${status.paid()}, status=${status.status}")

                val result = Arguments.createMap()
                result.putBoolean("paid", status.paid())
                result.putString("status", status.status?.toString() ?: "UNKNOWN")
                promise.resolve(result)

            } catch (e: Exception) {
                android.util.Log.e("PaynowPoll", "Poll error: ${e.message}", e)
                val result = Arguments.createMap()
                result.putBoolean("paid", false)
                result.putString("status", "ERROR")
                promise.resolve(result)
            }
        }.start()
    }
}
