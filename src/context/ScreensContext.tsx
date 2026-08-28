import { StyleSheet, Text, View } from 'react-native'
import React, { createContext, useState } from 'react'
import { ResetData, Screen } from '../types/screens.types';

export const screenContext = createContext<any>(null)

export function ScreenProvider({ children }: { children: React.ReactNode }) {
    const [currentScreen, setCurrentScreen] = useState<Screen>('splash');
    const [resetData, setResetData] = useState<ResetData | null>(null);
    const [registerFormData, setRegisterFormData] = useState<any>(null)


    return (
        <screenContext.Provider value={{
            currentScreen,
            setCurrentScreen,
            resetData,
            setResetData,
            registerFormData,
            setRegisterFormData
        }}>
            {children}
        </screenContext.Provider>
    )
}

