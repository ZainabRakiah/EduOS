import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { historyService } from '@services';

const initialState = {
  recent: [],
  viewed: [],
  edited: [],
  uploaded: [],
  studyChart: [],
  loading: false,
  error: null,
};

export const fetchRecent = createAsyncThunk(
  'history/fetchRecent',
  async (_, { rejectWithValue }) => {
    try {
      const res = await historyService.getRecent();
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load recent activity.');
    }
  },
);

export const fetchViewed = createAsyncThunk(
  'history/fetchViewed',
  async (_, { rejectWithValue }) => {
    try {
      const res = await historyService.getViewed();
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load viewed items.');
    }
  },
);

export const fetchEdited = createAsyncThunk(
  'history/fetchEdited',
  async (_, { rejectWithValue }) => {
    try {
      const res = await historyService.getEdited();
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load edited items.');
    }
  },
);

export const fetchUploaded = createAsyncThunk(
  'history/fetchUploaded',
  async (_, { rejectWithValue }) => {
    try {
      const res = await historyService.getUploaded();
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load uploaded items.');
    }
  },
);

export const fetchStudyChart = createAsyncThunk(
  'history/fetchStudyChart',
  async (days = 7, { rejectWithValue }) => {
    try {
      const res = await historyService.getStudyChart(days);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load study chart.');
    }
  },
);

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    resetHistory: () => initialState,
    resetHistoryError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecent.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRecent.fulfilled, (state, action) => {
        state.loading = false;
        state.recent = action.payload;
      })
      .addCase(fetchRecent.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load recent activity.';
      })
      .addCase(fetchViewed.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchViewed.fulfilled, (state, action) => {
        state.loading = false;
        state.viewed = action.payload;
      })
      .addCase(fetchViewed.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load viewed items.';
      })
      .addCase(fetchEdited.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEdited.fulfilled, (state, action) => {
        state.loading = false;
        state.edited = action.payload;
      })
      .addCase(fetchEdited.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load edited items.';
      })
      .addCase(fetchUploaded.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUploaded.fulfilled, (state, action) => {
        state.loading = false;
        state.uploaded = action.payload;
      })
      .addCase(fetchUploaded.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load uploaded items.';
      })
      .addCase(fetchStudyChart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStudyChart.fulfilled, (state, action) => {
        state.loading = false;
        state.studyChart = action.payload;
      })
      .addCase(fetchStudyChart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load study chart.';
      });
  },
});

export const { resetHistory, resetHistoryError } = historySlice.actions;

export const selectRecentHistory = (state) => state.history?.recent ?? [];
export const selectViewedHistory = (state) => state.history?.viewed ?? [];
export const selectEditedHistory = (state) => state.history?.edited ?? [];
export const selectUploadedHistory = (state) => state.history?.uploaded ?? [];
export const selectStudyChart = (state) => state.history?.studyChart ?? [];
export const selectHistoryLoading = (state) => state.history?.loading ?? false;
export const selectHistoryError = (state) => state.history?.error ?? null;

export default historySlice.reducer;
