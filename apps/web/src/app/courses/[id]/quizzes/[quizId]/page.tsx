'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getQuizById, startQuizAttempt, submitQuizAttempt, Quiz, QuizAttempt } from '@/services/quizzes';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function QuizAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const quizId = params.quizId as string;
  const { token, user, isLoading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null); // To store submitted attempt with answers

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (token && courseId && quizId) {
      loadQuiz(token);
    }
  }, [authLoading, user, token, courseId, quizId]);

  async function loadQuiz(authToken: string) {
    try {
      const data = await getQuizById(authToken, courseId, quizId);
      setQuiz(data);
      // Check if user has an ongoing attempt or completed attempts
      if (data.attempts && data.attempts.length > 0) {
        // Just take the most recent one for simplicity
        const lastAttempt = data.attempts[0];
        if (lastAttempt.status === 'COMPLETED') {
          // If we want to show results we could fetch attempt detail.
          // For now, let's allow them to start a new attempt or see that they finished.
        } else {
          setAttempt(lastAttempt);
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to load quiz');
      router.push(`/courses/${courseId}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartAttempt() {
    if (!token) return;
    try {
      setLoading(true);
      const newAttempt = await startQuizAttempt(token, courseId, quizId);
      setAttempt(newAttempt);
    } catch (err) {
      alert('Failed to start attempt');
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(questionId: string, val: string) {
    setAnswers(prev => ({ ...prev, [questionId]: val }));
  }

  async function handleSubmit() {
    if (!token || !attempt) return;
    if (!confirm('Are you sure you want to submit your answers?')) return;
    
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([qId, ans]) => ({
        questionId: qId,
        providedAnswer: ans,
      }));
      
      const submitted = await submitQuizAttempt(token, courseId, quizId, attempt.id, formattedAnswers);
      setResult(submitted);
      setAttempt(null);
    } catch (err) {
      alert('Failed to submit attempt');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center space-x-4">
          <Link href={`/courses/${courseId}`} className="text-slate-400 hover:text-slate-700 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-lg text-slate-900 leading-none">{quiz.title}</h1>
            <p className="text-xs text-slate-500 mt-1">{quiz.description}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        {!attempt && !result && (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to start?</h2>
            <p className="text-slate-500 mb-6">This quiz contains {quiz.questions?.length} questions.</p>
            <button
              onClick={handleStartAttempt}
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition"
            >
              Start Quiz
            </button>
          </div>
        )}

        {attempt && quiz.questions && (
          <div className="space-y-8">
            {quiz.questions.map((q, idx) => {
              const options = q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [];
              return (
                <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-brand-50 text-brand-700 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 text-lg mb-1">{q.content}</p>
                      <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                        {q.type.replace('_', ' ')} • {q.marks} Mark{q.marks > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  <div className="pl-12">
                    {q.type === 'MCQ' && options.length > 0 && (
                      <div className="space-y-3">
                        {options.map((opt: string, i: number) => (
                          <label key={i} className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={opt}
                              checked={answers[q.id] === opt}
                              onChange={() => handleAnswerChange(q.id, opt)}
                              className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-slate-300"
                            />
                            <span className="text-slate-700">{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {q.type === 'SHORT_ANSWER' && (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Type your answer here..."
                        rows={4}
                        className="w-full p-4 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-y"
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <div className="flex justify-end pt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Submit Quiz</span>
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Completed!</h2>
              <div className="text-5xl font-extrabold text-brand-600 my-6">
                {result.score} <span className="text-2xl text-slate-400">/ {result.maxScore}</span>
              </div>
              <p className="text-slate-500">Your answers have been graded.</p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Detailed Feedback</h3>
              {result.answers && result.answers.map((ans: any, idx: number) => {
                const question = quiz.questions?.find(q => q.id === ans.questionId);
                return (
                  <div key={ans.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <p className="font-semibold text-slate-900 text-lg flex-1 mr-4">{idx + 1}. {question?.content}</p>
                      <div className="shrink-0 flex items-center space-x-2">
                        {ans.isCorrect ? <CheckCircle2 className="w-6 h-6 text-green-500" /> : <XCircle className="w-6 h-6 text-red-500" />}
                        <span className="font-bold text-slate-700">{ans.scoreAwarded} / {question?.marks}</span>
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Your Answer:</span>
                      <p className="text-slate-800">{ans.providedAnswer || <em className="text-slate-400">No answer provided</em>}</p>
                    </div>

                    <div className="flex items-start space-x-3 bg-brand-50 p-4 rounded-xl border border-brand-100">
                      <AlertCircle className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-brand-800 uppercase tracking-wider block mb-1">Feedback:</span>
                        <p className="text-brand-900 text-sm leading-relaxed whitespace-pre-wrap">{ans.feedback}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center pt-6">
              <Link
                href={`/courses/${courseId}`}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-3 px-8 rounded-xl shadow-sm transition"
              >
                Back to Course
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
