import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { resourcesService } from '@services';

const initialState = {
  items: [],
  selected: null,
  loading: false,
  submitting: false,
  uploading: false,
  uploadProgress: 0,
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

export const fetchResources = createAsyncThunk(
  'resources/fetchResources',
  async (params, { rejectWithValue }) => {
    try {
      const res = await resourcesService.getResources(params);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load resources.');
    }
  },
);

export const fetchResource = createAsyncThunk(
  'resources/fetchResource',
  async (id, { rejectWithValue }) => {
    try {
      const res = await resourcesService.getResourceById(id);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load resource.');
    }
  },
);

export const uploadResource = createAsyncThunk(
  'resources/uploadResource',
  async ({ formData, onProgress }, { rejectWithValue, dispatch }) => {
    try {
      const res = await resourcesService.uploadResource(formData, (pct) => {
        dispatch(setUploadProgress(pct));
        if (typeof onProgress === 'function') onProgress(pct);
      });
      dispatch(fetchResources());
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to upload resource.');
    }
  },
);

export const deleteResource = createAsyncThunk(
  'resources/deleteResource',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const res = await resourcesService.deleteResource(id);
      dispatch(fetchResources());
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to delete resource.');
    }
  },
);

const resourcesSlice = createSlice({
  name: 'resources',
  initialState,
  reducers: {
    resetResources: () => initialState,
    resetSelectedResource: (state) => {
      state.selected = null;
    },
    resetResourcesError: (state) => {
      state.error = null;
    },
    setResourcesSearch: (state, action) => {
      state.search = action.payload;
    },
    setResourcesFilters: (state, action) => {
      state.filters = action.payload;
    },
    setUploadProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    resetUploadProgress: (state) => {
      state.uploadProgress = 0;
      state.uploading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
      })
      .addCase(fetchResources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load resources.';
      })
      .addCase(fetchResource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResource.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchResource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load resource.';
      })
      .addCase(uploadResource.pending, (state) => {
        state.uploading = true;
        state.submitting = true;
        state.uploadProgress = 0;
        state.error = null;
      })
      .addCase(uploadResource.fulfilled, (state) => {
        state.uploading = false;
        state.submitting = false;
        state.uploadProgress = 100;
      })
      .addCase(uploadResource.rejected, (state, action) => {
        state.uploading = false;
        state.submitting = false;
        state.uploadProgress = 0;
        state.error = action.payload || 'Failed to upload resource.';
      })
      .addCase(deleteResource.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteResource.fulfilled, (state) => {
        state.submitting = false;
        state.selected = null;
      })
      .addCase(deleteResource.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to delete resource.';
      });
  },
});

export const {
  resetResources,
  resetSelectedResource,
  resetResourcesError,
  setResourcesSearch,
  setResourcesFilters,
  setUploadProgress,
  resetUploadProgress,
} = resourcesSlice.actions;

export const selectResources = (state) => state.resources?.items ?? [];
export const selectSelectedResource = (state) => state.resources?.selected ?? null;
export const selectResourcesLoading = (state) => state.resources?.loading ?? false;
export const selectResourcesSubmitting = (state) => state.resources?.submitting ?? false;
export const selectResourcesUploading = (state) => state.resources?.uploading ?? false;
export const selectUploadProgress = (state) => state.resources?.uploadProgress ?? 0;
export const selectResourcesError = (state) => state.resources?.error ?? null;
export const selectResourcesMeta = (state) => state.resources?.meta ?? initialState.meta;
export const selectResourcesSearch = (state) => state.resources?.search ?? '';
export const selectResourcesFilters = (state) => state.resources?.filters ?? {};
export const selectItems = selectResources;
export const selectSelected = selectSelectedResource;
export const selectLoading = selectResourcesLoading;
export const selectError = selectResourcesError;
export const selectMeta = selectResourcesMeta;

export default resourcesSlice.reducer;
