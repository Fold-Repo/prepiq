'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourseById } from '@/services/courses';
import { getCourseDocuments, DocumentDetails } from '@/services/documents';
import {
  createSyllabusTopic,
  deleteSyllabusTopic,
  extractSyllabusFromDocument,
  getCourseSyllabus,
  SyllabusTopic,
  updateSyllabusTopic,
} from '@/services/syllabus';
import { CourseContentHeader } from '@/components/content/CourseContentHeader';
import { BookOpen, Loader2, Plus, Trash2 } from 'lucide-react';

export default function SyllabusPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  const [courseName, setCourseName] = useState('');
  const [topics, setTopics] = useState<SyllabusTopic[]>([]);
  const [documents, setDocuments] = useState<DocumentDetails[]>([]);
  const [title, setTitle] = useState('');
  const [weekNumber, setWeekNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (authToken: string) => {
      const [course, syllabus, docs] = await Promise.all([
        getCourseById(authToken, courseId),
        getCourseSyllabus(authToken, courseId),
        getCourseDocuments(authToken, courseId),
      ]);
      setCourseName(course.name);
      setTopics(syllabus);
      setDocuments(docs);
    },
    [courseId]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (!token || !courseId) return;
    load(token)
      .catch((err) => setError(err.message || 'Failed to load syllabus'))
      .finally(() => setLoading(false));
  }, [authLoading, user, token, courseId, router, load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createSyllabusTopic(token, courseId, {
        title: title.trim(),
        weekNumber: weekNumber ? Number(weekNumber) : null,
      });
      setTitle('');
      setWeekNumber('');
      await load(token);
    } catch (err: any) {
      setError(err.message || 'Failed to add topic');
    } finally {
      setSaving(false);
    }
  }

  async function handleRename(topic: SyllabusTopic, nextTitle: string) {
    if (!token || !nextTitle.trim() || nextTitle === topic.title) return;
    await updateSyllabusTopic(token, topic.id, { title: nextTitle.trim() });
    await load(token);
  }

  async function handleDelete(topicId: string) {
    if (!token) return;
    if (!confirm('Delete this syllabus topic?')) return;
    await deleteSyllabusTopic(token, topicId);
    await load(token);
  }

  async function handleExtract(documentId: string) {
    if (!token) return;
    setSaving(true);
    try {
      await extractSyllabusFromDocument(token, documentId);
      await load(token);
    } catch (err: any) {
      setError(err.message || 'Failed to extract syllabus');
    } finally {
      setSaving(false);
    }
  }

  function renderTopic(topic: SyllabusTopic, depth = 0) {
    return (
      <div key={topic.id} className={depth ? 'ml-6 mt-2' : 'mt-3'}>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <input
                defaultValue={topic.title}
                onBlur={(e) => handleRename(topic, e.target.value)}
                className="w-full text-sm font-semibold text-slate-900 bg-transparent outline-none"
              />
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                {topic.weekNumber != null && <span>Week {topic.weekNumber}</span>}
                {topic.pageStart != null && (
                  <span>
                    Pages {topic.pageStart}
                    {topic.pageEnd ? `–${topic.pageEnd}` : ''}
                  </span>
                )}
                {topic.document && <span>from {topic.document.name}</span>}
                <span>{topic._count?.questions || 0} questions</span>
              </div>
              {topic.description && (
                <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">{topic.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/courses/${courseId}/question-bank?topicId=${topic.id}`}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Questions
              </Link>
              <button
                onClick={() => handleDelete(topic.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        {topic.children?.map((child) => renderTopic(child, depth + 1))}
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  const syllabusDocs = documents.filter((doc) => doc.type === 'SYLLABUS');

  return (
    <div className="min-h-screen bg-slate-50">
      <CourseContentHeader courseId={courseId} courseName={courseName} active="syllabus" title="Syllabus" />
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">{error}</div>}

        <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a syllabus topic"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500"
          />
          <input
            value={weekNumber}
            onChange={(e) => setWeekNumber(e.target.value)}
            placeholder="Week"
            type="number"
            min={1}
            className="w-24 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>

        {syllabusDocs.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-3">Extract from uploaded syllabus</h2>
            <div className="space-y-2">
              {syllabusDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between text-sm">
                  <Link href={`/courses/${courseId}/documents/${doc.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                    {doc.name}
                  </Link>
                  <button
                    onClick={() => handleExtract(doc.id)}
                    disabled={saving}
                    className="text-xs font-semibold text-brand-600 hover:underline disabled:opacity-50"
                  >
                    Re-extract topics
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {topics.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-900 mb-1">No syllabus yet</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Upload a syllabus PDF from Documents, set the content start page, then process it — or add topics manually here.
            </p>
          </div>
        ) : (
          <div>{topics.map((topic) => renderTopic(topic))}</div>
        )}
      </main>
    </div>
  );
}
