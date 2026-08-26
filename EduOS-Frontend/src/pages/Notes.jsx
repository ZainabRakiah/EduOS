import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Trash2, Search, X, FileText, Clock, Tag, History, Pin, Star, BookOpen, Layers } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  fetchNotes,
  deleteNote,
  selectNotes,
  selectNotesLoading,
  selectNotesError,
  resetNotesError,
} from '@redux/slices/notes.slice.js';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Separator,
  toast,
} from '@components/ui/index.jsx';
import { formatRelativeTime, truncate, debounce } from '@utils';
import { apiClient } from '@services';

const STICKY_COLOR_MAP = {
  Yellow: 'bg-amber-50/70 border-amber-200 text-amber-900 shadow-amber-100/30',
  Pink: 'bg-rose-50/70 border-rose-200 text-rose-900 shadow-rose-100/30',
  Blue: 'bg-sky-50/70 border-sky-200 text-sky-900 shadow-sky-100/30',
  Green: 'bg-emerald-50/70 border-emerald-200 text-emerald-900 shadow-emerald-100/30',
  Purple: 'bg-purple-50/70 border-purple-200 text-purple-900 shadow-purple-100/30',
  Orange: 'bg-orange-50/70 border-orange-200 text-orange-900 shadow-orange-100/30',
};

function SkeletonCard() {
  return (
    <Card className="overflow-hidden border border-neutral-200/60 shadow-sm bg-white">
      <CardContent className="p-5">
        <div className="space-y-3">
          <div className="h-5 w-2/3 bg-neutral-200 animate-pulse rounded" />
          <div className="h-4 w-full bg-neutral-100 animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-neutral-100 animate-pulse rounded" />
          <div className="flex items-center gap-2 pt-2">
            <div className="h-5 w-16 bg-neutral-100 animate-pulse rounded-full" />
            <div className="h-4 w-24 bg-neutral-100 animate-pulse rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfirmModal({ open, title, description, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onCancel} />
      <Card className="relative z-10 w-full max-w-sm border border-neutral-200 shadow-xl bg-white rounded-2xl">
        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-neutral-850">{title}</h3>
            {description && <p className="text-xs text-neutral-500">{description}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold" onClick={onConfirm}>
              Delete
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function NoteDetailsModal({ open, note, onClose }) {
  if (!open || !note) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden bg-white shadow-xl rounded-2xl border border-neutral-200">
        <div className="p-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div className="space-y-1">
            <h2 className="text-sm font-extrabold text-neutral-850 leading-snug">{note.title}</h2>
            <div className="flex items-center gap-1.5 text-[9px] text-neutral-450 font-bold uppercase tracking-wider">
              <span>Source: {note.sourceDocument || 'General Chat'}</span>
              <span>•</span>
              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-650 p-1.5 rounded-full hover:bg-neutral-50 transition-colors"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex-1 p-5 overflow-y-auto space-y-5">
          {/* Summary section */}
          {note.summary && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Summary</span>
              <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50/70 border border-neutral-200/50 p-3 rounded-xl font-medium">
                {note.summary}
              </p>
            </div>
          )}

          {/* Important Points section */}
          {note.importantPoints && note.importantPoints.length > 0 && (
            <div className="space-y-2">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Key Learning Points</span>
              <ul className="space-y-2">
                {note.importantPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-xs text-neutral-700 leading-relaxed">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Fallback to raw content if details are empty */}
          {!note.summary && note.content && (
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Raw Content</span>
              <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-wrap bg-neutral-50 border border-neutral-200/50 p-3 rounded-xl">
                {note.content}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function Notes() {
  const dispatch = useAppDispatch();

  // Notes state from Redux
  const notes = useAppSelector(selectNotes);
  const notesLoading = useAppSelector(selectNotesLoading);
  const notesError = useAppSelector(selectNotesError);

  // Tab section: 'notes' or 'sticky'
  const [activeSection, setActiveSection] = useState('notes');

  // Sticky Notes local state (Direct integration)
  const [stickyNotes, setStickyNotes] = useState([]);
  const [stickyLoading, setStickyLoading] = useState(false);

  // Filters & query params
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'title'

  // Modal details view states
  const [selectedNote, setSelectedNote] = useState(null);

  // Delete modal states
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingType, setDeletingType] = useState('note'); // 'note' or 'sticky'

  // Fetch sticky notes via Axios
  const fetchStickyNotes = useCallback(async () => {
    setStickyLoading(true);
    try {
      const res = await apiClient.get('/notes/sticky', {
        params: { search: search || undefined },
      });
      setStickyNotes(res.data || []);
    } catch (err) {
      toast.error('Failed to load Sticky Notes');
    } finally {
      setStickyLoading(false);
    }
  }, [search]);

  // Load active section list
  useEffect(() => {
    if (activeSection === 'sticky') {
      fetchStickyNotes();
    } else {
      dispatch(fetchNotes({ search }));
    }
  }, [dispatch, search, activeSection, fetchStickyNotes]);

  // Handle slice errors
  useEffect(() => {
    if (notesError) {
      toast.error(notesError);
      dispatch(resetNotesError());
    }
  }, [notesError, dispatch]);

  const debouncedSearch = useMemo(
    () =>
      debounce((val) => {
        setSearch(val);
      }, 300),
    [],
  );

  const handleSearchChange = (e) => {
    debouncedSearch(e.target.value);
  };

  // Sorting in memory for Notes list
  const sortedNotes = useMemo(() => {
    const list = [...notes];
    if (sortBy === 'newest') {
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    if (sortBy === 'oldest') {
      return list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    if (sortBy === 'title') {
      return list.sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [notes, sortBy]);

  // Confirm delete prompts
  const askDeleteNote = (id) => {
    setDeletingId(id);
    setDeletingType('note');
    setConfirmOpen(true);
  };

  const askDeleteSticky = (id) => {
    setDeletingId(id);
    setDeletingType('sticky');
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;

    try {
      if (deletingType === 'note') {
        await dispatch(deleteNote(deletingId)).unwrap();
        toast.success('Deleted successfully.');
      } else {
        await apiClient.delete(`/notes/sticky/${deletingId}`);
        setStickyNotes((prev) => prev.filter((s) => s.id !== deletingId));
        toast.success('Deleted successfully.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete note.');
    } finally {
      setConfirmOpen(false);
      setDeletingId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const isLoading = activeSection === 'notes' ? notesLoading : stickyLoading;
  const isNotesEmpty = !notesLoading && notes.length === 0;
  const isStickyEmpty = !stickyLoading && stickyNotes.length === 0;

  return (
    <div className="space-y-6">
      {/* Header section with tab selectors */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-neutral-850">Learning Library</h1>
          <p className="mt-1 text-neutral-450 text-xs font-semibold">
            Concise, AI-extracted revision materials and quick sticky takeaways.
          </p>
        </div>

        {/* Tabpill selector */}
        <div className="flex bg-neutral-100/80 p-1 rounded-full border border-neutral-200/50 backdrop-blur-sm self-start">
          <button
            onClick={() => {
              setActiveSection('notes');
              setSearch('');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
              activeSection === 'notes'
                ? 'bg-white text-brand-700 shadow-sm border border-neutral-200/20'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Star className="h-3.5 w-3.5" />
            Revision Notes
          </button>
          <button
            onClick={() => {
              setActiveSection('sticky');
              setSearch('');
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
              activeSection === 'sticky'
                ? 'bg-white text-brand-700 shadow-sm border border-neutral-200/20'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Pin className="h-3.5 w-3.5" />
            Sticky Takeaways
          </button>
        </div>
      </div>

      <Separator />

      {/* Filter and query controls */}
      <div className="flex flex-wrap items-center gap-3 justify-between bg-neutral-50/50 p-3 rounded-2xl border border-neutral-200/50">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
          <Input
            placeholder={activeSection === 'notes' ? 'Search title, summary, content...' : 'Search sticky notes...'}
            className="pl-9 text-xs"
            onChange={handleSearchChange}
          />
        </div>

        {activeSection === 'notes' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-neutral-200 rounded-xl px-2.5 py-1.5 bg-white text-neutral-700 font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : activeSection === 'notes' ? (
        /* Revision Notes grid */
        isNotesEmpty ? (
          <div className="text-center py-20 bg-white border border-neutral-200 rounded-2xl">
            <div className="mx-auto h-12 w-12 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-400 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-neutral-800">No saved notes yet.</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
              When chatting with the AI Learning Assistant, click "Save as Note" under responses to auto-extract core concepts here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedNotes.map((note) => (
              <Card key={note.id} className="overflow-hidden flex flex-col border border-neutral-200/70 shadow-sm hover:border-neutral-300 transition-all bg-white rounded-2xl">
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-xs font-extrabold text-neutral-850 leading-snug truncate pr-4">
                      {note.title}
                    </h3>
                    <button
                      onClick={() => askDeleteNote(note.id)}
                      className="p-1 rounded-full text-neutral-400 hover:text-red-650 hover:bg-red-50 transition-colors shrink-0"
                      title="Delete Note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="text-xs text-neutral-500 leading-relaxed mb-4 line-clamp-3 flex-1 font-medium">
                    {note.summary || truncate(note.content, 120)}
                  </p>

                  <div className="space-y-2 pt-3 border-t border-neutral-100 shrink-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge className="bg-brand-50 hover:bg-brand-100 text-brand-700 border-none font-bold text-[9px] py-0 px-2 rounded-md">
                        {note.sourceDocument || 'General Chat'}
                      </Badge>
                      <button
                        onClick={() => setSelectedNote(note)}
                        className="text-[10px] font-bold text-brand-650 hover:text-brand-800 transition-colors uppercase tracking-wider"
                      >
                        Open Details
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-neutral-400 font-semibold">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* Sticky Takeaways pinterest style column grid */
        isStickyEmpty ? (
          <div className="text-center py-20 bg-white border border-neutral-200 rounded-2xl">
            <div className="mx-auto h-12 w-12 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-400 flex items-center justify-center mb-4">
              <Pin className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-extrabold text-neutral-800">No sticky notes yet.</h3>
            <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Click "Save Sticky Note" under AI responses to extract a concise, colorful memory card.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4">
            {stickyNotes.map((sticky) => {
              const colorClass = STICKY_COLOR_MAP[sticky.color] || STICKY_COLOR_MAP.Yellow;
              return (
                <div
                  key={sticky.id}
                  className={`break-inside-avoid border rounded-2xl p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] flex flex-col space-y-3 ${colorClass}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      📌 {sticky.title}
                    </span>
                    <button
                      onClick={() => askDeleteSticky(sticky.id)}
                      className="p-1 rounded-full hover:bg-black/5 text-neutral-600 hover:text-red-750 transition-colors shrink-0"
                      title="Delete Sticky Note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  
                  <p className="text-xs font-bold leading-relaxed whitespace-pre-wrap">
                    {sticky.content}
                  </p>

                  <div className="flex justify-between items-center pt-2 border-t border-black/5 opacity-60 text-[9px] font-semibold">
                    <span>{formatRelativeTime(sticky.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Detail notes popup modal */}
      <NoteDetailsModal
        open={!!selectedNote}
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
      />

      {/* Delete confirmation popup */}
      <ConfirmModal
        open={confirmOpen}
        title={deletingType === 'note' ? 'Delete Note' : 'Delete Sticky Takeaway'}
        description="This action cannot be undone. Are you sure you want to delete this item from your library?"
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
