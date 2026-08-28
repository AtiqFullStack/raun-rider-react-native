import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export const useAuth = () => {
    const _context = useContext(AuthContext)
    if (!_context) {
        throw new Error("useAuth must be used within a AuthProvider")
    }
    return _context
}