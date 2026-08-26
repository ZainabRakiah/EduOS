import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '@services/api.service.js';

const initialState = {
  plan: 'FREE',
  status: 'ACTIVE',
  isPremium: false,
  features: {
    dashboard: true,
    notes: true,
    resources: true,
    learning_history: true,
    formula_book: true,
    ai_explainer: false,
    mock_tests: false,
  },
  loading: false,
  error: null,
};

export const fetchSubscription = createAsyncThunk(
  'subscription/fetchSubscription',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/subscription/me');
      return res.data || res;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load subscription details.');
    }
  }
);

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {
    resetSubscriptionState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubscription.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubscription.fulfilled, (state, action) => {
        state.loading = false;
        state.plan = action.payload.plan || 'FREE';
        state.status = action.payload.status || 'ACTIVE';
        state.isPremium = action.payload.isPremium || false;
        state.features = action.payload.features || initialState.features;
      })
      .addCase(fetchSubscription.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { resetSubscriptionState } = subscriptionSlice.actions;

export const selectSubscription = (state) => state.subscription;
export const selectIsPremium = (state) => state.subscription?.isPremium ?? false;
export const selectFeatures = (state) => state.subscription?.features ?? initialState.features;

export default subscriptionSlice.reducer;
