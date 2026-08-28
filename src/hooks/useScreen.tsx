import { useContext } from "react"
import { screenContext } from "../context/ScreensContext"

export const useScreen = () => {
    const _context = useContext(screenContext)
    if (!_context) {
        throw new Error("useScreen must be used within a ScreenProvider")
    }
    return _context
}