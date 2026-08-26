import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { settingsService } from '@services';

const initialState = {
  profile: null,
  loading: false,
  updating: false,
  error: null,
  successMessage: null,
};

export const fetchProfile = createAsyncThunk(
  'settings/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await settingsService.getProfile();
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load profile.');
    }
  },
);

export const updateProfile = createAsyncThunk(
  'settings/updateProfile',
  async (data, { rejectWithValue }) => {
    try {
      const res = await settingsService.updateProfile(data);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to update profile.');
    }
  },
);

export const changePassword = createAsyncThunk(
  'settings/changePassword',
  async (data, { rejectWithValue }) => {
    try {
      const res = await settingsService.changePassword(data);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to change password.');
    }
  },
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    resetSettings: () => initialState,
    resetSettingsError: (state) => {
      state.error = null;
    },
    resetSuccessMessage: (state) => {
      state.successMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load profile.';
      })
      .addCase(updateProfile.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.updating = false;
        state.profile = action.payload;
        state.successMessage = 'Profile updated successfully.';
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || 'Failed to update profile.';
      })
      .addCase(changePassword.pending, (state) => {
        state.updating = true;
        state.error = null;
        state.successMessage = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.updating = false;
        state.successMessage = 'Password changed successfully.';
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload || 'Failed to change password.';
      });
  },
});

export const { resetSettings, resetSettingsError, resetSuccessMessage } = settingsSlice.actions;

export const selectProfile = (state) => state.settings?.profile ?? null;
export const selectSettingsLoading = (state) => state.settings?.loading ?? false;
export const selectSettingsUpdating = (state) => state.settings?.updating ?? false;
export const selectSettingsError = (state) => state.settings?.error ?? null;
export const selectSuccessMessage = (state) => state.settings?.successMessage ?? null;

export default settingsSlice.reducer;
