import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chapterExplainerService } from '@services';

const initialState = {
  items: [],
  selected: null,
  loading: false,
  submitting: false,
  error: null,
};

export const fetchExplanations = createAsyncThunk(
  'chapterExplainer/fetchExplanations',
  async (params, { rejectWithValue }) => {
    try {
      const res = await chapterExplainerService.getExplanations(params);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load explanations.');
    }
  },
);

export const fetchExplanationById = createAsyncThunk(
  'chapterExplainer/fetchExplanationById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await chapterExplainerService.getExplanationById(id);
      return res;
    } catch (err) {
      return rejectWithValue(
        err.data?.message || err.message || 'Failed to load explanation details.',
      );
    }
  },
);

export const uploadExplanation = createAsyncThunk(
  'chapterExplainer/uploadExplanation',
  async (formData, { rejectWithValue, dispatch }) => {
    try {
      const res = await chapterExplainerService.uploadExplanation(formData);
      dispatch(fetchExplanations());
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to submit chapter.');
    }
  },
);

export const chatWithAiThunk = createAsyncThunk(
  'chapterExplainer/chatWithAi',
  async (prompt, { rejectWithValue }) => {
    try {
      const res = await chapterExplainerService.chatWithAi(prompt);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to generate response.');
    }
  },
);

const chapterExplainerSlice = createSlice({
  name: 'chapterExplainer',
  initialState,
  reducers: {
    resetSelected: (state) => {
      state.selected = null;
    },
    resetError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchExplanations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExplanations.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data || [];
      })
      .addCase(fetchExplanations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchExplanationById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExplanationById.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload.data || action.payload;
      })
      .addCase(fetchExplanationById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(uploadExplanation.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(uploadExplanation.fulfilled, (state, action) => {
        state.submitting = false;
        state.selected = action.payload.data || action.payload;
      })
      .addCase(uploadExplanation.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      })
      .addCase(chatWithAiThunk.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(chatWithAiThunk.fulfilled, (state) => {
        state.submitting = false;
      })
      .addCase(chatWithAiThunk.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload;
      });
  },
});

export const { resetSelected, resetError } = chapterExplainerSlice.actions;

export const selectExplanations = (state) => state.chapterExplainer?.items ?? [];
export const selectSelectedExplanation = (state) => state.chapterExplainer?.selected ?? null;
export const selectExplainerLoading = (state) => state.chapterExplainer?.loading ?? false;
export const selectExplainerSubmitting = (state) => state.chapterExplainer?.submitting ?? false;
export const selectExplainerError = (state) => state.chapterExplainer?.error ?? null;

export default chapterExplainerSlice.reducer;
