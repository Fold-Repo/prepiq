'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  generateQuestionAnswer,
  QuestionData,
  AnswerStyle,
  QuestionCitationData,
  GeneratedAnswerData,
} from '@/services/questions';
import { getDocumentById } from '@/services/documents';
import {
  X,
  Sparkles,
  BookMarked,
  FileText,
  ExternalLink,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Award,
} from 'lucide-react';

interface AnswerViewModalProps {
  isOpen: boolean;
  question: QuestionData | null;
  token: string;
  onClose: () => void;
}

export function AnswerViewModal({
  isOpen,
  question,
  token,
  onClose,
}: AnswerViewModalProps) {
  const [selectedStyle, setSelectedStyle] = useState<AnswerStyle>('EXAM');
  const [answerData, setAnswerData] = useState<GeneratedAnswerData | null>(null);
  const [citations, setCitations] = useState<QuestionCitationData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchAnswer = useCallback(
    async (style: AnswerStyle) => {
      if (!question || !token) return;
      setIsGenerating(true);

      try {
        const result = await generateQuestionAnswer(token, question.id, style);
        setAnswerData(result.answer);
        setCitations(result.citations);
      } catch (err: any) {
        alert(err.message || 'Failed to generate answer');
      } finally {
        setIsGenerating(false);
      }
    },
    [question, token]
  );

  useEffect(() => {
    if (isOpen && question) {
      if (question.answers && question.answers.length > 0) {
        setAnswerData(question.answers[0]);
        // Also generate or refresh citations
        fetchAnswer(selectedStyle);
      } else {
        fetchAnswer(selectedStyle);
      }
    }
  }, [isOpen, question, selectedStyle, fetchAnswer]);

  if (!isOpen || !question) return null;

  async function handleOpenCitation(docId: string, pageNumber: number) {
    if (!token) return;
    try {
      const doc = await getDocumentById(token, docId);
      if (doc.downloadUrl) {
        window.open(`${doc.downloadUrl}#page=${pageNumber}`, '_blank');
      }
    } catch (err) {
      alert('Failed to open cited document');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full p-6 relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Question Header */}
        <div className="flex items-start space-x-3 mb-4 pr-8 shrink-0">
          <div className="bg-brand-600 text-white p-2.5 rounded-xl shadow-md shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded">
                Question {question.questionNumber}
              </span>
              {question.marks && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center space-x-1">
                  <Award className="w-3 h-3 text-amber-600" />
                  <span>{question.marks} Marks</span>
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-1 line-clamp-2">{question.content}</h2>
          </div>
        </div>

        {/* Answer Style Selector Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 shrink-0">
          <div className="flex space-x-2">
            {(['EXAM', 'SHORT', 'DETAILED', 'STEP_BY_STEP'] as AnswerStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => {
                  setSelectedStyle(style);
                  fetchAnswer(style);
                }}
                disabled={isGenerating}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  selectedStyle === style
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {style.replace('_', ' ')}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchAnswer(selectedStyle)}
            disabled={isGenerating}
            className="flex items-center space-x-1 text-slate-500 hover:text-brand-600 text-xs font-medium px-2.5 py-1 rounded transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
        </div>

        {/* Answer Content Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {isGenerating ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-700">Analyzing lecture material & generating exam answer...</p>
              <p className="text-xs text-slate-400 mt-1">Grounding response against course slides and model solutions</p>
            </div>
          ) : answerData ? (
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-3 text-xs text-slate-500 border-b border-slate-200/60 pb-2">
                  <span className="font-semibold text-brand-700">Grounded {selectedStyle} Answer</span>
                  {answerData.confidence && (
                    <span className="flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{Math.round(answerData.confidence * 100)}% Grounded Confidence</span>
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap font-sans">
                  {answerData.answer}
                </div>
              </div>

              {/* Citations & Evidence Section */}
              {citations.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                    <BookMarked className="w-4 h-4 text-brand-600" />
                    <span>Source Evidence & Citations ({citations.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {citations.map((cit, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleOpenCitation(cit.documentId, cit.pageNumber)}
                        className="p-3 bg-slate-50 hover:bg-brand-50 border border-slate-200 hover:border-brand-200 rounded-xl cursor-pointer transition group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 group-hover:text-brand-600">
                            <FileText className="w-3.5 h-3.5 text-brand-600" />
                            <span className="truncate max-w-[180px]">{cit.documentName}</span>
                          </div>
                          <span className="text-[11px] font-semibold text-brand-700 bg-brand-100 px-2 py-0.5 rounded">
                            Page {cit.pageNumber}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 italic">"{cit.excerpt}"</p>
                        <div className="mt-2 text-[10px] text-brand-600 font-semibold flex items-center space-x-1">
                          <span>Open in Viewer</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-sm">No answer generated yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
