import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dashboardService } from '@services';

const initialState = {
  stats: {
    totalNotes: 0,
    totalResources: 0,
    totalKnowledgeTopics: 0,
    totalStudyHours: 0,
  },
  chart: [],
  recentActivity: [],
  loading: false,
  error: null,
};

export const fetchDashboard = createAsyncThunk(
  'dashboard/fetchDashboard',
  async (days = 7, { rejectWithValue }) => {
    try {
      const res = await dashboardService.getDashboardData(days);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load dashboard.');
    }
  },
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    resetDashboard: () => initialState,
    resetDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboard.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = action.payload.stats;
        state.chart = action.payload.chart;
        state.recentActivity = action.payload.recentActivity;
      })
      .addCase(fetchDashboard.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load dashboard.';
      });
  },
});

export const { resetDashboard, resetDashboardError } = dashboardSlice.actions;

export const selectDashboardStats = (state) => state.dashboard?.stats ?? initialState.stats;
export const selectDashboardChart = (state) => state.dashboard?.chart ?? [];
export const selectRecentActivity = (state) => state.dashboard?.recentActivity ?? [];
export const selectDashboardLoading = (state) => state.dashboard?.loading ?? false;
export const selectDashboardError = (state) => state.dashboard?.error ?? null;

export default dashboardSlice.reducer;
