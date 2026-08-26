import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { knowledgeService } from '@services';

const initialState = {
  items: [],
  selected: null,
  loading: false,
  submitting: false,
  error: null,
  meta: {
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
  search: '',
  filters: {},
};

export const fetchKnowledge = createAsyncThunk(
  'knowledge/fetchKnowledge',
  async (params, { rejectWithValue }) => {
    try {
      const res = await knowledgeService.getKnowledge(params);
      return res;
    } catch (err) {
      return rejectWithValue(
        err.data?.message || err.message || 'Failed to load knowledge topics.',
      );
    }
  },
);

export const fetchKnowledgeItem = createAsyncThunk(
  'knowledge/fetchKnowledgeItem',
  async (id, { rejectWithValue }) => {
    try {
      const res = await knowledgeService.getKnowledgeById(id);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load knowledge topic.');
    }
  },
);

export const createKnowledge = createAsyncThunk(
  'knowledge/createKnowledge',
  async (data, { rejectWithValue, dispatch }) => {
    try {
      const res = await knowledgeService.createKnowledge(data);
      dispatch(fetchKnowledge());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.data?.message || err.message || 'Failed to create knowledge topic.',
      );
    }
  },
);

export const updateKnowledge = createAsyncThunk(
  'knowledge/updateKnowledge',
  async ({ id, data }, { rejectWithValue, dispatch }) => {
    try {
      const res = await knowledgeService.updateKnowledge(id, data);
      dispatch(fetchKnowledge());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.data?.message || err.message || 'Failed to update knowledge topic.',
      );
    }
  },
);

export const deleteKnowledge = createAsyncThunk(
  'knowledge/deleteKnowledge',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const res = await knowledgeService.deleteKnowledge(id);
      dispatch(fetchKnowledge());
      return res;
    } catch (err) {
      return rejectWithValue(
        err.data?.message || err.message || 'Failed to delete knowledge topic.',
      );
    }
  },
);

const knowledgeSlice = createSlice({
  name: 'knowledge',
  initialState,
  reducers: {
    resetKnowledge: () => initialState,
    resetSelectedKnowledge: (state) => {
      state.selected = null;
    },
    resetKnowledgeError: (state) => {
      state.error = null;
    },
    setKnowledgeSearch: (state, action) => {
      state.search = action.payload;
    },
    setKnowledgeFilters: (state, action) => {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchKnowledge.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchKnowledge.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
      })
      .addCase(fetchKnowledge.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load knowledge topics.';
      })
      .addCase(fetchKnowledgeItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchKnowledgeItem.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchKnowledgeItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load knowledge topic.';
      })
      .addCase(createKnowledge.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createKnowledge.fulfilled, (state) => {
        state.submitting = false;
        state.selected = null;
      })
      .addCase(createKnowledge.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to create knowledge topic.';
      })
      .addCase(updateKnowledge.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateKnowledge.fulfilled, (state, action) => {
        state.submitting = false;
        state.selected = action.payload;
      })
      .addCase(updateKnowledge.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to update knowledge topic.';
      })
      .addCase(deleteKnowledge.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteKnowledge.fulfilled, (state) => {
        state.submitting = false;
        state.selected = null;
      })
      .addCase(deleteKnowledge.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to delete knowledge topic.';
      });
  },
});

export const {
  resetKnowledge,
  resetSelectedKnowledge,
  resetKnowledgeError,
  setKnowledgeSearch,
  setKnowledgeFilters,
} = knowledgeSlice.actions;

export const selectKnowledge = (state) => state.knowledge?.items ?? [];
export const selectSelectedKnowledge = (state) => state.knowledge?.selected ?? null;
export const selectKnowledgeLoading = (state) => state.knowledge?.loading ?? false;
export const selectKnowledgeSubmitting = (state) => state.knowledge?.submitting ?? false;
export const selectKnowledgeError = (state) => state.knowledge?.error ?? null;
export const selectKnowledgeMeta = (state) => state.knowledge?.meta ?? initialState.meta;
export const selectKnowledgeSearch = (state) => state.knowledge?.search ?? '';
export const selectKnowledgeFilters = (state) => state.knowledge?.filters ?? {};
export const selectItems = selectKnowledge;
export const selectSelected = selectSelectedKnowledge;
export const selectLoading = selectKnowledgeLoading;
export const selectError = selectKnowledgeError;
export const selectMeta = selectKnowledgeMeta;

export default knowledgeSlice.reducer;
