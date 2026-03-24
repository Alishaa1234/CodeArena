import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../authSlice";
import duelReducer from './duelSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        duel: duelReducer,   // ← moved inside reducer object
    },
});