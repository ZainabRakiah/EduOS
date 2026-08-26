import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Copy,
  Printer,
  Edit3,
  Check,
  X,
  FileText,
  Clock,
  RefreshCw,
  Compass
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  fetchNotes,
  deleteNote,
  selectNotes,
  selectNotesLoading
} from '@redux/slices/notes.slice.js';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Separator,
  toast,
  MarkdownRenderer
} from '@components/ui/index.jsx';
import { apiClient } from '@services';
import { formatRelativeTime } from '@utils';

export default function FormulaBook() {
  const dispatch = useAppDispatch();
  const notes = useAppSelector(selectNotes);
  const loading = useAppSelector(selectNotesLoading);

  const [searchQuery, setSearchQuery] = useState('');
  const [generateTopic, setGenerateTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  // Active viewing sheet drawer state
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    dispatch(fetchNotes());
  }, [dispatch]);

  // Filter notes to only show Formula Books
  const formulaSheets = notes.filter(
    (n) => n.sourceType === 'FORMULA_BOOK' || n.title?.toLowerCase().includes('formula')
  );

  const filteredSheets = formulaSheets.filter(
    (sheet) =>
      sheet.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sheet.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerateSheet = async (e) => {
    e.preventDefault();
    const topic = generateTopic.trim();
    if (!topic) return;

    setGenerating(true);
    toast.info(`AI is analyzing and compiling formulas for: ${topic}...`);

    try {
      const prompt = `Generate a highly detailed Formula Revision Sheet for: "${topic}".
Include:
1. Core definitions and conceptual constants.
2. Important formulas with explanations of variables and standard SI units.
3. Quick short tricks, memory hooks, and common revision pitfalls.
4. Summary cheatsheet.

Format it beautifully in clean Markdown with logical headers. Do not include any greeting or conversational fluff, start directly with the Markdown content.`;

      const response = await apiClient.post('/ai/chat', { prompt });
      const rawContent = response.data?.response || response.response || '';
      const cleanContent = rawContent.replace(/```markdown/gi, '').replace(/```/gi, '').trim();

      if (!cleanContent) {
        throw new Error('AI returned empty formula book sheet.');
      }

      // Save to Notes collection under Formula Book sourceType
      const newSheet = await apiClient.post('/notes', {
        title: `${topic} Formula Book`,
        content: cleanContent,
        sourceType: 'FORMULA_BOOK',
        sourceDocument: 'AI Instant Generator'
      });

      toast.success('New Formula Book page created!');
      setGenerateTopic('');
      dispatch(fetchNotes());
      setSelectedSheet(newSheet.data || newSheet);
    } catch (err) {
      toast.error('Failed to generate formula book.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSheet = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this formula book page?')) return;
    try {
      await dispatch(deleteNote(id)).unwrap();
      toast.success('Formula book page deleted successfully.');
      if (selectedSheet?.id === id) {
        setSelectedSheet(null);
        setIsEditing(false);
      }
    } catch (err) {
      toast.error('Failed to delete.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setSavingEdit(true);
    try {
      await apiClient.put(`/notes/${selectedSheet.id}`, {
        title: editTitle,
        content: editContent,
        sourceType: 'FORMULA_BOOK'
      });
      toast.success('Formula book page updated!');
      setIsEditing(false);
      dispatch(fetchNotes());
      // Update locally viewed sheet
      setSelectedSheet({ ...selectedSheet, title: editTitle, content: editContent });
    } catch (err) {
      toast.error('Failed to save changes.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handlePrint = (sheet) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${sheet.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; line-height: 1.6; color: #333; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
            h2, h3 { color: #2563eb; margin-top: 30px; }
            pre { background: #f8fafc; padding: 15px; border-radius: 8px; overflow-x: auto; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
            th { background: #f1f5f9; }
          </style>
        </head>
        <body>
          <h1>${sheet.title}</h1>
          <pre style="white-space: pre-wrap; font-family: inherit;">${sheet.content}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 text-left pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-850">Formula Books</h1>
        <p className="mt-1 text-neutral-500 text-sm">
          Generate, save, and revise formulas, key constants, definitions, and short tricks.
        </p>
      </div>

      <Separator />

      {/* Top AI Generator Bar */}
      <Card className="bg-gradient-to-r from-brand-600/5 to-indigo-650/5 border-brand-200/55 rounded-2xl overflow-hidden shadow-sm">
        <CardContent className="p-5">
          <form onSubmit={handleGenerateSheet} className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600 animate-pulse" />
              <h3 className="text-sm font-extrabold text-neutral-800">Generate New Formula Sheet</h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Enter topic (e.g. Optics, Electrostatics, Organic Chemistry, Chemical Bonding)..."
                value={generateTopic}
                onChange={(e) => setGenerateTopic(e.target.value)}
                disabled={generating}
                className="flex-1 bg-white border-neutral-200"
              />
              <Button
                type="submit"
                disabled={generating || !generateTopic.trim()}
                leftIcon={generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
              >
                {generating ? 'Compiling AI...' : 'Generate Sheet'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Search & Grid View */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Search saved formula books..."
            className="pl-9 bg-white border-neutral-200 focus:bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse h-36 bg-neutral-50" />
            ))}
          </div>
        ) : filteredSheets.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-neutral-200/60 rounded-2xl shadow-sm">
            <BookOpen className="mx-auto h-12 w-12 text-neutral-300 mb-4" strokeWidth={1.5} />
            <h3 className="text-base font-extrabold text-neutral-800">No formula sheets saved</h3>
            <p className="text-xs text-neutral-400 mt-1">Use the generator above to instantly compile key equations.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSheets.map((sheet) => (
              <Card
                key={sheet.id}
                onClick={() => {
                  setSelectedSheet(sheet);
                  setEditTitle(sheet.title);
                  setEditContent(sheet.content);
                  setIsEditing(false);
                }}
                className="bg-white border border-neutral-200/80 hover:border-brand-200/60 hover:shadow-md transition-all duration-300 rounded-2xl cursor-pointer relative group flex flex-col justify-between"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="h-9 w-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
                        <Compass className="h-4 w-4" />
                      </div>
                      <button
                        onClick={(e) => handleDeleteSheet(sheet.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-neutral-400 transition-all border border-transparent hover:border-rose-100"
                        title="Delete Sheet"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <h4 className="text-xs font-bold text-neutral-800 line-clamp-1 group-hover:text-brand-650 transition-colors pt-1">
                      {sheet.title}
                    </h4>
                    <p className="text-[10px] text-neutral-400 font-semibold line-clamp-2 leading-relaxed">
                      {sheet.content?.substring(0, 100) || 'No description available.'}...
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-4 text-[9px] text-neutral-400 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(sheet.createdAt)}
                    </span>
                    <Badge variant="secondary" className="text-[8px] px-1.5 py-0 rounded">
                      Formula Sheet
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reader Drawer Panel */}
      {selectedSheet && (
        <div className="fixed inset-0 z-50 overflow-hidden text-left flex justify-end">
          {/* Overlay backdrop */}
          <div
            className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => {
              if (isEditing) {
                if (window.confirm('Discard unsaved edits?')) {
                  setSelectedSheet(null);
                  setIsEditing(false);
                }
              } else {
                setSelectedSheet(null);
              }
            }}
          />

          {/* Drawer Panel container */}
          <div className="relative z-10 w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-in">
            {/* Header */}
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              {isEditing ? (
                <div className="flex-1 mr-4">
                  <Input
                    className="font-bold text-sm bg-white"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-brand-650 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-extrabold text-neutral-800">{selectedSheet.title}</h3>
                    <p className="text-[10px] text-neutral-450 font-semibold">AI Compiled Sheet</p>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setSelectedSheet(null);
                  setIsEditing(false);
                }}
                className="h-7 w-7 rounded-full hover:bg-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isEditing ? (
                <textarea
                  className="w-full h-full text-xs font-mono p-4 border border-neutral-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
              ) : (
                <MarkdownRenderer content={selectedSheet.content} />
              )}
            </div>

            {/* Footer Controls */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between gap-2.5">
              {!isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrint(selectedSheet)}
                    leftIcon={<Printer className="h-3.5 w-3.5" />}
                  >
                    Print PDF
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(selectedSheet.content)}
                      leftIcon={<Copy className="h-3.5 w-3.5" />}
                    >
                      Copy
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    >
                      Edit Sheet
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={savingEdit || !editTitle.trim()}
                    onClick={handleSaveEdit}
                    leftIcon={savingEdit ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  >
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
