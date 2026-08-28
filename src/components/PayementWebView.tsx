import { Modal, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import React, { useEffect, useState, useRef } from 'react';
import { WebView } from 'react-native-webview';
import paymentService from '../services/paymentService';
import { useNavigation } from '@react-navigation/native';
import CrossIcon from '../assets/svg/cross.svg';

export default function PayementWebView({ onRefresh, data, onClose, params }: any) {
    const webviewRef = useRef<any>(null);

    const navigation = useNavigation();

    const { redirectUrl } = data;
    const { getPaymenStatus } = paymentService();

    const [status, setStatus] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [checked, setChecked] = useState(false);

    const isSuccess = status?.paid || status?.status === 'paid';
    const isCancelled = status?.status === 'cancelled';
    const isFailed = status?.status === 'failed';
    console.log(isSuccess)

    // 🔥 CLOSE RESET + CLEAR STORAGE
    const handleClose = () => {
        setStatus(null);
        setChecked(false);
        setCountdown(null);
        setLoading(false);

        // clear localStorage inside WebView
        webviewRef.current?.injectJavaScript(`
            localStorage.removeItem('paymentId');
            true;
        `);

        onClose();
    };

    // 🔥 COUNTDOWN AFTER SUCCESS
    const startCountdown = () => {
        let count = 5;
        setCountdown(count);

        const interval = setInterval(() => {
            count -= 1;

            if (count === 0) {
                clearInterval(interval);
                setCountdown(null);

                onRefresh?.();
                handleClose();
            } else {
                setCountdown(count);
            }
        }, 1000);
    };

    // 🔥 RESET WHEN NEW PAYMENT OPENS
    useEffect(() => {
        if (params?.paymentId) {
            setStatus(null);
            setChecked(false);
            setCountdown(null);
        }
    }, [params?.paymentId]);

    // 🔥 CHECK PAYMENT STATUS (ONLY ONCE)
    useEffect(() => {
        if (!params?.paymentId || checked) return;

        setLoading(true);

        getPaymenStatus(params.paymentId)
            .then((res) => {
                console.log(res, 'payStatus');

                setStatus(res);
                setChecked(true);

                if (res?.paid || res?.status === 'paid') {
                    startCountdown();
                }
                // 🔥 IMPORTANT: CLEAR PARAMS AFTER USE
                navigation.setParams({
                    paymentId: null,
                    payStatus: null,
                });
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => setLoading(false));

    }, [params?.paymentId]);

    return (
        <Modal visible animationType="slide" transparent onRequestClose={handleClose}>
            <View style={styles.overlay}>

                <View style={styles.sheet}>
                    <View style={styles.handle} />
                    <TouchableOpacity 
                    style={{ position: 'absolute', 
                    top: 8, right: 12, zIndex: 10,
                    backgroundColor: '#fff', padding: 6, borderRadius: 20,

                     }} onPress={handleClose}>
                        <CrossIcon />
                    </TouchableOpacity>

                    {/* ================= SUCCESS UI ================= */}
                    {isSuccess ? (
                        // ✅ SUCCESS UI
                        <View style={styles.successBox}>
                            <Text style={styles.icon}>🎉</Text>
                            <Text style={styles.successText}>Payment Successful</Text>

                            <View style={styles.card}>
                                <Text style={styles.label}>Amount Paid</Text>
                                <Text style={styles.amountText}> ${data?.amount}</Text>
                            </View>

                            <View style={styles.card}>
                                <Text style={styles.label}>Reference ID</Text>
                                <Text style={styles.refText}>{data?.reference}</Text>
                            </View>

                            {countdown !== null && (
                                <Text style={styles.countdown}>
                                    Closing in {countdown}...
                                </Text>
                            )}
                        </View>

                    ) : isCancelled ? (
                        // ❌ CANCELLED UI
                        <View style={styles.failBox}>
                            <Text style={styles.icon}>⚠️</Text>

                            <Text style={styles.failText}>
                                Payment Cancelled
                            </Text>

                            <Text style={styles.subText}>
                                You cancelled the payment.
                            </Text>

                            <View style={styles.card}>
                                <Text style={styles.label}>Reference ID</Text>
                                <Text style={styles.refText}>{status?.reference}</Text>
                            </View>

                            <Text style={styles.retryBtn} onPress={handleClose}>
                                Try Again
                            </Text>
                        </View>

                    ) : isFailed ? (
                        // ❌ FAILED UI
                        <View style={styles.failBox}>
                            <Text style={styles.icon}>❌</Text>

                            <Text style={styles.failText}>
                                Payment Failed
                            </Text>

                            <Text style={styles.subText}>
                                Something went wrong. Please try again.
                            </Text>

                            <Text style={styles.retryBtn} onPress={handleClose}>
                                Retry Payment
                            </Text>
                        </View>

                    ) : (
                        // ================= WEBVIEW =================
                        <WebView
                            ref={webviewRef}
                            key={params?.paymentId} // 🔥 force fresh reload
                            source={{ uri: redirectUrl || 'https://reactnative.dev/' }}
                            style={{ flex: 1 }}
                            javaScriptEnabled
                            domStorageEnabled
                            startInLoadingState
                            injectedJavaScript={`
                                (function () {
                                    const paymentId = "${data?.paymentId}";
                                    if (paymentId) {
                                        localStorage.setItem('paymentId', paymentId);
                                    }
                                })();
                                true;
                            `}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        height: '95%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        paddingTop: 12,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#ccc',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 8,
    },

    // ================= SUCCESS =================
    successBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#f6fff7',
    },

    icon: {
        fontSize: 55,
        marginBottom: 10,
    },

    successText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#16a34a',
        marginBottom: 20,
        textAlign: 'center',
    },

    card: {
        width: '100%',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 3,
    },

    label: {
        fontSize: 12,
        color: '#777',
        marginBottom: 5,
    },

    amountText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000',
    },

    refText: {
        fontSize: 14,
        color: '#333',
    },

    countdown: {
        marginTop: 20,
        fontSize: 14,
        color: '#666',
    },
    failBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        backgroundColor: '#fff7f7',
    },

    failText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#dc2626',
        marginBottom: 10,
    },

    subText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },

    retryBtn: {
        marginTop: 20,
        fontSize: 16,
        color: '#2563eb',
        fontWeight: '600',
    },
});