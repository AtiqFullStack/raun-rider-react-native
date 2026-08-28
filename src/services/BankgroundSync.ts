import ReactNativeForegroundService from "@supersami/rn-foreground-service";
// import { startTracking, stopTracking } from './locationChannel.ts'
import { startTracking, stopTracking } from './bgLocationChannel'
import { Linking, PermissionsAndroid, Platform } from "react-native";

type ShowModalFn = (onAllow: () => void, onDeny: () => void) => void;
let _showModal: ShowModalFn | null = null;

export const registerLocationModalHandler = (fn: ShowModalFn) => {
    _showModal = fn;
};

class ForegroundService {
    constructor() { }

    static _startTime: number = 0;
    static _notifInterval: ReturnType<typeof setInterval> | null = null;

    static _updateNotification = () => {
        const elapsed = Math.floor((Date.now() - ForegroundService._startTime) / 1000);
        const hrs = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const mins = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');

        ReactNativeForegroundService.update({
            id: 1244,
            title: '🟢 Online',
            // message: `Tracking running • ${hrs}:${mins}:${secs}`,
            message: `You are now online`,
            icon: 'ic_launcher',
            ongoing: true,
            visibility: 'public',
        });
    };

    static addTask = () => {
        ReactNativeForegroundService.add_task(ForegroundService._updateNotification, {
            delay: 1000,
            onLoop: true,
            taskId: "taskid",
            onError: (e) => console.log("Error logging:", e),
        });
    };

    static removeTask = () => {
        ReactNativeForegroundService.remove_task("taskid");
    };

    static start = async () => {
        console.log("🔥 START SERVICE CALLED");
        if (Platform.OS === 'ios') {
            await startTracking();
            return;
        }

        const hasLocation = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );

        if (!hasLocation) {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );
            if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                console.log("❌ Location permission denied");
                return;
            }
        }

        if (Platform.Version >= 29) {
            const hasBackground = await PermissionsAndroid.check(
                PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
            );

            if (!hasBackground) {
                if (!_showModal) {
                    console.log("❌ Modal handler not registered");
                    return;
                }

                const userConsented = await new Promise<boolean>(resolve => {
                    _showModal!(resolve.bind(null, true), resolve.bind(null, false));
                });

                if (!userConsented) {
                    console.log("❌ User declined background location");
                    return;
                }

                // Android 11+ (API 30+) — direct request nahi hota, Settings mein bhejna padta hai
                if (Platform.Version >= 30) {
                    Linking.openSettings();
                    return;
                }

                const bgGranted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
                );
                if (bgGranted !== PermissionsAndroid.RESULTS.GRANTED) {
                    console.log("❌ Background location denied");
                    return;
                }
            }
        }

        ForegroundService._startTime = Date.now();

        await ReactNativeForegroundService.start({
            id: 1244,
            title: '🟢 Online',
            message: 'You are now online',
            icon: 'ic_launcher',
            ongoing: true,
            ServiceType: 'location',
            visibility: 'public',
        });

        ForegroundService.addTask();
        await startTracking();
    };

    // ✅ STOP SERVICE
    static stop = async () => {
        try {
            if (Platform.OS === 'ios') {
                await stopTracking();
                return;
            }

            ForegroundService.removeTask();
            await stopTracking();
            await ReactNativeForegroundService.stop();
        } catch (e) {
            console.log('❌ STOP ERROR', e);
        }
    };

}

export default ForegroundService;
