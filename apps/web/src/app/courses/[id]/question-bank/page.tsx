'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourseById } from '@/services/courses';
import { getCourseDocuments, DocumentDetails } from '@/services/documents';
import {
  createQuestion,
  deleteQuestion,
  getCourseQuestions,
  QuestionData,
} from '@/services/questions';
import { getCourseSyllabus, SyllabusTopic } from '@/services/syllabus';
import { CourseContentHeader } from '@/components/content/CourseContentHeader';
import { EditQuestionModal } from '@/components/questions/EditQuestionModal';
import { McqOptions, AnswerSourceBadge } from '@/components/questions/McqOptions';
import { HelpCircle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';

function QuestionBankPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  const [courseName, setCourseName] = useState('');
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [documents, setDocuments] = useState<DocumentDetails[]>([]);
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [documentId, setDocumentId] = useState(searchParams.get('documentId') || '');
  const [topicId, setTopicId] = useState(searchParams.get('topicId') || '');
  const [pageFilter, setPageFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<QuestionData | null>(null);
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [newMarks, setNewMarks] = useState('10');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (authToken: string) => {
      const [course, questionList, docs, syllabus] = await Promise.all([
        getCourseById(authToken, courseId),
        getCourseQuestions(authToken, courseId, {
          documentId: documentId || undefined,
          topicId: topicId || undefined,
          page: pageFilter ? Number(pageFilter) : undefined,
          search: search || undefined,
        }),
        getCourseDocuments(authToken, courseId),
        getCourseSyllabus(authToken, courseId),
      ]);
      setCourseName(course.name);
      setQuestions(questionList);
      setDocuments(docs);
      setTopics(syllabus);
    },
    [courseId, documentId, topicId, pageFilter, search]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (!token || !courseId) return;
    load(token)
      .catch((err) => setError(err.message || 'Failed to load questions'))
      .finally(() => setLoading(false));
  }, [authLoading, user, token, courseId, router, load]);

  const grouped = useMemo(() => {
    const map = new Map<string, QuestionData[]>();
    for (const question of questions) {
      const key = question.document?.name || 'Manual questions';
      const list = map.get(key) || [];
      list.push(question);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [questions]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newContent.trim()) return;
    try {
      await createQuestion(token, courseId, newContent.trim(), Number(newMarks) || 10, 'SHORT_ANSWER', {
        officialAnswer: newAnswer || undefined,
      });
      setNewContent('');
      setNewAnswer('');
      setAdding(false);
      await load(token);
    } catch (err: any) {
      setError(err.message || 'Failed to add question');
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this question?')) return;
    await deleteQuestion(token, id);
    await load(token);
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <CourseContentHeader
        courseId={courseId}
        courseName={courseName}
        active="questions"
        title="Question bank"
      />

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">{error}</div>}

        <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="">All documents</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
          <select
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
          >
            <option value="">All syllabus topics</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.title}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={pageFilter}
            onChange={(e) => setPageFilter(e.target.value)}
            placeholder="Page"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setAdding((value) => !value)}
            className="bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add question
          </button>
        </div>

        {adding && (
          <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={3}
              placeholder="Question stem"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500"
              required
            />
            <textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              rows={3}
              placeholder="Official / correct answer (optional)"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                value={newMarks}
                onChange={(e) => setNewMarks(e.target.value)}
                className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
              <button type="submit" className="bg-brand-600 text-white text-sm font-semibold px-4 py-2 rounded-xl">
                Save
              </button>
            </div>
          </form>
        )}

        {questions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">No questions yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Upload a past paper or Q&amp;A PDF, set the content start page, then process it to extract questions and answers.
            </p>
          </div>
        ) : (
          grouped.map(([group, items]) => (
            <section key={group} className="space-y-3">
              <h2 className="text-sm font-bold text-slate-700">{group}</h2>
              {items.map((question) => (
                <div key={question.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-brand-700 mb-1">
                        {question.questionNumber} · {question.type}
                        {question.marks != null ? ` · ${question.marks} marks` : ''}
                        {question.page?.pageNumber ? ` · p.${question.page.pageNumber}` : ''}
                        {question.source === 'EXTRACTED' ? ' · extracted' : ' · manual'}
                      </div>
                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{question.content}</p>
                      <McqOptions options={question.options} correctOption={question.correctOption} />
                      {question.officialAnswer && (
                        <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm text-emerald-900 whitespace-pre-wrap">
                          <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                            <span>
                              {question.correctOption
                                ? `Answer: option ${question.correctOption.toUpperCase()}`
                                : 'Answer explanation'}
                            </span>
                            <AnswerSourceBadge source={question.officialAnswerSource} />
                          </span>
                          {question.officialAnswer}
                        </div>
                      )}
                      {question.syllabusTopic && (
                        <div className="text-xs text-slate-500 mt-2">Topic: {question.syllabusTopic.title}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {question.documentId && (
                        <Link
                          href={`/courses/${courseId}/documents/${question.documentId}`}
                          className="text-xs font-semibold text-slate-500 hover:text-brand-600 px-2 py-1"
                        >
                          Source
                        </Link>
                      )}
                      <button
                        onClick={() => setEditing(question)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </main>

      {token && (
        <EditQuestionModal
          isOpen={!!editing}
          question={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSuccess={() => token && load(token)}
        />
      )}
    </div>
  );
}

export default function QuestionBankRoute() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      }
    >
      <QuestionBankPage />
    </Suspense>
  );
}
