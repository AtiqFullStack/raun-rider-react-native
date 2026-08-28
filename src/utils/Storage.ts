import AsyncStorage from "@react-native-async-storage/async-storage";

class StorageService {
    async setItem(key: any, value: any) {

        const isObject = typeof (value) === 'object'
        if (!isObject) {
            await AsyncStorage.setItem(key, value)
            
        } else {
            await AsyncStorage.setItem(key, JSON.stringify(value))
        }

    }

    async getItem(key: any) {
        const result = await AsyncStorage.getItem(key)
        if (!result) return null
        try {
            return JSON.parse(result)
        } catch (error) {
            return result
        }
    }

    async removeItem(key: any) {
        await AsyncStorage.removeItem(key)
    }
}

export default new StorageService() 