import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosClient from "./utils/axiosClient";

export const registerUser = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/user/register", userData);
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      return data.user;
    } catch (error) {
      return rejectWithValue(error.displayMessage || "Registration failed");
    }
  }
);

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/user/login", credentials);
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      return data.user;
    } catch (error) {
      return rejectWithValue(error.displayMessage || "Login failed");
    }
  }
);

export const loginGoogle = createAsyncThunk(
  "auth/loginGoogle",
  async (credential, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.post("/user/google", { credential });
      if (data.token) {
        localStorage.setItem("token", data.token);
      }
      return data.user;
    } catch (error) {
      return rejectWithValue(error.displayMessage || "Google login failed");
    }
  }
);

export const checkAuth = createAsyncThunk(
  "auth/check",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await axiosClient.get("/user/check");
      return data.user;
    } catch (error) {
      localStorage.removeItem("token");
      return rejectWithValue(null);
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await axiosClient.post("/user/logout");
      localStorage.removeItem("token");
      return null;
    } catch (error) {
      localStorage.removeItem("token");
      return rejectWithValue(error.displayMessage || "Logout failed");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null; };
    const rejected = (state, action) => {
      state.loading = false;
      state.error = typeof action.payload === "string" ? action.payload : "Something went wrong";
      state.isAuthenticated = false;
      state.user = null;
    };

    builder
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = !!action.payload;
        state.user = action.payload;
      })
      .addCase(registerUser.rejected, rejected)

      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = !!action.payload;
        state.user = action.payload;
      })
      .addCase(loginUser.rejected, rejected)

      .addCase(loginGoogle.pending, pending)
      .addCase(loginGoogle.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = !!action.payload;
        state.user = action.payload;
      })
      .addCase(loginGoogle.rejected, rejected)

      .addCase(checkAuth.pending, pending)
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = !!action.payload;
        state.user = action.payload;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
      })

      .addCase(logoutUser.pending, pending)
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, rejected);
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
