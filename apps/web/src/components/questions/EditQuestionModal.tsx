'use client';

import React, { useState, useEffect } from 'react';
import { updateQuestion, QuestionData, QuestionType } from '@/services/questions';
import { X, Edit3, AlertCircle, Loader2, Save } from 'lucide-react';

interface EditQuestionModalProps {
  isOpen: boolean;
  question: QuestionData | null;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditQuestionModal({
  isOpen,
  question,
  token,
  onClose,
  onSuccess,
}: EditQuestionModalProps) {
  const [questionNumber, setQuestionNumber] = useState('');
  const [content, setContent] = useState('');
  const [officialAnswer, setOfficialAnswer] = useState('');
  const [marks, setMarks] = useState<number | ''>('');
  const [type, setType] = useState<QuestionType>('SHORT_ANSWER');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (question) {
      setQuestionNumber(question.questionNumber || '');
      setContent(question.content || '');
      setOfficialAnswer(question.officialAnswer || '');
      setMarks(question.marks ?? '');
      setType(question.type || 'SHORT_ANSWER');
    }
  }, [question]);

  if (!isOpen || !question) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question) return;

    setError(null);
    setIsSaving(true);

    try {
      await updateQuestion(token, question.id, {
        questionNumber,
        content,
        officialAnswer: officialAnswer || null,
        marks: marks !== '' ? Number(marks) : undefined,
        type,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update question');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-brand-50 text-brand-600 p-3 rounded-xl">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Review & Edit Question</h2>
            <p className="text-xs text-slate-500">Correct AI parsing errors or update question details.</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Question No.
              </label>
              <input
                type="text"
                required
                value={questionNumber}
                onChange={(e) => setQuestionNumber(e.target.value)}
                placeholder="e.g. 1(a)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition outline-none text-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Marks
              </label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 10"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition outline-none text-slate-900 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition outline-none text-slate-900 text-sm bg-white"
              >
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="ESSAY">Essay</option>
                <option value="MCQ">Multiple Choice</option>
                <option value="CALCULATION">Calculation</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Question Content
            </label>
            <textarea
              rows={5}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Question prompt..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition outline-none text-slate-900 text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Official / correct answer
            </label>
            <textarea
              rows={4}
              value={officialAnswer}
              onChange={(e) => setOfficialAnswer(e.target.value)}
              placeholder="Model answer or mark scheme for this question..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition outline-none text-slate-900 text-sm resize-none"
            />
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
