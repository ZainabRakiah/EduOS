import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notesService } from '@services';

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

export const fetchNotes = createAsyncThunk(
  'notes/fetchNotes',
  async (params, { rejectWithValue }) => {
    try {
      const res = await notesService.getNotes(params);
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to load notes.');
    }
  },
);

export const fetchNote = createAsyncThunk('notes/fetchNote', async (id, { rejectWithValue }) => {
  try {
    const res = await notesService.getNoteById(id);
    return res;
  } catch (err) {
    return rejectWithValue(err.data?.message || err.message || 'Failed to load note.');
  }
});

export const createNote = createAsyncThunk(
  'notes/createNote',
  async (data, { rejectWithValue, dispatch }) => {
    try {
      const res = await notesService.createNote(data);
      dispatch(fetchNotes());
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to create note.');
    }
  },
);

export const updateNote = createAsyncThunk(
  'notes/updateNote',
  async ({ id, data }, { rejectWithValue, dispatch }) => {
    try {
      const res = await notesService.updateNote(id, data);
      dispatch(fetchNotes());
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to update note.');
    }
  },
);

export const deleteNote = createAsyncThunk(
  'notes/deleteNote',
  async (id, { rejectWithValue, dispatch }) => {
    try {
      const res = await notesService.deleteNote(id);
      dispatch(fetchNotes());
      return res;
    } catch (err) {
      return rejectWithValue(err.data?.message || err.message || 'Failed to delete note.');
    }
  },
);

const notesSlice = createSlice({
  name: 'notes',
  initialState,
  reducers: {
    resetNotes: () => initialState,
    resetSelectedNote: (state) => {
      state.selected = null;
    },
    resetNotesError: (state) => {
      state.error = null;
    },
    setNotesSearch: (state, action) => {
      state.search = action.payload;
    },
    setNotesFilters: (state, action) => {
      state.filters = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotes.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
      })
      .addCase(fetchNotes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load notes.';
      })
      .addCase(fetchNote.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNote.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchNote.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to load note.';
      })
      .addCase(createNote.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(createNote.fulfilled, (state) => {
        state.submitting = false;
        state.selected = null;
      })
      .addCase(createNote.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to create note.';
      })
      .addCase(updateNote.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(updateNote.fulfilled, (state, action) => {
        state.submitting = false;
        state.selected = action.payload;
      })
      .addCase(updateNote.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to update note.';
      })
      .addCase(deleteNote.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(deleteNote.fulfilled, (state) => {
        state.submitting = false;
        state.selected = null;
      })
      .addCase(deleteNote.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload || 'Failed to delete note.';
      });
  },
});

export const { resetNotes, resetSelectedNote, resetNotesError, setNotesSearch, setNotesFilters } =
  notesSlice.actions;

export const selectNotes = (state) => state.notes?.items ?? [];
export const selectSelectedNote = (state) => state.notes?.selected ?? null;
export const selectNotesLoading = (state) => state.notes?.loading ?? false;
export const selectNotesSubmitting = (state) => state.notes?.submitting ?? false;
export const selectNotesError = (state) => state.notes?.error ?? null;
export const selectNotesMeta = (state) => state.notes?.meta ?? initialState.meta;
export const selectNotesSearch = (state) => state.notes?.search ?? '';
export const selectNotesFilters = (state) => state.notes?.filters ?? {};
export const selectItems = selectNotes;
export const selectSelected = selectSelectedNote;
export const selectLoading = selectNotesLoading;
export const selectError = selectNotesError;
export const selectMeta = selectNotesMeta;

export default notesSlice.reducer;
