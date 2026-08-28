import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import StorageService from '../utils/Storage'
import { useScreen } from '../hooks/useScreen'

type AuthContextType = {
    token: string | null
    user: any
    isLoggedIn: boolean
    authValue: any,
    fcmToken: any,
    setFcmToken: any,
    isOnline: boolean | null,
    setIsOnline: Function,
    setUser: Function
}

export const AuthContext = createContext<AuthContextType>({
    token: null,
    user: null,
    isLoggedIn: false,
    authValue: {
        signIn: async () => { },
        signOut: async () => { }
    },
    fcmToken: null,
    setFcmToken: (fcmToken: string) => { },
    isOnline: null,
    setIsOnline:
        () => { },
    setUser: (user: any) => { }

})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any>(null)
    const [token, setUserToken] = useState<string | null>(null)
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const [loading, setLoading] = useState(true)
    const [fcmToken, setFcmToken] = useState("")
    const [isOnline, setIsOnline] = useState(false)
    console.log("===", user)

    const { setCurrentScreen } = useScreen()

    // 🔄 Load stored auth on app start
    useEffect(() => {
        const loadAuth = async () => {
            const storedToken = await StorageService.getItem('token')
            const storedUser = await StorageService.getItem('user')

            if (storedToken) {
                setUserToken(storedToken)
                setIsLoggedIn(true)
                // setCurrentScreen('home')
            }

            if (storedUser) {
                setUser(storedUser)
            }

            setLoading(false)
        }

        loadAuth()
    }, [])


    useEffect(() => {
        if (user !== null && user !== undefined) {
            setIsOnline(user?.isOnline === true)
        }
    }, [user])
    const authValue = useMemo(
        () => ({
            signIn: async (token: string, user?: any, fcmToken?: string) => {

                setUserToken(token)
                setIsLoggedIn(true)
                if (user) setUser(user)
                if (fcmToken) await StorageService.setItem('fcmToken', fcmToken)

                await StorageService.setItem('token', token)
                setCurrentScreen('home')
                if (user) await StorageService.setItem('user', user)
            },

            signOut: async () => {
                setUserToken(null)
                setUser(null)
                setIsLoggedIn(false)
                setCurrentScreen('login')

                await StorageService.removeItem('token')
                await StorageService.removeItem('user')
            },
        }),
        []
    )

    if (loading) return null // splash / loader screen

    return (
        <AuthContext.Provider
            value={{
                token,
                user,
                setUser,
                isLoggedIn,
                authValue,
                fcmToken, setFcmToken,
                isOnline, setIsOnline
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
