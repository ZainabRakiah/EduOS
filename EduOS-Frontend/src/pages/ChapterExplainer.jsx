import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  Sparkles,
  Send,
  Brain,
  FileText,
  Image as ImageIcon,
  User,
  GraduationCap,
  Upload,
  X,
  Loader2,
  Plus,
  Trash2,
  Copy,
  Pin,
  Star,
  Languages,
  Smile,
  RefreshCw,
  ListOrdered
} from 'lucide-react';
import {
  chatWithAiThunk,
  selectExplainerSubmitting,
  selectExplainerError,
} from '@redux/slices/chapter-explainer.slice.js';
import {
  uploadResource,
  selectResourcesUploading,
  selectUploadProgress,
  resetUploadProgress,
} from '@redux/slices/resources.slice.js';
import { createNote } from '@redux/slices/notes.slice.js';
import {
  Button,
  Card,
  CardContent,
  Skeleton,
  Badge,
  toast,
  Textarea,
  MarkdownRenderer,
} from '@components/ui/index.jsx';
import { resourcesService, apiClient } from '@services';
import VisualRenderer from '../components/visuals/VisualRenderer';

const SUGGESTIONS = [
  'Explain Photosynthesis for Class 8.',
  "Explain Newton's Laws in simple language.",
  'Summarize this chapter.',
];

export default function ChapterExplainer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // Redux Selectors
  const submitting = useAppSelector(selectExplainerSubmitting);
  const apiError = useAppSelector(selectExplainerError);
  const uploading = useAppSelector(selectResourcesUploading);
  const uploadProgress = useAppSelector(selectUploadProgress);

  // Chat Input Prompt
  const [prompt, setPrompt] = useState('');

  // Conversation history in local state (Unified continuous thread)
  const [messages, setMessages] = useState([]);

  // Attached Document for context
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedFileDetails, setAttachedFileDetails] = useState(null);
  const [processingPhase, setProcessingPhase] = useState('Processing...');

  // Sidebar Drafting Board States
  const [draftTitle, setDraftTitle] = useState('Revision Notes');
  const [draftSummary, setDraftSummary] = useState('');
  const [draftPoints, setDraftPoints] = useState([]);
  const [extractingPoints, setExtractingPoints] = useState(false);
  const [savingPoints, setSavingPoints] = useState(false);
  const [newPointText, setNewPointText] = useState('');

  // Loading states
  const [submittingDoc, setSubmittingDoc] = useState(false);

  // Formula drawer states
  const [formulaDrawerOpen, setFormulaDrawerOpen] = useState(false);
  const [formulaContent, setFormulaContent] = useState('');
  const [formulaLoading, setFormulaLoading] = useState(false);

  // Flowchart modal states
  const [flowChartModalOpen, setFlowChartModalOpen] = useState(false);
  const [flowChartSvg, setFlowChartSvg] = useState('');
  const [flowChartLoading, setFlowChartLoading] = useState(false);
  const [flowChartExplanation, setFlowChartExplanation] = useState('');
  const [flowChartIsPossible, setFlowChartIsPossible] = useState(true);
  const [flowChartSuggestions, setFlowChartSuggestions] = useState([]);

  // Diagram modal states
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [diagramSvg, setDiagramSvg] = useState('');
  const [diagramLoading, setDiagramLoading] = useState(false);
  const [diagramExplanation, setDiagramExplanation] = useState('');
  const [diagramIsPossible, setDiagramIsPossible] = useState(true);
  const [diagramSuggestions, setDiagramSuggestions] = useState([]);
  const [visualTopic, setVisualTopic] = useState('');
  const [visualConfig, setVisualConfig] = useState(null);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedAspectRatio, setEditedAspectRatio] = useState('16:9');
  // Ref to automatically scroll to the bottom of the active chat list
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, submitting, submittingDoc]);

  useEffect(() => {
    if (apiError) {
      toast.error(apiError);
    }
  }, [apiError]);

  useEffect(() => {
    if (visualConfig?.type === 'IMAGE') {
      setEditedPrompt(visualConfig.prompt || '');
      setEditedAspectRatio(visualConfig.aspectRatio || '16:9');
    }
  }, [visualConfig]);

  // Reset upload progress on mount
  useEffect(() => {
    dispatch(resetUploadProgress());
  }, [dispatch]);

  // Handle auto-attached resource or initial prompt redirects
  useEffect(() => {
    if (location.state?.autoAttachResource) {
      setAttachedFile(location.state.autoAttachResource);
    }
    if (location.state?.initialPrompt) {
      setPrompt(location.state.initialPrompt);
      if (location.state.autoAttachResource) {
        handleExplainDoc(location.state.initialPrompt, location.state.autoAttachResource);
      } else {
        handleExplainText(location.state.initialPrompt);
      }
    }
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Poll attached file status if not READY
  useEffect(() => {
    if (!attachedFile) {
      setAttachedFileDetails(null);
      return;
    }

    if (attachedFile.status === 'READY') {
      setAttachedFileDetails({ processingStatus: 'READY' });
      return;
    }

    let intervalId;

    const fetchStatus = async () => {
      try {
        const res = await resourcesService.getDocumentProcessingStatus(attachedFile.id);
        if (res) {
          setAttachedFileDetails(res);
          if (res.processingStatus === 'READY' || res.processingStatus === 'FAILED') {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Error fetching attached file status:', err);
      }
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 3000);

    return () => clearInterval(intervalId);
  }, [attachedFile]);

  // Cycle processing phase feedback when status is PROCESSING
  useEffect(() => {
    if (!attachedFileDetails || attachedFileDetails.processingStatus !== 'PROCESSING') {
      return;
    }

    const phases = ['Analyzing...', 'Extracting text...', 'Indexing...'];
    let currentIndex = 0;
    setProcessingPhase(phases[0]);

    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % phases.length;
      setProcessingPhase(phases[currentIndex]);
    }, 1500);

    return () => clearInterval(interval);
  }, [attachedFileDetails]);

  const extractSvgAndExplanationFallback = (text) => {
    let cleanText = text || '';
    if (cleanText.includes('\\"')) {
      cleanText = cleanText.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }

    let explanation = '';
    const explanationMatch = cleanText.match(/"explanation"\s*:\s*"([\s\S]*?)"(?=\s*,|\s*\})/i);
    if (explanationMatch) {
      explanation = explanationMatch[1].trim();
    }

    let suggestions = [];
    const suggestionsMatch = cleanText.match(/"alternativeSuggestions"\s*:\s*\[([\s\S]*?)\]/i);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(`[${suggestionsMatch[1]}]`);
      } catch (e) {
        suggestions = suggestionsMatch[1]
          .split(',')
          .map(s => s.trim().replace(/^["']|["']$/g, ''))
          .filter(s => s.length > 0);
      }
    }

    const svgStartIndex = cleanText.toLowerCase().indexOf('<svg');
    if (svgStartIndex === -1) return null;

    let svgContent = '';
    const svgEndIndex = cleanText.toLowerCase().indexOf('</svg>');

    if (svgEndIndex !== -1) {
      svgContent = cleanText.substring(svgStartIndex, svgEndIndex + 6);
    } else {
      svgContent = cleanText.substring(svgStartIndex);
      svgContent = svgContent.trim();
      if (svgContent.endsWith('"') || svgContent.endsWith('}') || svgContent.endsWith(']')) {
        svgContent = svgContent.replace(/["\}\]]+$/, '');
      }
      svgContent = svgContent + '\n</svg>';
    }

    if (!explanation) {
      let rest = cleanText.replace(cleanText.substring(svgStartIndex), '').trim();
      if (!rest && svgEndIndex !== -1) {
        rest = cleanText.substring(svgEndIndex + 6).trim();
      }
      explanation = rest
        .replace(/[\{\}\[\]"':,\r\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\b(isPossible|explanation|alternativeSuggestions|svg)\b/g, '')
        .trim();
    }

    return {
      isPossible: true,
      svg: svgContent,
      explanation: explanation || 'Concept Diagram.',
      suggestions: suggestions.length > 0 ? suggestions : ['Generate Mock Test', 'Simplify in Hindi', 'Extract Formulas']
    };
  };

  // Handle general AI chat submit
  const handleExplainText = async (queryText) => {
    setPrompt('');

    const userMessage = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await dispatch(chatWithAiThunk(queryText)).unwrap();
      
      const responseText = res?.response || '';
      const isVisualIntent = ['MAP', 'FLOWCHART', 'CHART', 'TIMELINE', 'TABLE', 'SCIENTIFIC_DIAGRAM', 'CONCEPT_DIAGRAM', 'IMAGE'].includes(res?.intent) || responseText.includes('"type"');
      
      if (res && isVisualIntent) {
        const targetIntent = res.intent || 'CONCEPT_DIAGRAM';
        try {
          let jsonString = responseText;
          const jsonStart = responseText.indexOf('{');
          const jsonEnd = responseText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonString = responseText.substring(jsonStart, jsonEnd + 1);
          }
          const parsed = JSON.parse(jsonString);
          
          if (parsed.type === 'IMAGE' || targetIntent === 'IMAGE') {
            await handleGenerateRealImage(parsed, queryText);
            const assistantMessage = { 
              role: 'assistant', 
              content: `I have generated the requested image. [Opened in Modal View]` 
            };
            setMessages((prev) => [...prev, assistantMessage]);
            return;
          }

          setVisualConfig(parsed);
          
          if (targetIntent === 'FLOWCHART') {
            setFlowChartIsPossible(parsed.isPossible !== false);
            setFlowChartSvg('');
            setFlowChartExplanation(parsed.explanation || '');
            setFlowChartSuggestions(parsed.alternativeSuggestions || []);
            setVisualTopic(queryText);
            setFlowChartModalOpen(true);
          } else {
            setDiagramIsPossible(parsed.isPossible !== false);
            setDiagramSvg('');
            setDiagramExplanation(parsed.explanation || '');
            setDiagramSuggestions(parsed.alternativeSuggestions || []);
            setVisualTopic(queryText);
            setDiagramModalOpen(true);
          }
          
          const assistantMessage = { 
            role: 'assistant', 
            content: `I have generated the requested ${targetIntent.toLowerCase()}. [Opened in Modal View]` 
          };
          setMessages((prev) => [...prev, assistantMessage]);
          return;
        } catch (e) {
          const fallback = extractSvgAndExplanationFallback(responseText);
          if (fallback) {
            setVisualConfig(fallback);
            if (targetIntent === 'FLOWCHART') {
              setFlowChartIsPossible(true);
              setFlowChartSvg(fallback.svg);
              setFlowChartExplanation(fallback.explanation);
              setFlowChartSuggestions(fallback.suggestions);
              setVisualTopic(queryText);
              setFlowChartModalOpen(true);
            } else {
              setDiagramIsPossible(true);
              setDiagramSvg(fallback.svg);
              setDiagramExplanation(fallback.explanation);
              setDiagramSuggestions(fallback.suggestions);
              setVisualTopic(queryText);
              setDiagramModalOpen(true);
            }
            const assistantMessage = { 
              role: 'assistant', 
              content: `I have generated the requested visual. [Opened in Modal View]` 
            };
            setMessages((prev) => [...prev, assistantMessage]);
            return;
          }
        }
      }

      const assistantMessage = { role: 'assistant', content: res.response };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage =
        typeof err === 'string' ? err : err?.message || 'Failed to get AI response.';
      toast.error(errorMessage);
      const assistantMessage = { role: 'assistant', content: errorMessage, isError: true };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };  // Handle document AI chat submit
  const handleExplainDoc = async (queryText, forceResource = null) => {
    const fileToUse = forceResource || attachedFile;
    if (!fileToUse) return;
    setPrompt('');

    const userMsg = { role: 'user', content: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setSubmittingDoc(true);

    try {
      const res = await apiClient.post('/ai/explain', {
        resourceId: fileToUse.id,
        question: queryText,
      });

      const responseText = res?.answer || '';
      const isVisualIntent = ['MAP', 'FLOWCHART', 'CHART', 'TIMELINE', 'TABLE', 'SCIENTIFIC_DIAGRAM', 'CONCEPT_DIAGRAM', 'IMAGE'].includes(res?.intent) || responseText.includes('"type"');

      if (res && isVisualIntent) {
        const targetIntent = res.intent || 'CONCEPT_DIAGRAM';
        try {
          let jsonString = responseText;
          const jsonStart = responseText.indexOf('{');
          const jsonEnd = responseText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
            jsonString = responseText.substring(jsonStart, jsonEnd + 1);
          }
          const parsed = JSON.parse(jsonString);
          
          if (parsed.type === 'IMAGE' || targetIntent === 'IMAGE') {
            await handleGenerateRealImage(parsed, queryText);
            const assistantMsg = {
              role: 'assistant',
              content: `I have generated the requested image based on the document. [Opened in Modal View]`,
              isRag: true,
              chunksUsed: res.chunksUsed,
              attachedFileTitle: fileToUse.title,
            };
            setMessages((prev) => [...prev, assistantMsg]);
            return;
          }

          setVisualConfig(parsed);

          if (targetIntent === 'FLOWCHART') {
            setFlowChartIsPossible(parsed.isPossible !== false);
            setFlowChartSvg('');
            setFlowChartExplanation(parsed.explanation || '');
            setFlowChartSuggestions(parsed.alternativeSuggestions || []);
            setVisualTopic(queryText);
            setFlowChartModalOpen(true);
          } else {
            setDiagramIsPossible(parsed.isPossible !== false);
            setDiagramSvg('');
            setDiagramExplanation(parsed.explanation || '');
            setDiagramSuggestions(parsed.alternativeSuggestions || []);
            setVisualTopic(queryText);
            setDiagramModalOpen(true);
          }

          const assistantMsg = {
            role: 'assistant',
            content: `I have generated the requested ${targetIntent.toLowerCase()} based on the document. [Opened in Modal View]`,
            isRag: true,
            chunksUsed: res.chunksUsed,
            attachedFileTitle: fileToUse.title,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          return;
        } catch (e) {
          const fallback = extractSvgAndExplanationFallback(responseText);
          if (fallback) {
            setVisualConfig(fallback);
            if (targetIntent === 'FLOWCHART') {
              setFlowChartIsPossible(true);
              setFlowChartSvg(fallback.svg);
              setFlowChartExplanation(fallback.explanation);
              setFlowChartSuggestions(fallback.suggestions);
              setVisualTopic(queryText);
              setFlowChartModalOpen(true);
            } else {
              setDiagramIsPossible(true);
              setDiagramSvg(fallback.svg);
              setDiagramExplanation(fallback.explanation);
              setDiagramSuggestions(fallback.suggestions);
              setVisualTopic(queryText);
              setDiagramModalOpen(true);
            }
            const assistantMsg = {
              role: 'assistant',
              content: `I have generated the requested visual based on the document. [Opened in Modal View]`,
              isRag: true,
              chunksUsed: res.chunksUsed,
              attachedFileTitle: fileToUse.title,
            };
            setMessages((prev) => [...prev, assistantMsg]);
            return;
          }
        }
      }

      const assistantMsg = {
        role: 'assistant',
        content: res.answer,
        isRag: true,
        chunksUsed: res.chunksUsed,
        attachedFileTitle: fileToUse.title,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || 'Failed to get explanation.';
      toast.error(errorMsg);
      const assistantMsg = {
        role: 'assistant',
        content: errorMsg,
        isError: true,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setSubmittingDoc(false);
    }
  };
  // Unified submission handler
  const handleSubmit = (e) => {
    e.preventDefault();
    const query = prompt.trim();
    if (!query) return;

    if (attachedFile) {
      handleExplainDoc(query);
    } else {
      handleExplainText(query);
    }
  };

  // Quick suggestions
  const handleSuggestionClick = (suggestion) => {
    if (attachedFile) {
      handleExplainDoc(suggestion);
    } else {
      handleExplainText(suggestion);
    }
  };

  // File Upload Handlers (triggered from input panel buttons)
  const handleAttachmentUpload = async (e, expectedType) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (expectedType === 'PDF' && file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed.');
        return;
      }
      if (expectedType === 'IMAGE' && !file.type.startsWith('image/')) {
        toast.error('Only image files are allowed.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size exceeds the 20 MB limit.');
        return;
      }

      // Detach existing file first as per upload replacement rule
      setAttachedFile(null);

      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await dispatch(uploadResource({ formData })).unwrap();
        toast.success('File uploaded and attached successfully!');
        setAttachedFile(res);
      } catch (err) {
        toast.error(err || 'Failed to upload file.');
      }
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setAttachedFile(null);
    setDraftPoints([]);
    setDraftTitle('Revision Notes');
    setDraftSummary('');
    toast.success('Chat restarted!');
  };

  // Focus Input Ref
  const handleFocusInput = () => {
    inputRef.current?.focus();
  };

  // Extract key points to drafting board
  const handleExtractPoints = async (content) => {
    setExtractingPoints(true);
    toast.info('Extracting concepts to Drafting Board...');
    try {
      const res = await apiClient.post('/ai/extract-points', { aiContent: content });
      const { title, summary, importantPoints } = res.data;
      setDraftTitle(title || 'Revision Notes');
      setDraftSummary(summary || '');
      setDraftPoints(importantPoints || []);
      toast.success('Concepts loaded! Customize them in the right sidebar.');
    } catch (err) {
      toast.error('Failed to extract learning concepts.');
    } finally {
      setExtractingPoints(false);
    }
  };

  const handleCopy = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard!');
  };

  // Save drafts to user library
  const handleSaveDraftNote = async () => {
    let finalPoints = [...draftPoints];
    if (newPointText.trim()) {
      finalPoints.push(newPointText.trim());
    }
    if (finalPoints.length === 0) return;
    setSavingPoints(true);
    try {
      await dispatch(
        createNote({
          title: draftTitle,
          summary: draftSummary,
          importantPoints: finalPoints,
          content: finalPoints.join('\n\n'),
          sourceDocument: attachedFile ? attachedFile.title : 'General Chat',
        })
      ).unwrap();
      toast.success('Revision Notes saved successfully.');
      setDraftPoints([]);
      setDraftTitle('Revision Notes');
      setDraftSummary('');
      setNewPointText('');
    } catch (err) {
      toast.error(err.message || 'Failed to save note.');
    } finally {
      setSavingPoints(false);
    }
  };

  const handleSaveDraftSticky = async () => {
    let finalPoints = [...draftPoints];
    if (newPointText.trim()) {
      finalPoints.push(newPointText.trim());
    }
    if (finalPoints.length === 0) return;
    setSavingPoints(true);
    try {
      const colors = ['Yellow', 'Pink', 'Blue', 'Green', 'Purple', 'Orange'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      await apiClient.post('/notes/sticky', {
        title: draftTitle.substring(0, 15),
        content: draftSummary || finalPoints[0] || 'Takeaway',
        color: randomColor,
        documentId: attachedFile ? attachedFile.id : null,
      });
      toast.success('Sticky Note saved.');
      setDraftPoints([]);
      setDraftTitle('Revision Notes');
      setDraftSummary('');
      setNewPointText('');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save sticky note.');
    } finally {
      setSavingPoints(false);
    }
  };

  // Save notes directly
  const handleSaveNotesDirect = async (text) => {
    try {
      await dispatch(createNote({
        title: 'Saved Explanation Note',
        content: text,
        sourceType: 'AI_EXPLANATION',
        sourceDocument: attachedFile ? attachedFile.title : 'AI Chat'
      })).unwrap();
      toast.success('Notes saved to workspace notes list!');
    } catch (err) {
      toast.error('Failed to save note.');
    }
  };

  const handleGenerateRealImage = async (parsed, queryText) => {
    setDiagramModalOpen(true);
    setDiagramLoading(true);
    setDiagramIsPossible(true);
    setVisualTopic(queryText);
    setDiagramExplanation(parsed.explanation || 'Generating your image...');
    setDiagramSuggestions(parsed.alternativeSuggestions || ['Generate Mock Test', 'Simplify in Hindi', 'Extract Formulas']);
    
    try {
      const imgRes = await apiClient.post('/ai/image/generate', {
        prompt: parsed.prompt,
        aspectRatio: parsed.aspectRatio || '16:9',
        resolution: parsed.resolution || '1K'
      });
      const data = imgRes.data || imgRes;
      setVisualConfig({
        type: 'IMAGE',
        image: data.image,
        prompt: parsed.prompt,
        aspectRatio: parsed.aspectRatio || '16:9',
        explanation: parsed.explanation || 'Visual generated successfully.'
      });
    } catch (imgErr) {
      toast.error('Unable to generate the image right now.');
      setDiagramIsPossible(false);
      setDiagramExplanation('Unable to generate the image right now. Please try again with a revised prompt.');
    } finally {
      setDiagramLoading(false);
    }
  };

  const handleSaveImageNotes = async () => {
    if (!visualConfig) return;
    try {
      await dispatch(createNote({
        title: visualConfig.title || 'Saved AI Visual',
        content: `![Generated Image](${visualConfig.image || ''})\n\n**Prompt:** ${visualConfig.prompt || ''}\n\n**Explanation:** ${visualConfig.explanation || ''}`,
        sourceType: 'IMAGE',
        sourceDocument: attachedFile ? attachedFile.title : 'AI Chat'
      })).unwrap();
      toast.success('Image visual saved to notes list!');
    } catch (err) {
      toast.error('Failed to save image note.');
    }
  };

  const handleRegenerateImage = async () => {
    if (!visualConfig) return;
    setDiagramLoading(true);
    try {
      const res = await apiClient.post('/ai/image/generate', {
        prompt: editedPrompt || visualConfig.prompt,
        aspectRatio: editedAspectRatio || visualConfig.aspectRatio,
        resolution: '1K'
      });
      const data = res.data || res;
      setVisualConfig({
        ...visualConfig,
        image: data.image,
        prompt: editedPrompt || visualConfig.prompt,
        aspectRatio: editedAspectRatio || visualConfig.aspectRatio
      });
      toast.success('Image regenerated successfully!');
    } catch (err) {
      toast.error('Failed to regenerate image.');
    } finally {
      setDiagramLoading(false);
    }
  };

  // Save formula book sheet directly
  const handleSaveFormulaBookDirect = async (text) => {
    try {
      await dispatch(createNote({
        title: 'Saved Formula Book',
        content: text,
        sourceType: 'FORMULA_BOOK',
        sourceDocument: attachedFile ? attachedFile.title : 'AI Chat'
      })).unwrap();
      toast.success('Formula Book saved to your workspace!');
    } catch (err) {
      toast.error('Failed to save Formula Book.');
    }
  };

  // Save sticky note
  const handleSaveSticky = async (text) => {
    try {
      await apiClient.post('/sticky-notes', {
        title: 'Study Snippet',
        content: text.substring(0, 300),
        color: 'yellow'
      });
      toast.success('Snippet saved as a Sticky Note!');
    } catch (err) {
      toast.error('Failed to save sticky note.');
    }
  };

  // Generate formula book
  const handleGenerateFormulaBook = async (text) => {
    setFormulaDrawerOpen(true);
    setFormulaLoading(true);
    setFormulaContent('');
    try {
      const prompt = `Based on this concept/text:\n"${text}"\n\nGenerate a detailed Formula Book sheet. It must include:\n1. Key definitions and concept overviews.\n2. Important formulas with symbol meanings and units.\n3. Short revision tricks, tips, and memory hooks.\n4. Crucial constants or numerical values.\n\nFormat it beautifully in clean Markdown with headers. Do not output any chat introductions or markdown code wrappers, just start with raw Markdown content.`;
      const res = await apiClient.post('/ai/chat', { prompt });
      setFormulaContent(res.data?.response || res.response || 'No formula book content generated.');
    } catch (err) {
      toast.error('Failed to generate formula book.');
    } finally {
      setFormulaLoading(false);
    }
  };

  // Generate flow chart SVG
  const handleGenerateFlowChart = async (text) => {
    setFlowChartModalOpen(true);
    setFlowChartLoading(true);
    setFlowChartSvg('');
    setFlowChartExplanation('');
    setFlowChartIsPossible(true);
    setFlowChartSuggestions([]);
    setVisualTopic(text);
    try {
      const prompt = `Based on this concept/text:\n"${text.substring(0, 800)}"\n\nGenerate a logical flow chart explaining the sequence or relationship. If a flowchart is NOT possible or relevant for this concept, set "isPossible" to false.

Return a JSON object in this exact format:
{
  "type": "FLOWCHART",
  "title": "Flowchart Title",
  "nodes": [
    { "id": "1", "label": "Node Label" }
  ],
  "edges": [
    ["1", "2"]
  ],
  "explanation": "Detailed explanation of the flowchart sequence",
  "alternativeSuggestions": ["Generate Mock Test", "Simplify in Hindi", "Extract Formulas"]
}

Return ONLY the raw JSON object. Do not include markdown code block syntax (like \`\`\`json) or any other text.`;
      
      const res = await apiClient.post('/ai/chat', { prompt });
      let rawRes = res.data?.response || res.response || '';
      rawRes = rawRes.replace(/```json/gi, '').replace(/```/gi, '').trim();
      
      try {
        let jsonString = rawRes;
        const jsonStart = rawRes.indexOf('{');
        const jsonEnd = rawRes.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonString = rawRes.substring(jsonStart, jsonEnd + 1);
        }
        const parsed = JSON.parse(jsonString);
        setVisualConfig(parsed);
        setFlowChartIsPossible(parsed.isPossible !== false);
        setFlowChartSvg('');
        setFlowChartExplanation(parsed.explanation || 'Flowchart generated.');
        setFlowChartSuggestions(parsed.alternativeSuggestions || []);
      } catch (jsonErr) {
        const fallback = extractSvgAndExplanationFallback(rawRes);
        if (fallback) {
          setVisualConfig(fallback);
          setFlowChartIsPossible(true);
          setFlowChartSvg(fallback.svg);
          setFlowChartExplanation(fallback.explanation);
          setFlowChartSuggestions(fallback.suggestions || ['Generate Mock Test', 'Simplify in Hindi', 'Extract Formulas']);
        } else {
          throw jsonErr;
        }
      }
    } catch (err) {
      setFlowChartIsPossible(false);
      setFlowChartExplanation('Failed to generate flowchart logic. Would you like to try another topic or action instead?');
      setFlowChartSuggestions(['Generate Mock Test', 'Simplify in Hindi', 'Extract Formulas']);
    } finally {
      setFlowChartLoading(false);
    }
  };

  // Generate diagram SVG
  const handleGenerateDiagram = async (text) => {
    setDiagramModalOpen(true);
    setDiagramLoading(true);
    setDiagramSvg('');
    setDiagramExplanation('');
    setDiagramIsPossible(true);
    setDiagramSuggestions([]);
    setVisualTopic(text);
    try {
      const prompt = `Based on this concept/text:\n"${text.substring(0, 800)}"\n\nGenerate an educational diagram or map configuration. If the user requests a map, output a MAP config type. If they request a scientific diagram, output a SCIENTIFIC_DIAGRAM type. If a diagram is NOT possible, set "isPossible" to false.

Return a JSON object in this exact format:
{
  "type": "CONCEPT_DIAGRAM", // or "MAP", "SCIENTIFIC_DIAGRAM"
  "mapId": "india-states", // if type is MAP
  "diagramId": "human-heart", // if type is SCIENTIFIC_DIAGRAM
  "title": "Diagram Title",
  "nodes": [
    { "id": "1", "label": "Node Label" }
  ],
  "edges": [
    ["1", "2"]
  ],
  "explanation": "Detailed explanation of the visual structure",
  "alternativeSuggestions": ["Generate Mock Test", "Simplify in Hindi", "Extract Formulas"]
}

Return ONLY the raw JSON object. Do not include markdown code block syntax (like \`\`\`json) or any other text.`;
      
      const res = await apiClient.post('/ai/chat', { prompt });
      let rawRes = res.data?.response || res.response || '';
      rawRes = rawRes.replace(/```json/gi, '').replace(/```/gi, '').trim();
      
      try {
        let jsonString = rawRes;
        const jsonStart = rawRes.indexOf('{');
        const jsonEnd = rawRes.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonString = rawRes.substring(jsonStart, jsonEnd + 1);
        }
        const parsed = JSON.parse(jsonString);
        setVisualConfig(parsed);
        setDiagramIsPossible(parsed.isPossible !== false);
        setDiagramSvg('');
        setDiagramExplanation(parsed.explanation || 'Diagram generated.');
        setDiagramSuggestions(parsed.alternativeSuggestions || []);
      } catch (jsonErr) {
        const fallback = extractSvgAndExplanationFallback(rawRes);
        if (fallback) {
          setVisualConfig(fallback);
          setDiagramIsPossible(true);
          setDiagramSvg(fallback.svg);
          setDiagramExplanation(fallback.explanation);
          setDiagramSuggestions(fallback.suggestions || ['Generate Mock Test', 'Simplify in Hindi', 'Extract Formulas']);
        } else {
          throw jsonErr;
        }
      }
    } catch (err) {
      setDiagramIsPossible(false);
      setDiagramExplanation('Failed to generate diagram graphics. Would you like to try another topic or action instead?');
      setDiagramSuggestions(['Generate Mock Test', 'Simplify in Hindi', 'Extract Formulas']);
    } finally {
      setDiagramLoading(false);
    }
  };

  // Generate Mock Test from AI Response
  const handleGenerateMockTest = async (text) => {
    toast.info('Generating practice test based on this topic...');
    try {
      const prompt = `Create a mock test of 10 questions on the topic: ${text.substring(0, 100)}`;
      const res = await apiClient.post('/ai/chat', { prompt });
      if (res && res.intent === 'MOCK_TEST') {
        toast.success('AI Practice Mock Test created successfully!');
        navigate(`/mock-tests/${res.mockTestId}`);
      } else {
        toast.error('Failed to trigger mock test generation intent.');
      }
    } catch (err) {
      toast.error('Failed to generate mock test.');
    }
  };

  // Translate AI response to Hindi in chat
  const handleTranslate = async (text) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: 'Translating explanation to Hindi...', isLoading: true }]);
    try {
      const prompt = `Translate the following text to Hindi (maintain code blocks or math symbols as is):\n"${text}"\n\nReturn only the translated text.`;
      const res = await apiClient.post('/ai/chat', { prompt });
      const ans = res.data?.response || res.response || 'Translation failed.';
      setMessages((prev) => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, { role: 'assistant', content: ans }];
      });
    } catch (err) {
      toast.error('Failed to translate.');
    }
  };

  // Simplify AI response for children in chat
  const handleSimplify = async (text) => {
    setMessages((prev) => [...prev, { role: 'assistant', content: 'Simplifying explanation...', isLoading: true }]);
    try {
      const prompt = `Rewrite and simplify the following explanation using simple language, analogies, and a friendly tone suitable for a 10-year-old child:\n"${text}"`;
      const res = await apiClient.post('/ai/chat', { prompt });
      const ans = res.data?.response || res.response || 'Simplification failed.';
      setMessages((prev) => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, { role: 'assistant', content: ans }];
      });
    } catch (err) {
      toast.error('Failed to simplify.');
    }
  };

  const handleDownloadSVG = () => {
    const svgElement = document.querySelector('.relative svg');
    if (!svgElement) {
      toast.error('No SVG found to download.');
      return;
    }
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = `${visualConfig?.title || 'diagram'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
    toast.success('Downloaded SVG!');
  };

  const handleDownloadPNG = () => {
    const svgElement = document.querySelector('.relative svg');
    if (!svgElement) {
      toast.error('No SVG found to download.');
      return;
    }
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const bounds = svgElement.getBoundingClientRect();
    canvas.width = bounds.width || 800;
    canvas.height = bounds.height || 600;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = url;
      link.download = `${visualConfig?.title || 'diagram'}.png`;
      link.click();
      toast.success('Downloaded PNG!');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
  };

  // Download SVG Helper
  const downloadSvg = (svgContent, fileName) => {
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.body.appendChild(document.createElement('a'));
    link.href = url;
    link.download = `${fileName}.svg`;
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
    toast.success('Downloaded SVG file!');
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4">
      {/* Top Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-neutral-50 border border-neutral-200/50 p-6 text-neutral-800 shadow-sm mb-6">
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-brand-650" />
            AI Learning Assistant
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 sm:text-2xl">
            AI Learning Assistant
          </h1>
          <p className="text-xs text-neutral-500 max-w-xl">
            Ask questions, upload PDFs or images, and let EduOS help you understand, remember and revise.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column (lg:col-span-3): Unified Central Chat Workspace */}
        <div className="lg:col-span-3 h-[580px] flex flex-col border border-neutral-200/60 rounded-2xl bg-white overflow-hidden shadow-sm">
          {/* Main chat viewport */}
          <div className="flex-1 flex flex-col min-h-0 bg-white relative">
            {messages.length === 0 ? (
              /* Empty Chat Landing State */
              <div className="flex-1 flex flex-col justify-center items-center px-6 max-w-xl mx-auto w-full py-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-brand-50 text-brand-650 flex items-center justify-center mb-4 border border-brand-100 shadow-sm animate-pulse">
                  <Brain className="h-8 w-8" />
                </div>
                <h3 className="text-base font-extrabold text-neutral-800">
                  What would you like to learn today?
                </h3>
                <p className="text-xs text-neutral-450 mt-1 max-w-xs leading-relaxed">
                  Ask anything, or click the buttons below to attach a PDF/Image for contextual explanation.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-sm mt-6">
                  <button
                    onClick={handleFocusInput}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-all shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                    Ask Question
                  </button>
                  <button
                    onClick={() => document.getElementById('chat-pdf-upload-empty').click()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-all shadow-sm"
                  >
                    <FileText className="h-3.5 w-3.5 text-red-500" />
                    Upload PDF
                  </button>
                  <button
                    onClick={() => document.getElementById('chat-image-upload-empty').click()}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition-all shadow-sm"
                  >
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-500" />
                    Upload Image
                  </button>
                </div>

                {/* Hidden upload inputs for empty state buttons */}
                <input
                  id="chat-pdf-upload-empty"
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleAttachmentUpload(e, 'PDF')}
                />
                <input
                  id="chat-image-upload-empty"
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => handleAttachmentUpload(e, 'IMAGE')}
                />
              </div>
            ) : (
              /* Active Chat Thread */
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((message, index) => {
                  const isUser = message.role === 'user';
                  
                  // Extract suggestions if they exist in message content
                  let displayContent = message.content || '';
                  let suggestions = [];
                  if (!isUser && displayContent.includes('||Suggestions:')) {
                    const parts = displayContent.split('||Suggestions:');
                    displayContent = parts[0].trim();
                    if (parts[1]) {
                      const sugText = parts[1].replace(/\|\|/g, '').trim();
                      suggestions = sugText.split('|').map(s => s.trim()).filter(Boolean);
                    }
                  }

                  return (
                    <div
                      key={index}
                      className={`flex gap-4 p-1 rounded-xl transition-colors max-w-2xl mx-auto ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {!isUser && (
                        <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-650 flex items-center justify-center shadow-sm">
                          <GraduationCap className="h-4.5 w-4.5 text-white" />
                        </div>
                      )}

                      <div className={`max-w-[85%] flex flex-col space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">
                          {isUser ? 'You' : 'EduOS AI'}
                        </span>
                        <div
                          className={`text-sm leading-relaxed px-4 py-3 rounded-2xl ${
                            isUser
                              ? 'bg-brand-600 text-white rounded-tr-none shadow-sm shadow-brand-500/10'
                              : message.isError
                                ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-none'
                                : 'bg-neutral-55 border border-neutral-200/50 text-neutral-800 rounded-tl-none'
                          }`}
                        >
                          {isUser ? (
                            displayContent
                          ) : (
                            <MarkdownRenderer content={displayContent} />
                          )}

                          {/* RAG Context Badge */}
                          {!isUser && message.isRag && (
                            <div className="mt-3 flex flex-wrap gap-2 items-center border-t border-neutral-200/50 pt-2">
                              <Badge className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-150 text-[9px] font-bold px-2 py-0.5 shadow-none rounded-md">
                                Answer generated from attached: {message.attachedFileTitle}
                              </Badge>
                              {message.chunksUsed > 0 && (
                                <span className="text-[9px] text-neutral-400 font-semibold">
                                  ({message.chunksUsed} chunks used)
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Interactive Suggestion Chips */}
                        {!isUser && suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2 max-w-full">
                            {suggestions.map((sug, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSuggestionClick(sug)}
                                className="px-3 py-1.5 rounded-full text-[10px] font-extrabold bg-neutral-100 hover:bg-brand-50 border border-neutral-200 hover:border-brand-300 text-neutral-700 hover:text-brand-700 transition-all shadow-xs cursor-pointer active:scale-95 transform"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* AI Response Action Buttons */}
                        {!isUser && (
                          <div className="flex flex-wrap gap-1.5 mt-2 bg-neutral-50/50 p-1.5 rounded-xl border border-neutral-100/80 max-w-full">
                            <button
                              onClick={() => handleSaveNotesDirect(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-white border border-neutral-200 text-neutral-600 hover:text-brand-700 hover:border-brand-200 transition-all shadow-sm"
                              title="Save explanation directly as note"
                            >
                              <FileText className="h-3 w-3 text-neutral-400" />
                              Save Notes
                            </button>
                            <button
                              onClick={() => handleSaveSticky(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-white border border-neutral-200 text-neutral-600 hover:text-brand-700 hover:border-brand-200 transition-all shadow-sm"
                              title="Save as quick sticky note"
                            >
                              <Pin className="h-3 w-3 text-neutral-400" />
                              Save Sticky Notes
                            </button>
                            <button
                              onClick={() => handleGenerateFormulaBook(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-brand-55/10 border border-brand-200/50 text-brand-700 hover:bg-brand-100 transition-all shadow-sm"
                              title="Extract Formulas, constants & tricks"
                            >
                              <Plus className="h-3 w-3 text-brand-550" />
                              Generate Formula Book
                            </button>
                            <button
                              onClick={() => handleGenerateFlowChart(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-indigo-50/50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-all shadow-sm"
                              title="View visual sequence flow chart"
                            >
                              <RefreshCw className="h-3 w-3 text-indigo-550 animate-pulse" />
                              Generate Flow Chart
                            </button>
                            <button
                              onClick={() => handleGenerateDiagram(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-emerald-50/50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100 transition-all shadow-sm"
                              title="Draw interactive SVG diagram"
                            >
                              <Brain className="h-3 w-3 text-emerald-550" />
                              Generate Diagram
                            </button>
                            <button
                              onClick={() => handleGenerateMockTest(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-amber-50/50 border border-amber-100 text-amber-700 hover:bg-amber-100 transition-all shadow-sm"
                              title="Generate 10 MCQ Mock Test"
                            >
                              <Sparkles className="h-3 w-3 text-amber-550" />
                              Generate Mock Test
                            </button>
                            <button
                              onClick={() => handleTranslate(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-800 transition-all shadow-sm"
                              title="Translate to Hindi"
                            >
                              <Languages className="h-3 w-3 text-neutral-400" />
                              Translate (Hindi)
                            </button>
                            <button
                              onClick={() => handleSimplify(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-800 transition-all shadow-sm"
                              title="Simplify explanation for standard understanding"
                            >
                              <Smile className="h-3 w-3 text-neutral-450" />
                              Simplify
                            </button>
                            <button
                              onClick={() => handleCopy(displayContent)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold bg-white border border-neutral-200 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-all shadow-sm ml-auto"
                              title="Copy response text"
                            >
                              <Copy className="h-3 w-3 text-neutral-400" />
                              Copy
                            </button>
                          </div>
                        )}
                      </div>

                      {isUser && (
                        <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-200 flex items-center justify-center border border-neutral-300">
                          <User className="h-4 w-4 text-neutral-500" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading skeleton */}
                {(submitting || submittingDoc) && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex gap-4 p-1 items-start max-w-2xl mx-auto animate-pulse">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-brand-500 to-indigo-650 flex items-center justify-center shadow-sm">
                      <Brain className="h-4.5 w-4.5 text-white animate-pulse" />
                    </div>
                    <div className="max-w-[80%] space-y-2 flex-1">
                      <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider">
                        EduOS AI is reading...
                      </span>
                      <div className="bg-neutral-50 border border-neutral-200/55 rounded-2xl rounded-tl-none p-4 space-y-2">
                        <Skeleton className="h-3.5 w-full bg-neutral-200" />
                        <Skeleton className="h-3.5 w-5/6 bg-neutral-200" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Unified Input Card at bottom */}
          <div className="p-4 border-t border-neutral-100 bg-gradient-to-t from-white via-white/80 to-transparent shrink-0">
            <form
              onSubmit={handleSubmit}
              className="relative max-w-2xl mx-auto border border-neutral-200 rounded-2xl bg-white shadow-md focus-within:border-brand-500/80 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all duration-200 p-3"
            >
              {/* Attachment chip rendered inside the input box */}
              {attachedFile && (
                <div className="flex items-center gap-2 mb-2 p-1.5 bg-neutral-50 rounded-xl border border-neutral-250/30 w-fit max-w-[280px] animate-fade-in">
                  <div className={`h-7 w-7 rounded-lg shrink-0 flex items-center justify-center border ${
                    attachedFile.fileType === 'PDF' ? 'bg-red-50 text-red-500 border-red-150' : 'bg-emerald-50 text-emerald-500 border-emerald-150'
                  }`}>
                    {attachedFile.fileType === 'PDF' ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <h4 className="text-[10px] font-bold text-neutral-800 truncate" title={attachedFile.title}>
                      {attachedFile.title}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[8px] font-semibold">
                      {!attachedFileDetails ||
                      attachedFileDetails.processingStatus === 'PROCESSING' ||
                      attachedFileDetails.processingStatus === 'UPLOADED' ? (
                        <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          {processingPhase}
                        </span>
                      ) : attachedFileDetails.processingStatus === 'READY' ? (
                        <span className="text-emerald-600 flex items-center gap-0.5">✓ Ready</span>
                      ) : (
                        <span className="text-red-650">Failed</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="h-5 w-5 rounded-full hover:bg-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}

              <Textarea
                ref={inputRef}
                rows={1}
                placeholder="Ask anything or upload a PDF/image..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={submitting || submittingDoc}
                className="w-full text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1.5 resize-none placeholder-neutral-400 bg-transparent outline-none focus:outline-none min-h-[38px] max-h-[120px]"
              />

              <div className="flex items-center justify-between border-t border-neutral-100 pt-2 mt-2">
                {/* Left side attachment icons */}
                <div className="flex items-center gap-1.5">
                  <input
                    id="chat-pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) => handleAttachmentUpload(e, 'PDF')}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => document.getElementById('chat-pdf-upload').click()}
                    className="h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 flex items-center justify-center transition-colors border border-neutral-250/20"
                    title="Attach PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </button>

                  <input
                    id="chat-image-upload"
                    type="file"
                    accept=".png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => handleAttachmentUpload(e, 'IMAGE')}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => document.getElementById('chat-image-upload').click()}
                    className="h-8 w-8 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 flex items-center justify-center transition-colors border border-neutral-250/20"
                    title="Attach Image"
                  >
                    <ImageIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Right side submit button */}
                <div className="flex items-center gap-2">
                  {uploading ? (
                    <div className="h-8 w-8 flex items-center justify-center">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-brand-600" />
                    </div>
                  ) : (
                    <Button
                      type="submit"
                      size="icon"
                      className="shrink-0 bg-brand-600 hover:bg-brand-700 text-white rounded-full h-8 w-8 flex items-center justify-center shadow-sm"
                      disabled={
                        submitting ||
                        submittingDoc ||
                        !prompt.trim() ||
                        (attachedFile && (!attachedFileDetails || attachedFileDetails.processingStatus !== 'READY'))
                      }
                    >
                      <Send className="h-4 w-4 transform -rotate-45" />
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Suggestion chips in active chat */}
          {messages.length > 0 && !prompt && (
            <div className="flex flex-wrap justify-center gap-1.5 pb-3">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="text-[10px] font-semibold bg-neutral-50 hover:bg-neutral-100 text-neutral-600 px-3 py-1 rounded-full border border-neutral-200/50 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (lg:col-span-1): Revision Drafting Board Panel */}
        <div className="lg:col-span-1">
          <Card className="border border-neutral-200/85 shadow-sm bg-white overflow-hidden flex flex-col h-[580px]">
            <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <span className="font-bold text-neutral-800 text-xs flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-600" />
                Drafting Board
              </span>
              {draftPoints.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="text-[9px] font-bold text-neutral-450 hover:text-red-650 transition-colors uppercase tracking-wider"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {extractingPoints ? (
                <div className="flex flex-col items-center justify-center h-full space-y-3">
                  <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Extracting key points...</p>
                </div>
              ) : draftPoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="h-10 w-10 rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-400 flex items-center justify-center mb-3">
                    <Sparkles className="h-5 w-5 text-neutral-400 animate-bounce" />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-800">Drafting Board is empty</h4>
                  <p className="text-[10px] text-neutral-450 mt-1 max-w-[200px] leading-relaxed">
                    Click **"Extract Key Points"** under any AI message to pull out structured concepts here. You can then edit, remove, or add custom points before saving!
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  {/* Note Title Input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Note Title</label>
                    <input
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      className="w-full text-xs font-semibold border border-neutral-255 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="e.g. Concept Basics"
                    />
                  </div>

                  {/* Note Summary Input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Summary</label>
                    <textarea
                      rows={2}
                      value={draftSummary}
                      onChange={(e) => setDraftSummary(e.target.value)}
                      className="w-full text-xs border border-neutral-255 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none font-medium"
                      placeholder="e.g. Core definition..."
                    />
                  </div>

                  {/* Important Points List */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Key Learning Points</label>
                    <div className="space-y-2.5">
                      {draftPoints.map((point, index) => (
                        <div key={index} className="flex items-start gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/50 shadow-sm/5">
                          <textarea
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                            rows={2}
                            value={point}
                            onChange={(e) => {
                              const updated = [...draftPoints];
                              updated[index] = e.target.value;
                              setDraftPoints(updated);
                            }}
                            className="flex-1 text-xs bg-transparent border-0 outline-none focus:outline-none resize-none p-0 text-neutral-700 leading-relaxed font-semibold overflow-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDraftPoints(draftPoints.filter((_, i) => i !== index));
                            }}
                            className="p-0.5 rounded-full hover:bg-neutral-250/50 text-neutral-450 hover:text-neutral-700 transition-colors shrink-0 mt-0.5"
                            title="Remove Point"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Add custom point row */}
                  <div className="pt-2 border-t border-neutral-105">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add a new custom learning point..."
                        value={newPointText}
                        onChange={(e) => setNewPointText(e.target.value)}
                        className="flex-1 text-xs border border-neutral-255 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newPointText.trim()) {
                              setDraftPoints([...draftPoints, newPointText.trim()]);
                              setNewPointText('');
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newPointText.trim()) {
                            setDraftPoints([...draftPoints, newPointText.trim()]);
                            setNewPointText('');
                          }
                        }}
                        className="h-8 w-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 border border-neutral-200/60 flex items-center justify-center transition-colors shrink-0"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save Actions */}
            {draftPoints.length > 0 && !extractingPoints && (
              <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 space-y-2 shrink-0">
                <Button
                  type="button"
                  onClick={handleSaveDraftNote}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm"
                  disabled={savingPoints}
                >
                  <Star className="h-3.5 w-3.5" />
                  Save as Revision Note
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveDraftSticky}
                  className="w-full bg-white hover:bg-neutral-150/60 text-neutral-700 border border-neutral-250/30 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5"
                  disabled={savingPoints}
                >
                  <Pin className="h-3.5 w-3.5" />
                  Save Sticky Takeaway
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>

      {/* 1. Formula Book slide-out drawer */}
      {formulaDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden text-left flex justify-end">
          {/* Overlay backdrop */}
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs transition-opacity" onClick={() => setFormulaDrawerOpen(false)} />
          
          {/* Drawer container */}
          <div className="relative z-10 w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-slide-in">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-600" />
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-800">Formula Book Page</h3>
                  <p className="text-[10px] text-neutral-450 font-semibold">Important formulas, tricks & constants</p>
                </div>
              </div>
              <button
                onClick={() => setFormulaDrawerOpen(false)}
                className="h-7 w-7 rounded-full hover:bg-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {formulaLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2.5">
                  <RefreshCw className="h-6 w-6 text-brand-500 animate-spin" />
                  <span className="text-xs text-neutral-450 font-bold">Extracting formulas and short tricks...</span>
                </div>
              ) : (
                <MarkdownRenderer content={formulaContent} />
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50/70 flex items-center justify-between gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  printWindow.document.write(`<pre style="font-family:sans-serif;padding:20px;font-size:14px;line-height:1.6;">${formulaContent}</pre>`);
                  printWindow.document.close();
                  printWindow.print();
                }}
                className="font-bold text-xs"
              >
                Download PDF
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopy(formulaContent)}
                  className="font-bold text-xs"
                >
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveFormulaBookDirect(formulaContent)}
                  className="font-bold text-xs"
                >
                  Save Formula Book
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Flowchart Modal */}
      {flowChartModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setFlowChartModalOpen(false)} />
          <Card className="relative z-10 w-full max-w-4xl bg-white border shadow-2xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col text-left">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-indigo-650 animate-pulse" />
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-800">Concept Flow Chart</h3>
                  <p className="text-[10px] text-neutral-450 font-semibold">Visual sequencing of the concept</p>
                </div>
              </div>
              <button
                onClick={() => setFlowChartModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/30 min-h-[350px]">
              {flowChartLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
                  <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
                  <span className="text-xs text-neutral-450 font-extrabold">Drawing flowchart...</span>
                </div>
              ) : !flowChartIsPossible ? (
                <div className="max-w-md mx-auto text-center py-12 space-y-5">
                  <div className="inline-flex h-12 w-12 rounded-full bg-amber-50 text-amber-600 items-center justify-center border border-amber-100">
                    <Smile className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-neutral-800">Visual Flow Chart Unavailable</h4>
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                      {flowChartExplanation}
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <h5 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Alternative study actions:</h5>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {flowChartSuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setFlowChartModalOpen(false);
                            if (sug.toLowerCase().includes('test')) {
                              handleGenerateMockTest(visualTopic);
                            } else if (sug.toLowerCase().includes('hindi') || sug.toLowerCase().includes('translate')) {
                              handleTranslate(visualTopic);
                            } else if (sug.toLowerCase().includes('formula')) {
                              handleGenerateFormulaBook(visualTopic);
                            } else {
                              handleSuggestionClick(sug);
                            }
                          }}
                          className="px-3 py-1.5 rounded-full text-[10px] font-extrabold bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 transition-all cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-full items-stretch">
                  <div className="md:col-span-3 flex flex-col space-y-2">
                    <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Canvas View</span>
                    <div className="w-full flex-1 min-h-[300px] flex items-center justify-center relative">
                      <VisualRenderer 
                        visualData={visualConfig} 
                        onRetry={() => handleExplainText(visualTopic)}
                        onSimplify={() => handleExplainText(`Simplify diagram for ${visualTopic}`)}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex flex-col space-y-2 border-l border-neutral-100 pl-0 md:pl-6">
                    <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">📖 Concept Explanation</span>
                    <div className="flex-1 overflow-y-auto max-h-[400px] pr-2">
                      <MarkdownRenderer content={flowChartExplanation} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-end gap-2">
              {flowChartIsPossible && flowChartSvg && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(flowChartSvg)}
                    leftIcon={<Copy className="h-3.5 w-3.5" />}
                  >
                    Copy SVG Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadSvg(flowChartSvg, 'flowchart')}
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Download SVG
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveNotesDirect(`### Flowchart SVG\n\n\`\`\`xml\n${flowChartSvg}\n\`\`\``)}
                  >
                    Save to Notes
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 3. Diagram Modal */}
      {diagramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setDiagramModalOpen(false)} />
          <Card className="relative z-10 w-full max-w-4xl bg-white border shadow-2xl rounded-3xl overflow-hidden max-h-[85vh] flex flex-col text-left">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-650 animate-pulse" />
                <div>
                  <h3 className="text-sm font-extrabold text-neutral-800">
                    {visualConfig?.type === 'IMAGE' ? 'AI Image' : 'Educational Diagram'}
                  </h3>
                  <p className="text-[10px] text-neutral-450 font-semibold">
                    {visualConfig?.type === 'IMAGE' ? 'Creative visual generated by EduOS' : 'Visual model of concept parts'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDiagramModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/30 min-h-[350px]">
              {diagramLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
                  <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                  <span className="text-xs text-neutral-450 font-extrabold">Drawing diagram...</span>
                </div>
              ) : !diagramIsPossible ? (
                <div className="max-w-md mx-auto text-center py-12 space-y-5">
                  <div className="inline-flex h-12 w-12 rounded-full bg-amber-50 text-amber-600 items-center justify-center border border-amber-100">
                    <Smile className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-neutral-800">Visual Diagram Unavailable</h4>
                    <p className="text-xs text-neutral-500 mt-2 leading-relaxed">
                      {diagramExplanation}
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <h5 className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Alternative study actions:</h5>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {diagramSuggestions.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setDiagramModalOpen(false);
                            if (sug.toLowerCase().includes('test')) {
                              handleGenerateMockTest(visualTopic);
                            } else if (sug.toLowerCase().includes('hindi') || sug.toLowerCase().includes('translate')) {
                              handleTranslate(visualTopic);
                            } else if (sug.toLowerCase().includes('formula')) {
                              handleGenerateFormulaBook(visualTopic);
                            } else {
                              handleSuggestionClick(sug);
                            }
                          }}
                          className="px-3 py-1.5 rounded-full text-[10px] font-extrabold bg-emerald-55/15 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all cursor-pointer"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-full items-stretch">
                  <div className="md:col-span-3 flex flex-col space-y-2">
                    <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">Canvas View</span>
                    <div className="w-full flex-1 min-h-[300px] flex items-center justify-center relative">
                      <VisualRenderer 
                        visualData={visualConfig} 
                        onRetry={() => handleExplainText(visualTopic)}
                        onSimplify={() => handleExplainText(`Simplify diagram for ${visualTopic}`)}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 flex flex-col space-y-2 border-l border-neutral-100 pl-0 md:pl-6">
                    {isEditingPrompt && visualConfig?.type === 'IMAGE' ? (
                      <div className="flex-1 flex flex-col space-y-3">
                        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">⚙️ Image Parameters</span>
                        
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-wide">Aspect Ratio</label>
                          <select
                            value={editedAspectRatio}
                            onChange={(e) => setEditedAspectRatio(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-200/20 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-700"
                          >
                            <option value="1:1">Square (1:1)</option>
                            <option value="16:9">Landscape (16:9)</option>
                            <option value="2:3">Poster (2:3)</option>
                            <option value="3:2">Wide Image (3:2)</option>
                            <option value="4:3">Classic Photo (4:3)</option>
                            <option value="9:16">Portrait (9:16)</option>
                          </select>
                        </div>

                        <div className="flex-1 flex flex-col space-y-1 text-left">
                          <label className="text-[9px] font-black text-neutral-500 uppercase tracking-wide">Image Generator Prompt</label>
                          <textarea
                            value={editedPrompt}
                            onChange={(e) => setEditedPrompt(e.target.value)}
                            placeholder="Describe what style and details you want in the image..."
                            className="w-full flex-1 min-h-[140px] bg-neutral-900 border border-neutral-200/20 rounded-xl p-3 text-xs font-semibold text-neutral-750 resize-none leading-relaxed"
                          />
                        </div>

                        <Button
                          size="sm"
                          onClick={handleRegenerateImage}
                          className="w-full bg-brand-600 hover:bg-brand-700"
                        >
                          Regenerate Background
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider">
                          🎨 Design Concept
                        </span>
                        <div className="flex-1 overflow-y-auto max-h-[400px] pr-2 text-left">
                          <MarkdownRenderer content={visualConfig?.explanation || diagramExplanation} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 bg-neutral-50/60 flex items-center justify-end gap-2">
              {diagramIsPossible && visualConfig && (
                <>
                  {visualConfig.type === 'IMAGE' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingPrompt(!isEditingPrompt)}
                        leftIcon={<Copy className="h-3.5 w-3.5" />}
                      >
                        {isEditingPrompt ? 'View Design Concept' : 'Edit Prompt'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = visualConfig.image;
                          link.download = `${visualConfig.title || 'creative-visual'}.png`;
                          link.click();
                          toast.success('Downloaded PNG successfully!');
                        }}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Download PNG
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveImageNotes}
                      >
                        Save to Notes
                      </Button>
                    </>
                  ) : (
                    <>
                      {visualConfig.type !== 'MAP' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopy(JSON.stringify(visualConfig, null, 2))}
                          leftIcon={<Copy className="h-3.5 w-3.5" />}
                        >
                          Copy Config Code
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadSVG}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Download SVG
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPNG}
                        leftIcon={<Plus className="h-3.5 w-3.5" />}
                      >
                        Download PNG
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveNotesDirect(`### Labeled Visual Config\n\n\`\`\`json\n${JSON.stringify(visualConfig, null, 2)}\n\`\`\``)}
                      >
                        Save to Notes
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
