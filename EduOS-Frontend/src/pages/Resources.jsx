import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Search,
  X,
  Upload,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FolderOpen,
  File,
  ExternalLink,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  fetchResources,
  uploadResource,
  deleteResource,
  selectResources,
  selectResourcesLoading,
  selectResourcesSubmitting,
  selectResourcesUploading,
  selectUploadProgress,
  selectResourcesError,
  resetResourcesError,
} from '@redux/slices/resources.slice.js';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Input,
  Textarea,
  Separator,
} from '@components/ui/index.jsx';
import { formatDate, formatBytes, debounce } from '@utils';

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-success-50 border-success-500/30 text-success-700',
    error: 'bg-danger-50 border-danger-500/30 text-danger-700',
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[type]}`}
      >
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="opacity-70 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 bg-neutral-200 animate-pulse rounded-lg shrink-0" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-5 w-2/3 bg-neutral-200 animate-pulse rounded" />
            <div className="h-4 w-full bg-neutral-100 animate-pulse rounded" />
            <div className="h-4 w-1/2 bg-neutral-100 animate-pulse rounded" />
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
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const TYPE_OPTIONS = ['PDF', 'IMAGE', 'VIDEO', 'AUDIO', 'OTHER'];

const FileTypeIcon = ({ fileType, className = 'h-5 w-5' }) => {
  const t = String(fileType || '').toUpperCase();
  if (t.includes('PDF')) return <FileText className={`${className} text-brand-650`} />;
  if (t.includes('IMAGE')) return <FileImage className={`${className} text-success-650`} />;
  if (t.includes('VIDEO')) return <FileVideo className={`${className} text-warning-600`} />;
  if (t.includes('AUDIO')) return <FileAudio className={`${className} text-purple-650`} />;
  return <File className={`${className} text-neutral-500`} />;
};

const FileTypeBadge = ({ fileType }) => {
  const t = String(fileType || '').toUpperCase();
  if (t.includes('PDF')) return <Badge className="bg-brand-50 hover:bg-brand-100 text-brand-700 border-none font-bold text-[9px]">PDF</Badge>;
  if (t.includes('IMAGE')) return <Badge className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-none font-bold text-[9px]">Image</Badge>;
  if (t.includes('VIDEO')) return <Badge className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-none font-bold text-[9px]">Video</Badge>;
  if (t.includes('AUDIO')) return <Badge className="bg-purple-50 hover:bg-purple-100 text-purple-700 border-none font-bold text-[9px]">Audio</Badge>;
  return <Badge variant="neutral">{t}</Badge>;
};

function UploadModal({ open, onClose, onSubmit, submitting, uploading, uploadProgress }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setSubject('');
      setFile(null);
      setFileName('');
    }
  }, [open]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setFileName(f.name);
      if (!title.trim()) {
        const baseName = f.name.substring(0, f.name.lastIndexOf('.')) || f.name;
        setTitle(baseName);
      }
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!file || !title.trim()) return;
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('subject', subject);
    formData.append('file', file);
    onSubmit(formData);
  };

  if (!open) return null;
  const showProgress = uploading && uploadProgress > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md bg-white border shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Upload Resource</CardTitle>
          <CardDescription>Add a new PDF or Image chapter resource document.</CardDescription>
        </CardHeader>
        <form onSubmit={handleFormSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Title</label>
              <Input
                placeholder="Resource title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Description</label>
              <Textarea
                placeholder="Short description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">Subject</label>
              <Input
                placeholder="e.g. Biology"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-neutral-700">File</label>
              <label
                htmlFor="resource-file-input"
                className="flex items-center justify-center w-full h-28 border-2 border-dashed rounded-lg border-neutral-200 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-300 transition-colors cursor-pointer"
              >
                <div className="text-center">
                  {fileName ? (
                    <div className="flex items-center gap-2 px-2">
                      <Upload className="h-5 w-5 text-brand-600" />
                      <span className="text-sm text-neutral-700 truncate max-w-[16rem]">
                        {fileName}
                      </span>
                      {file && (
                        <span className="text-xs text-neutral-500">({formatBytes(file.size)})</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6 text-neutral-400" />
                      <span className="text-sm font-medium text-neutral-700">
                        Click to select a file
                      </span>
                      <span className="text-xs text-neutral-500">or drag & drop</span>
                    </div>
                  )}
                </div>
                <input
                  id="resource-file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {showProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600 font-medium">Uploading...</span>
                  <span className="text-neutral-600 font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !title.trim() || !file}
                leftIcon={!submitting ? <Upload className="h-4 w-4" /> : null}
              >
                {submitting ? (uploading ? 'Uploading...' : 'Processing...') : 'Upload'}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}

export default function Resources() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const items = useAppSelector(selectResources);
  const loading = useAppSelector(selectResourcesLoading);
  const submitting = useAppSelector(selectResourcesSubmitting);
  const uploading = useAppSelector(selectResourcesUploading);
  const uploadProgress = useAppSelector(selectUploadProgress);
  const error = useAppSelector(selectResourcesError);

  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    dispatch(fetchResources({ search }));
  }, [dispatch, search]);

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      dispatch(resetResourcesError());
    }
  }, [error, dispatch]);

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

  const openUpload = () => setUploadOpen(true);
  const closeUpload = () => setUploadOpen(false);

  const handleUploadSubmit = async (formData) => {
    try {
      await dispatch(
        uploadResource({
          formData,
          onProgress: (pct) => {
            // progress is handled via state for UI updates, but we can also pass custom logic
          },
        }),
      ).unwrap();
      showToast('Resource uploaded successfully!', 'success');
      closeUpload();
    } catch (_) {
      // handled via slice error
    }
  };

  const askDelete = (id) => {
    setDeletingId(id);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      try {
        await dispatch(deleteResource(deletingId)).unwrap();
        showToast('Resource deleted successfully!', 'success');
      } catch (_) {}
    }
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const cancelDelete = () => {
    setConfirmOpen(false);
    setDeletingId(null);
  };

  const isEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
          <p className="mt-1 text-neutral-500 text-sm">
            Store and organize your study materials and references.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              placeholder="Search resources..."
              className="pl-9"
              onChange={handleSearchChange}
              defaultValue=""
            />
          </div>
          <Button size="md" leftIcon={<Plus className="h-4 w-4" />} onClick={openUpload}>
            Upload Resource
          </Button>
        </div>
      </div>

      <Separator />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : isEmpty ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-warning-50 flex items-center justify-center mb-4">
              <FolderOpen className="h-7 w-7 text-warning-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No resources uploaded.</h3>
            <p className="mt-1 text-sm text-neutral-500 mb-4">
              Upload PDFs, documents, images, and more to build your resource library.
            </p>
            <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openUpload}>
              Upload First Resource
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((r) => (
            <Card key={r.id} className="overflow-hidden flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1 gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center shrink-0">
                    <FileTypeIcon fileType={r.fileType} className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-neutral-900 leading-snug line-clamp-1 flex-1">
                        {r.title}
                      </h3>
                      <button
                        onClick={() => askDelete(r.id)}
                        className="p-1.5 rounded-md text-neutral-400 hover:text-danger-600 hover:bg-danger-50 transition-colors shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5 truncate">
                      {r.fileName || 'Untitled file'}
                    </p>
                  </div>
                </div>

                {r.description && (
                  <p className="text-sm text-neutral-600 line-clamp-2">{r.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-auto pt-2 border-t border-neutral-100">
                  <FileTypeBadge fileType={r.fileType} />
                  {r.subject && <Badge variant="default">{r.subject}</Badge>}
                  <Badge variant="neutral">
                    {r.fileSize != null ? formatBytes(r.fileSize) : '—'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-neutral-500">{formatDate(r.createdAt)}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigate('/ai/chapter-explainer', { state: { autoAttachResource: r } })}
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand-650 hover:text-brand-750 hover:underline"
                    >
                      AI Explain
                    </button>
                    {r.fileUrl && (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-450 hover:text-neutral-600 hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={closeUpload}
        onSubmit={handleUploadSubmit}
        submitting={submitting}
        uploadProgress={uploadProgress}
        uploading={uploading}
      />

      <ConfirmModal
        open={confirmOpen}
        title="Delete Resource"
        description="This action cannot be undone. Are you sure you want to delete this resource?"
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
