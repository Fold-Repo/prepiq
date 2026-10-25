'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourseById } from '@/services/courses';
import {
  getDocumentById,
  getDocumentPage,
  getDocumentPages,
  getDocumentSections,
  reprocessDocument,
  updateDocumentPage,
  reindexDocumentPage,
  DocumentDetails,
  DocumentPageDetail,
  DocumentPageSummary,
  DocumentSection,
} from '@/services/documents';
import { CourseContentHeader } from '@/components/content/CourseContentHeader';
import { McqOptions, AnswerSourceBadge } from '@/components/questions/McqOptions';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';

type RightTab = 'text' | 'sections' | 'questions';

export default function DocumentWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;
  const documentId = params.docId as string;
  const { user, token, isLoading: authLoading } = useAuth();

  const [courseName, setCourseName] = useState('');
  const [document, setDocument] = useState<DocumentDetails | null>(null);
  const [pages, setPages] = useState<DocumentPageSummary[]>([]);
  const [sections, setSections] = useState<DocumentSection[]>([]);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [pageDetail, setPageDetail] = useState<DocumentPageDetail | null>(null);
  const [pageText, setPageText] = useState('');
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');
  const [rightTab, setRightTab] = useState<RightTab>('text');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(
    async (authToken: string) => {
      const [doc, pageList, sectionList] = await Promise.all([
        getDocumentById(authToken, documentId),
        getDocumentPages(authToken, documentId, { page: 1, limit: 200, summary: true }),
        getDocumentSections(authToken, documentId).catch(() => []),
      ]);
      setDocument(doc);
      setPages(pageList.items);
      setSections(sectionList);
      setStartPage(doc.contentStartPage ? String(doc.contentStartPage) : '');
      setEndPage(doc.contentEndPage ? String(doc.contentEndPage) : '');
      return { doc, pages: pageList.items };
    },
    [documentId]
  );

  const loadPage = useCallback(
    async (authToken: string, pageNumber: number) => {
      const detail = await getDocumentPage(authToken, documentId, pageNumber);
      setPageDetail(detail);
      setPageText(detail.content || '');
    },
    [documentId]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (!token || !courseId || !documentId) return;

    (async () => {
      try {
        const [{ name }, { pages: loadedPages }] = await Promise.all([
          getCourseById(token, courseId),
          loadDocument(token),
        ]);
        setCourseName(name);
        const firstIncluded = loadedPages.find((p) => !p.isExcluded)?.pageNumber;
        const initial = firstIncluded || loadedPages[0]?.pageNumber || 1;
        setSelectedPage(initial);
        if (loadedPages.length > 0) {
          await loadPage(token, initial);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load document');
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, token, courseId, documentId, router, loadDocument, loadPage]);

  useEffect(() => {
    if (!token || !document) return;
    const busy = ['QUEUED', 'PROCESSING', 'INDEXING'].includes(document.status);
    if (!busy) return;
    const timer = setInterval(() => {
      loadDocument(token).catch(() => undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [token, document?.status, loadDocument, document]);

  async function handleSelectPage(pageNumber: number) {
    if (!token) return;
    setSelectedPage(pageNumber);
    try {
      await loadPage(token, pageNumber);
    } catch (err: any) {
      setError(err.message || 'Failed to load page');
    }
  }

  async function handleSavePage() {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDocumentPage(token, documentId, selectedPage, pageText);
      setPageDetail(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to save page');
    } finally {
      setSaving(false);
    }
  }

  async function handleReindexPage() {
    if (!token) return;
    setReindexing(true);
    setError(null);
    try {
      await reindexDocumentPage(token, documentId, selectedPage);
      await loadDocument(token);
    } catch (err: any) {
      setError(err.message || 'Failed to reindex page');
    } finally {
      setReindexing(false);
    }
  }

  async function handleProcessRange(forceEntire = false) {
    if (!token) return;
    setProcessing(true);
    setError(null);
    try {
      await reprocessDocument(token, documentId, {
        forceIndex: true,
        contentStartPage: forceEntire ? 1 : startPage ? Number(startPage) : 1,
        contentEndPage: forceEntire ? null : endPage ? Number(endPage) : null,
      });
      await loadDocument(token);
    } catch (err: any) {
      setError(err.message || 'Failed to process document');
    } finally {
      setProcessing(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        {error || 'Document not found'}
      </div>
    );
  }

  const waiting = document.status === 'AWAITING_RANGE';
  const busy = ['QUEUED', 'PROCESSING', 'INDEXING'].includes(document.status);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <CourseContentHeader
        courseId={courseId}
        courseName={courseName}
        active="document"
        title={document.name}
      />

      <div className="bg-white border-b border-slate-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{document.type.replace(/_/g, ' ')}</span>
            <span>•</span>
            <span>{document.pageCount || pages.length} pages</span>
            <span>•</span>
            <span>{document._count?.sections ?? sections.length} sections</span>
            <span>•</span>
            <span>{document._count?.questions ?? 0} questions</span>
            {waiting && (
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                Set a start page, then process
              </span>
            )}
            {busy && (
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                {document.status.toLowerCase()}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={1}
              value={startPage}
              onChange={(e) => setStartPage(e.target.value)}
              placeholder="Start"
              className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="number"
              min={1}
              value={endPage}
              onChange={(e) => setEndPage(e.target.value)}
              placeholder="End"
              className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-xs"
            />
            <button
              onClick={() => handleProcessRange(false)}
              disabled={processing || busy}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1"
            >
              {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Process range
            </button>
            <button
              onClick={() => handleProcessRange(true)}
              disabled={processing || busy}
              className="border border-slate-200 text-slate-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            >
              Process entire PDF
            </button>
            {document.downloadUrl && (
              <a
                href={`${document.downloadUrl}#page=${selectedPage}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-brand-600 px-3 py-1.5 rounded-lg hover:bg-slate-100"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto w-full px-6 pt-4">
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-[72vh] flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
            Pages
          </div>
          <div className="overflow-y-auto flex-1">
            {pages.map((page) => (
              <button
                key={page.id}
                onClick={() => handleSelectPage(page.pageNumber)}
                className={`w-full text-left px-4 py-2.5 text-xs border-b border-slate-50 flex items-center justify-between ${
                  selectedPage === page.pageNumber
                    ? 'bg-brand-50 text-brand-800'
                    : page.isExcluded
                      ? 'text-slate-400 bg-slate-50'
                      : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-semibold">Page {page.pageNumber}</span>
                <span className="flex items-center gap-1">
                  {page.isExcluded && (
                    <span className="text-[10px] uppercase tracking-wide">Excluded</span>
                  )}
                  {page._count?.questions ? (
                    <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">{page._count.questions}q</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden min-h-[72vh] flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {(['text', 'sections', 'questions'] as RightTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                    rightTab === tab ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setStartPage(String(selectedPage));
                }}
                className="text-xs font-semibold text-slate-600 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-slate-50"
              >
                Use as start
              </button>
              <button
                onClick={() => setEndPage(String(selectedPage))}
                className="text-xs font-semibold text-slate-600 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-slate-50"
              >
                Use as end
              </button>
            </div>
          </div>

          {rightTab === 'text' && (
            <div className="flex-1 flex flex-col p-4 gap-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Extracted text · {pageDetail?.wordCount || 0} words
                  {pageDetail?.isExcluded ? ' · excluded from study index' : ''}
                  {pageDetail?.editedAt ? ' · edited' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSavePage}
                    disabled={saving}
                    className="flex items-center gap-1 bg-slate-900 text-white px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save text
                  </button>
                  <button
                    onClick={handleReindexPage}
                    disabled={reindexing || pageDetail?.isExcluded}
                    className="flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
                  >
                    {reindexing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Reindex page
                  </button>
                </div>
              </div>
              <textarea
                value={pageText}
                onChange={(e) => setPageText(e.target.value)}
                className="flex-1 w-full min-h-[52vh] rounded-xl border border-slate-200 p-4 text-sm leading-relaxed text-slate-800 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
          )}

          {rightTab === 'sections' && (
            <div className="p-4 space-y-2 overflow-y-auto">
              {sections.length === 0 ? (
                <p className="text-sm text-slate-500">No sections yet. Process the content range to detect headings.</p>
              ) : (
                sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => handleSelectPage(section.pageStart)}
                    className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40"
                  >
                    <div className="text-sm font-semibold text-slate-900">{section.title}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      Pages {section.pageStart}–{section.pageEnd}
                      {section._count?.questions ? ` · ${section._count.questions} questions` : ''}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {rightTab === 'questions' && (
            <div className="p-4 space-y-3 overflow-y-auto">
              {(pageDetail?.questions || []).length === 0 ? (
                <p className="text-sm text-slate-500">
                  No questions extracted on this page. Process a past paper or Q&A document after setting the content range.
                </p>
              ) : (
                pageDetail?.questions?.map((question) => (
                  <div key={question.id} className="p-4 rounded-xl border border-slate-200">
                    <div className="text-xs font-semibold text-brand-700 mb-1">
                      {question.questionNumber} · {question.type}
                      {question.marks != null ? ` · ${question.marks} marks` : ''}
                    </div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{question.content}</p>
                    <McqOptions options={question.options} correctOption={question.correctOption} />
                    {question.officialAnswer && (
                      <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700 mb-1 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {question.correctOption
                              ? `Answer: option ${question.correctOption.toUpperCase()}`
                              : 'Answer explanation'}
                          </span>
                          <AnswerSourceBadge source={question.officialAnswerSource} />
                        </div>
                        <p className="text-sm text-emerald-900 whitespace-pre-wrap">{question.officialAnswer}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
