import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { mockTestService } from '@services';

const initialState = {
  items: [],
  selected: null,
  attempt: null,
  attemptsList: [],
  loading: false,
  submitting: false,
  error: null,
};

export const fetchTests = createAsyncThunk(
  'mockTest/fetchTests',
  async (params, { rejectWithValue }) => {
    try {
      const res = await mockTestService.getMockTests(params);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load mock tests.');
    }
  },
);

export const fetchTestById = createAsyncThunk(
  'mockTest/fetchTestById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await mockTestService.getMockTestById(id);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load mock test details.');
    }
  },
);

export const deleteTest = createAsyncThunk(
  'mockTest/deleteTest',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      await mockTestService.deleteMockTest(id);
      dispatch(fetchTests());
      return id;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to delete mock test.');
    }
  },
);

export const submitTestAttemptThunk = createAsyncThunk(
  'mockTest/submitAttempt',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await mockTestService.submitAttempt(id, data);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to submit test attempt.');
    }
  },
);

export const fetchAttemptDetails = createAsyncThunk(
  'mockTest/fetchAttemptDetails',
  async (attemptId, { rejectWithValue }) => {
    try {
      const res = await mockTestService.getAttemptDetails(attemptId);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load attempt details.');
    }
  },
);

export const fetchUserAttempts = createAsyncThunk(
  'mockTest/fetchUserAttempts',
  async (_, { rejectWithValue }) => {
    try {
      const res = await mockTestService.getUserAttempts();
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load user attempts.');
    }
  },
);

const mockTestSlice = createSlice({
  name: 'mockTest',
  initialState,
  reducers: {
    resetSelectedTest: (state) => {
      state.selected = null;
    },
    resetAttempt: (state) => {
      state.attempt = null;
    },
    resetMockTestError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchTests
      .addCase(fetchTests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTests.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
      })
      .addCase(fetchTests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load mock tests.';
      })
      // fetchTestById
      .addCase(fetchTestById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTestById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchTestById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load mock test details.';
      })
      // deleteTest
      .addCase(deleteTest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTest.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(deleteTest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to delete mock test.';
      })
      // submitAttempt
      .addCase(submitTestAttemptThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitTestAttemptThunk.fulfilled, (state, action) => {
        state.submitting = false;
        state.attempt = action.payload;
      })
      .addCase(submitTestAttemptThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to submit test attempt.';
      })
      // fetchAttemptDetails
      .addCase(fetchAttemptDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAttemptDetails.fulfilled, (state, action) => {
        state.loading = false;
        state.attempt = action.payload;
      })
      .addCase(fetchAttemptDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load attempt details.';
      })
      // fetchUserAttempts
      .addCase(fetchUserAttempts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserAttempts.fulfilled, (state, action) => {
        state.loading = false;
        state.attemptsList = action.payload || [];
      })
      .addCase(fetchUserAttempts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load attempts list.';
      });
  },
});

export const { resetSelectedTest, resetAttempt, resetMockTestError } = mockTestSlice.actions;

export const selectMockTests = (state) => state.mockTest?.items ?? [];
export const selectSelectedMockTest = (state) => state.mockTest?.selected ?? null;
export const selectMockAttempt = (state) => state.mockTest?.attempt ?? null;
export const selectMockAttemptsList = (state) => state.mockTest?.attemptsList ?? [];
export const selectMockTestLoading = (state) => state.mockTest?.loading ?? false;
export const selectMockTestSubmitting = (state) => state.mockTest?.submitting ?? false;
export const selectMockTestError = (state) => state.mockTest?.error ?? null;

export default mockTestSlice.reducer;
