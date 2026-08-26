import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '@services/auth.service.js';

const STORAGE_KEYS = {
  USER: 'eduos_user',
  ACCESS: 'accessToken',
  REFRESH: 'refreshToken',
};

const loadInitialState = () => {
  let user = null;
  let accessToken = null;
  let refreshToken = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (raw) {
      user = JSON.parse(raw);
    }
    accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS);
    refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH);
  } catch (_) {}
  const isAuthenticated = Boolean(accessToken && user);
  return {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading: false,
    isInitializing: !!accessToken,
    error: null,
  };
};

const persistAuth = (user, accessToken, refreshToken) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }
    if (accessToken) {
      localStorage.setItem(STORAGE_KEYS.ACCESS, accessToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACCESS);
    }
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH, refreshToken);
    } else {
      localStorage.removeItem(STORAGE_KEYS.REFRESH);
    }
  } catch (_) {}
};

const clearAuth = () => {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.ACCESS);
    localStorage.removeItem(STORAGE_KEYS.REFRESH);
  } catch (_) {}
};

const applyResult = (state, result) => {
  const user = result?.user ?? null;
  const accessToken = result?.tokens?.accessToken ?? null;
  const refreshToken = result?.tokens?.refreshToken ?? null;
  state.user = user;
  state.accessToken = accessToken;
  state.refreshToken = refreshToken;
  state.isAuthenticated = Boolean(accessToken && user);
  persistAuth(user, accessToken, refreshToken);
};

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const res = await authService.register(payload);
    return res;
  } catch (err) {
    return rejectWithValue(err.data?.message || err.message || 'Registration failed.');
  }
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const res = await authService.login(payload);
    return res;
  } catch (err) {
    return rejectWithValue(err.data?.message || err.message || 'Sign in failed.');
  }
});

export const getCurrentUser = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue, getState }) => {
    const state = getState();
    if (!state.auth?.accessToken) {
      return rejectWithValue('No access token.');
    }
    try {
      const res = await authService.me();
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load profile.');
    }
  },
);

export const refreshSession = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue, getState }) => {
    const state = getState();
    const token = state.auth?.refreshToken;
    if (!token) {
      return rejectWithValue('No refresh token.');
    }
    try {
      const res = await authService.refresh(token);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Session expired.');
    }
  },
);

export const logout = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try {
    await authService.logout();
  } catch (_) {}
  clearAuth();
  return null;
});

const initialState = loadInitialState();

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    resetError: (state) => {
      state.error = null;
    },
    clearAuthState: (state) => {
      clearAuth();
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.isLoading = false;
        applyResult(state, action.payload);
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Registration failed.';
      })
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        applyResult(state, action.payload);
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Sign in failed.';
      })
      .addCase(getCurrentUser.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isInitializing = false;
        state.user = action.payload;
        state.isAuthenticated = Boolean(state.accessToken && action.payload);
        try {
          if (action.payload) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(action.payload));
          }
        } catch (_) {}
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isInitializing = false;
        clearAuth();
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        applyResult(state, action.payload);
      })
      .addCase(refreshSession.rejected, (state) => {
        clearAuth();
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.error = null;
      });
  },
});

export const { resetError, clearAuthState } = authSlice.actions;

export const selectUser = (state) => state.auth?.user ?? null;
export const selectIsAuthenticated = (state) => state.auth?.isAuthenticated ?? false;
export const selectAuthLoading = (state) => state.auth?.isLoading ?? false;
export const selectAuthError = (state) => state.auth?.error ?? null;
export const selectAuthInitializing = (state) => state.auth?.isInitializing ?? false;
export const selectAccessToken = (state) => state.auth?.accessToken ?? null;

export default authSlice.reducer;
