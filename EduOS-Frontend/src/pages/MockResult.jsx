import React, { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@hooks';
import {
  fetchAttemptDetails,
  selectMockAttempt,
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
import { Award, Clock, ArrowLeft, CheckCircle2, XCircle, AlertCircle, HelpCircle, Eye } from 'lucide-react';

export default function MockResult() {
  const { attemptId } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const attempt = useAppSelector(selectMockAttempt);
  const loading = useAppSelector(selectMockTestLoading);
  const error = useAppSelector(selectMockTestError);

  useEffect(() => {
    if (attemptId) {
      dispatch(fetchAttemptDetails(attemptId));
    }
  }, [dispatch, attemptId]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(resetMockTestError());
    }
  }, [error, dispatch]);

  const performance = useMemo(() => {
    if (!attempt) return null;
    const pct = attempt.percentage;
    if (pct >= 85) return { badge: 'Excellent', color: 'bg-emerald-50 text-emerald-800 border-emerald-250', desc: 'Fantastic job! You have fully mastered this topic.' };
    if (pct >= 70) return { badge: 'Good', color: 'bg-sky-50 text-sky-800 border-sky-250', desc: 'Well done! A solid understanding of the concepts.' };
    if (pct >= 50) return { badge: 'Average', color: 'bg-amber-50 text-amber-800 border-amber-250', desc: 'Good effort. Review the explanations to cover your gaps.' };
    return { badge: 'Needs Improvement', color: 'bg-rose-50 text-rose-800 border-rose-250', desc: 'Review the subject material and try generating another test to practice!' };
  }, [attempt]);

  const formatSeconds = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins === 0) return `${secs} Secs`;
    return `${mins} Mins ${secs} Secs`;
  };

  if (loading || !attempt) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <Clock className="h-8 w-8 animate-spin text-brand-600" />
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Evaluating Scorecard...</p>
      </div>
    );
  }

  const { mockTest } = attempt;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header and Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/mock-tests')}
          className="flex items-center gap-1.5 text-xs font-bold text-neutral-450 hover:text-neutral-700 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>
      </div>

      {/* Main Scorecard Banner Card */}
      <Card className="bg-white border border-neutral-200/80 shadow-md rounded-3xl overflow-hidden text-left">
        <div className="p-6 md:p-8 border-b border-neutral-100 bg-neutral-50/50 flex flex-col md:flex-row items-center gap-6">
          {/* Circular Score display */}
          <div className="relative h-28 w-28 shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-indigo-650 text-white shadow-md">
            <div className="flex flex-col items-center">
              <span className="text-3xl font-extrabold tracking-tight">{attempt.score}</span>
              <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest border-t border-white/20 mt-1 pt-0.5">
                Out of {attempt.totalMarks}
              </span>
            </div>
          </div>

          <div className="space-y-2 flex-1 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <Badge className="bg-brand-50 hover:bg-brand-100 text-brand-700 border-none font-bold text-[9px] py-0.5 px-2 rounded-md">
                {mockTest.subject}
              </Badge>
              <Badge className={`text-[9px] font-extrabold py-0.5 border ${performance?.color}`}>
                Performance: {performance?.badge}
              </Badge>
            </div>
            <h1 className="text-base md:text-lg font-extrabold text-neutral-850 tracking-tight leading-snug">
              Scorecard: {mockTest.title}
            </h1>
            <p className="text-xs text-neutral-500 font-semibold leading-relaxed max-w-lg">
              {performance?.desc}
            </p>
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-6">
          {/* Statistics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/50">
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block leading-none mb-1">Percentage</span>
              <span className="text-sm font-extrabold text-brand-700">{attempt.percentage}%</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider block leading-none mb-1">Correct</span>
              <span className="text-sm font-extrabold text-emerald-700">{attempt.totalCorrect} / {mockTest.totalQuestions}</span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-100">
              <span className="text-[9px] font-bold text-rose-600 uppercase tracking-wider block leading-none mb-1">Incorrect</span>
              <span className="text-sm font-extrabold text-rose-700">{attempt.totalWrong} / {mockTest.totalQuestions}</span>
            </div>
            <div className="p-4 rounded-2xl bg-neutral-100/50 border border-neutral-200/60">
              <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider block leading-none mb-1">Time Taken</span>
              <span className="text-sm font-extrabold text-neutral-800">{formatSeconds(attempt.timeTaken)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answer Key Review Details */}
      <div className="space-y-4 text-left">
        <h3 className="text-sm font-extrabold text-neutral-850 flex items-center gap-1.5 px-1">
          <Eye className="h-4 w-4 text-brand-650" />
          Review Questions & Answer Explanations
        </h3>

        <div className="space-y-4">
          {mockTest.questions?.map((q, index) => {
            const ans = attempt.answers.find(a => a.questionId === q.id);
            const isCorrect = ans?.isCorrect ?? false;
            const isSkipped = !ans?.selectedOption;
            const selected = ans?.selectedOption;

            return (
              <Card key={q.id} className="bg-white border border-neutral-200/70 shadow-sm rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-neutral-100 bg-neutral-50/30 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-neutral-450 uppercase tracking-wider">
                    Question {index + 1}
                  </span>
                  
                  {isSkipped ? (
                    <Badge className="bg-neutral-150/70 text-neutral-600 border-none font-bold text-[9px] py-0.5 px-2 rounded-md">
                      Skipped
                    </Badge>
                  ) : isCorrect ? (
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-150 font-bold text-[9px] py-0.5 px-2 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Correct
                    </Badge>
                  ) : (
                    <Badge className="bg-rose-50 text-rose-800 border-rose-150 font-bold text-[9px] py-0.5 px-2 rounded-md flex items-center gap-1">
                      <XCircle className="h-3 w-3" /> Incorrect
                    </Badge>
                  )}
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Question */}
                  <h4 className="text-xs font-bold text-neutral-800 leading-relaxed">
                    {q.question}
                  </h4>

                  {/* Options render mapping */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      { key: 'A', text: q.optionA },
                      { key: 'B', text: q.optionB },
                      { key: 'C', text: q.optionC },
                      { key: 'D', text: q.optionD },
                    ].map((opt) => {
                      const isSelected = selected === opt.key;
                      const isCorrectAnswer = q.correctOption === opt.key;
                      
                      let cardBorder = 'border-neutral-200 bg-white';
                      if (isCorrectAnswer) {
                        cardBorder = 'border-emerald-250 bg-emerald-50/20 text-emerald-950 font-semibold';
                      } else if (isSelected && !isCorrect) {
                        cardBorder = 'border-rose-250 bg-rose-50/20 text-rose-950';
                      }

                      return (
                        <div key={opt.key} className={`p-3 border rounded-xl flex items-center gap-2.5 text-xs ${cardBorder}`}>
                          <div className={`h-5 w-5 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0 ${
                            isCorrectAnswer
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : isSelected
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'bg-neutral-50 border-neutral-200 text-neutral-500'
                          }`}>
                            {opt.key}
                          </div>
                          <span>{cleanOptionText(opt.text, opt.key)}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Explanation collapsible/expand banner */}
                  {q.explanation && (
                    <div className="p-3.5 bg-neutral-55 border border-neutral-200/50 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 text-brand-600" />
                        AI Explanation
                      </span>
                      <p className="text-xs text-neutral-600 leading-relaxed font-semibold">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const cleanOptionText = (text, key) => {
  if (!text) return '';
  const regex = new RegExp(`^${key}[\\)\\.]\\s*`, 'i');
  return text.replace(regex, '');
};
