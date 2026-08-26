import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  fetchTestById,
  selectSelectedMockTest,
  selectMockTestLoading,
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
import { ClipboardCheck, Clock, Award, ChevronLeft, AlertCircle, Play, ShieldAlert } from 'lucide-react';

export default function MockTestDetails() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const test = useAppSelector(selectSelectedMockTest);
  const loading = useAppSelector(selectMockTestLoading);
  const error = useAppSelector(selectMockTestError);

  useEffect(() => {
    if (id) {
      dispatch(fetchTestById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetMockTestError());
    }
  }, [error, dispatch]);

  if (loading || !test) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-6 w-32 bg-neutral-200 animate-pulse rounded" />
        <Card className="bg-white border border-neutral-250/50 shadow-sm animate-pulse rounded-2xl">
          <CardContent className="p-8 space-y-4">
            <div className="h-6 w-1/2 bg-neutral-200 rounded" />
            <div className="h-4 w-1/4 bg-neutral-100 rounded" />
            <Separator />
            <div className="h-4 w-full bg-neutral-100 rounded" />
            <div className="h-4 w-5/6 bg-neutral-100 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const getDifficultyColor = (diff) => {
    switch (diff?.toLowerCase()) {
      case 'easy':
        return 'bg-emerald-50 text-emerald-700 border-emerald-150';
      case 'hard':
        return 'bg-rose-50 text-rose-700 border-rose-150';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-150';
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/mock-tests')}
        className="flex items-center gap-1.5 text-xs font-bold text-neutral-450 hover:text-neutral-700 transition-colors uppercase tracking-wider"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Mock Tests
      </button>

      {/* Main card */}
      <Card className="bg-white border border-neutral-200/80 shadow-md rounded-3xl overflow-hidden">
        <div className="p-6 md:p-8 border-b border-neutral-100 bg-neutral-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 text-left">
            <div className="flex items-center gap-2">
              <Badge className="bg-brand-50 hover:bg-brand-100 text-brand-700 border-none font-bold text-[9px] py-0.5 px-2 rounded-md">
                {test.subject || 'General Study'}
              </Badge>
              <Badge className={`text-[9px] font-extrabold py-0.5 border ${getDifficultyColor(test.difficulty)}`}>
                {test.difficulty}
              </Badge>
            </div>
            <h1 className="text-lg font-extrabold text-neutral-850 tracking-tight leading-snug">
              {test.title}
            </h1>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-neutral-200/50 flex items-center justify-center shrink-0 shadow-sm/5">
            <ClipboardCheck className="h-7 w-7 text-brand-600" />
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-6 text-left">
          {/* Description */}
          {test.description && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Description</span>
              <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                {test.description}
              </p>
            </div>
          )}

          {/* Key test settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/55 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-50 text-brand-750 shrink-0">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block leading-none mb-1">Duration</span>
                <span className="text-sm font-extrabold text-neutral-800">{test.durationMinutes} Mins</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/55 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-50 text-brand-750 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block leading-none mb-1">Questions</span>
                <span className="text-sm font-extrabold text-neutral-800">{test.totalQuestions} Items</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/55 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-brand-50 text-brand-750 shrink-0">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block leading-none mb-1">Total Marks</span>
                <span className="text-sm font-extrabold text-neutral-800">{test.totalMarks} Marks</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Test Instructions */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-neutral-800 uppercase tracking-wider">Examination Rules & Guidelines</h4>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2.5 text-xs text-neutral-600 leading-relaxed font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                <span>**One Question at a Time**: You will navigate through questions one by one. Use the navigator bar to skip or review questions.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-neutral-600 leading-relaxed font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                <span>**Time Limit**: Once you start, the timer cannot be paused. Ensure you submit the test before the countdown finishes.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-neutral-600 leading-relaxed font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                <span>**Progress Recovery**: If you refresh or exit the tab, your answers are auto-saved locally and will restore automatically.</span>
              </li>
              <li className="flex items-start gap-2.5 text-xs text-neutral-600 leading-relaxed font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                <span>**Submission**: You can mark questions for review if you are unsure. Make sure to complete and submit the test when ready.</span>
              </li>
            </ul>
          </div>

          {/* Alert Banner */}
          <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-2xl flex items-start gap-3 text-xs text-amber-900 leading-relaxed font-bold">
            <ShieldAlert className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span>Important Warning</span>
              <p className="text-[10px] text-amber-800 font-semibold mt-0.5 leading-normal">
                Clicking the button below will start the exam countdown. Ensure you have a quiet environment and a stable internet connection before launching the test.
              </p>
            </div>
          </div>

          {/* Start button */}
          <Button
            onClick={() => navigate(`/mock-tests/${test.id}/attempt`)}
            className="w-full bg-brand-650 hover:bg-brand-700 text-white font-extrabold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all duration-200 hover:scale-[1.005]"
          >
            <Play className="h-4 w-4 fill-white" />
            Launch Mock Test Attempt
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
