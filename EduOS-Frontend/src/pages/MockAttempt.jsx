import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  fetchTestById,
  submitTestAttemptThunk,
  selectSelectedMockTest,
  selectMockTestLoading,
  selectMockTestSubmitting,
  selectMockTestError,
  resetMockTestError,
} from '@redux/slices/mock-test.slice.js';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Separator,
  toast,
} from '@components/ui/index.jsx';
import { Clock, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2, Bookmark, Trash2, ArrowRight } from 'lucide-react';

export default function MockAttempt() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const test = useAppSelector(selectSelectedMockTest);
  const loading = useAppSelector(selectMockTestLoading);
  const submitting = useAppSelector(selectMockTestSubmitting);
  const error = useAppSelector(selectMockTestError);

  // Active question index
  const [activeIndex, setActiveIndex] = useState(0);

  // Answers list: array of { questionId, selectedOption, markedForReview }
  const [answers, setAnswers] = useState([]);

  // Time left in seconds
  const [timeLeft, setTimeLeft] = useState(0);

  // Started timestamp
  const [startedAt, setStartedAt] = useState(null);

  // Confirm submit modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  // Refs for tracking timer
  const timerRef = useRef(null);

  // Load test details
  useEffect(() => {
    if (id) {
      dispatch(fetchTestById(id));
    }
  }, [dispatch, id]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetMockTestError());
    }
  }, [error, dispatch]);

  // Initialize test parameters and load from localStorage if exists
  useEffect(() => {
    if (!test) return;

    const storageKey = `eduos_mock_attempt_${test.id}`;
    const savedState = localStorage.getItem(storageKey);

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setAnswers(parsed.answers || []);
        setActiveIndex(parsed.activeIndex || 0);
        setStartedAt(parsed.startedAt || new Date().toISOString());

        // Calculate remaining seconds
        const elapsed = Math.round((new Date() - new Date(parsed.startedAt)) / 1000);
        const durationSecs = test.durationMinutes * 60;
        const remaining = Math.max(0, durationSecs - elapsed);
        setTimeLeft(remaining);
        
        toast.info('Restored your previous test progress!');
      } catch (e) {
        localStorage.removeItem(storageKey);
        initializeFresh();
      }
    } else {
      initializeFresh();
    }

    function initializeFresh() {
      const initialAnswers = test.questions.map(q => ({
        questionId: q.id,
        selectedOption: null,
        markedForReview: false,
      }));
      setAnswers(initialAnswers);
      setActiveIndex(0);
      setStartedAt(new Date().toISOString());
      setTimeLeft(test.durationMinutes * 60);
    }
  }, [test]);

  // Save progress continuously to localStorage
  useEffect(() => {
    if (!test || answers.length === 0 || !startedAt) return;
    const storageKey = `eduos_mock_attempt_${test.id}`;
    localStorage.setItem(storageKey, JSON.stringify({
      answers,
      activeIndex,
      startedAt,
    }));
  }, [answers, activeIndex, startedAt, test]);

  // Live Timer ticking effect
  useEffect(() => {
    if (timeLeft <= 0 && startedAt && test) {
      if (timeLeft === 0) {
        handleAutoSubmit();
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timeLeft, startedAt, test]);

  const handleAutoSubmit = async () => {
    toast.warning('Time expired! Submitting your test automatically...');
    await executeSubmission();
  };

  const executeSubmission = async () => {
    if (!test) return;
    
    // Format answers to match backend expectations: array of { questionId, selectedOption }
    const answersPayload = answers.map(ans => ({
      questionId: ans.questionId,
      selectedOption: ans.selectedOption,
    }));

    try {
      const result = await dispatch(submitTestAttemptThunk({
        id: test.id,
        data: {
          startedAt,
          answers: answersPayload,
        },
      })).unwrap();

      // Clear localStorage cache on success
      localStorage.removeItem(`eduos_mock_attempt_${test.id}`);
      toast.success('Mock Test submitted successfully!');
      navigate(`/mock-tests/attempts/${result.id}`);
    } catch (err) {
      toast.error(err.message || 'Failed to submit test attempt.');
    }
  };

  const handleAnswerSelect = (option) => {
    const updated = [...answers];
    updated[activeIndex] = {
      ...updated[activeIndex],
      selectedOption: option,
    };
    setAnswers(updated);
  };

  const handleToggleReview = () => {
    const updated = [...answers];
    updated[activeIndex] = {
      ...updated[activeIndex],
      markedForReview: !updated[activeIndex].markedForReview,
    };
    setAnswers(updated);
  };

  const handleClearSelection = () => {
    const updated = [...answers];
    updated[activeIndex] = {
      ...updated[activeIndex],
      selectedOption: null,
    };
    setAnswers(updated);
  };

  const handleSubmitClick = () => {
    setSubmitModalOpen(true);
  };

  const unansweredCount = useMemo(() => {
    return answers.filter(a => !a.selectedOption).length;
  }, [answers]);

  if (loading || !test || answers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Clock className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Preparing Exam Workspace...</p>
      </div>
    );
  }

  const activeQuestion = test.questions[activeIndex];
  const activeAnswer = answers[activeIndex];

  // Helper for formatting time
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Banner timer and submit actions */}
      <div className="flex items-center justify-between bg-white border border-neutral-200/80 p-4 rounded-2xl shadow-sm">
        <div className="text-left">
          <h2 className="text-sm font-extrabold text-neutral-850 truncate max-w-[240px] sm:max-w-sm" title={test.title}>
            {test.title}
          </h2>
          <span className="text-[10px] text-neutral-450 font-bold uppercase tracking-wider">{test.subject}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Live countdown badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-xs font-bold ${
            timeLeft < 60
              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
              : 'bg-neutral-50 text-neutral-800 border-neutral-200'
          }`}>
            <Clock className="h-4 w-4" />
            <span>Time Left: {formatTime(timeLeft)}</span>
          </div>

          <Button
            onClick={handleSubmitClick}
            className="bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm"
          >
            Submit Test
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Column (lg:col-span-3): Active Question Frame */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-white border border-neutral-200 shadow-sm rounded-3xl overflow-hidden text-left">
            <div className="p-5 border-b border-neutral-100 bg-neutral-50/40 flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-widest leading-none">
                Question {activeIndex + 1} of {test.totalQuestions}
              </span>
              <Badge className="bg-neutral-100 text-neutral-600 border-none font-bold text-[9px]">
                {activeQuestion.marks || 1} Marks
              </Badge>
            </div>

            <CardContent className="p-6 md:p-8 space-y-6">
              {/* Question Text */}
              <h3 className="text-sm font-extrabold text-neutral-800 leading-relaxed">
                {activeQuestion.question}
              </h3>

              {/* Options selection stack */}
              <div className="space-y-3">
                {[
                  { key: 'A', text: activeQuestion.optionA },
                  { key: 'B', text: activeQuestion.optionB },
                  { key: 'C', text: activeQuestion.optionC },
                  { key: 'D', text: activeQuestion.optionD },
                ].map((opt) => {
                  const isSelected = activeAnswer?.selectedOption === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleAnswerSelect(opt.key)}
                      className={`w-full text-left p-4 border rounded-2xl flex items-center gap-3 transition-all duration-200 ${
                        isSelected
                          ? 'bg-brand-50/70 border-brand-300 text-brand-900 shadow-sm'
                          : 'bg-white border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/30'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-xl flex items-center justify-center text-xs font-bold border transition-colors ${
                        isSelected
                          ? 'bg-brand-600 border-brand-600 text-white'
                          : 'bg-neutral-50 border-neutral-250 text-neutral-500'
                      }`}>
                        {opt.key}
                      </div>
                      <span className="text-xs font-bold text-neutral-750 leading-normal">
                        {cleanOptionText(opt.text, opt.key)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Bottom navigation buttons */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleReview}
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  activeAnswer?.markedForReview
                    ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                    : 'border-neutral-250 hover:bg-neutral-50 text-neutral-600'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${activeAnswer?.markedForReview ? 'fill-amber-600 text-amber-600' : ''}`} />
                {activeAnswer?.markedForReview ? 'Marked for Review' : 'Mark for Review'}
              </Button>
              {activeAnswer?.selectedOption && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelection}
                  className="text-xs font-bold hover:bg-red-50 text-neutral-450 hover:text-red-650 flex items-center gap-1"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Selection
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                disabled={activeIndex === 0}
                className="text-xs font-bold border-neutral-250"
              >
                <ChevronLeft className="h-4.5 w-4.5 mr-1" />
                Previous
              </Button>
              {activeIndex === test.totalQuestions - 1 ? (
                <Button
                  size="sm"
                  onClick={handleSubmitClick}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
                >
                  Submit
                  <CheckCircle2 className="h-4.5 w-4.5 ml-1.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveIndex(prev => Math.min(test.totalQuestions - 1, prev + 1))}
                  className="text-xs font-bold border-neutral-250"
                >
                  Next
                  <ChevronRight className="h-4.5 w-4.5 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-1): Grid Navigator */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-white border border-neutral-200 shadow-sm rounded-3xl p-5 text-left">
            <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-wider mb-4 block">Question Navigation</h4>

            {/* Grid Layout */}
            <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
              {answers.map((ans, idx) => {
                const isActive = activeIndex === idx;
                const isAnswered = !!ans.selectedOption;
                const isMarked = ans.markedForReview;
                
                let blockColor = 'bg-neutral-100 text-neutral-500 border-neutral-200/80';
                if (isActive) {
                  blockColor = 'bg-sky-50 text-sky-850 border-sky-350 font-extrabold ring-1 ring-sky-300';
                } else if (isMarked) {
                  blockColor = 'bg-amber-50 text-amber-800 border-amber-300';
                } else if (isAnswered) {
                  blockColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                }

                return (
                  <button
                    key={ans.questionId}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-9 w-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${blockColor}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <Separator className="my-5" />

            {/* Color indicators legend */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-extrabold text-neutral-450 uppercase tracking-wider block">Status Legend</span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-sky-50 border border-sky-300 shrink-0" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-emerald-50 border border-emerald-300 shrink-0" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-amber-50 border border-amber-300 shrink-0" />
                  <span>Review</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded bg-neutral-100 border border-neutral-200 shrink-0" />
                  <span>Not Answered</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Submit dialog modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${submitModalOpen ? 'block' : 'hidden'}`}>
        <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm" onClick={() => setSubmitModalOpen(false)} />
        <Card className="relative z-10 w-full max-w-sm border border-neutral-200 shadow-xl bg-white rounded-2xl">
          <div className="p-5 space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-brand-50 text-brand-700 shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-extrabold text-neutral-850">Submit Exam</h3>
                {unansweredCount > 0 ? (
                  <p className="text-xs text-rose-700 font-semibold leading-relaxed">
                    ⚠️ You still have {unansweredCount} unanswered questions left. Do you want to submit anyway?
                  </p>
                ) : (
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    Are you sure you want to finalize and submit your test? Your attempt details will be graded instantly.
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSubmitModalOpen(false)}>
                Go Back
              </Button>
              <Button
                onClick={async () => {
                  setSubmitModalOpen(false);
                  await executeSubmission();
                }}
                disabled={submitting}
                className="bg-brand-650 hover:bg-brand-700 text-white font-bold text-xs"
              >
                {submitting ? 'Submitting...' : 'Submit Test'}
                {!submitting && <ArrowRight className="h-4 w-4 ml-1.5" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

const cleanOptionText = (text, key) => {
  if (!text) return '';
  const regex = new RegExp(`^${key}[\\)\\.]\\s*`, 'i');
  return text.replace(regex, '');
};
