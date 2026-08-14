'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourseById, deleteCourse, Course } from '@/services/courses';
import {
  getCourseDocuments,
  deleteDocument,
  reprocessDocument,
  getDocumentById,
  DocumentDetails,
} from '@/services/documents';
import {
  getCourseConversations,
  getConversationById,
  sendChatMessage,
  createConversation,
  deleteConversation,
  ConversationThread,
  ChatMessage,
} from '@/services/chat';
import {
  getCourseQuestions,
  deleteQuestion,
  QuestionData,
} from '@/services/questions';
import { UploadDocumentModal } from '@/components/documents/UploadDocumentModal';
import { EditQuestionModal } from '@/components/questions/EditQuestionModal';
import { AnswerViewModal } from '@/components/questions/AnswerViewModal';
import {
  Sparkles,
  BookOpen,
  FileText,
  MessageSquare,
  HelpCircle,
  Upload,
  Trash2,
  Loader2,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Plus,
  Bot,
  User as UserIcon,
  BookMarked,
  Edit3,
  Award,
} from 'lucide-react';

type TabType = 'overview' | 'documents' | 'chat' | 'questions';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<DocumentDetails[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [questions, setQuestions] = useState<QuestionData[]>([]);

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Question editing & answer modal states
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);
  const [isEditQuestionModalOpen, setIsEditQuestionModalOpen] = useState(false);

  const [selectedAnswerQuestion, setSelectedAnswerQuestion] = useState<QuestionData | null>(null);
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false);

  // Chat input states
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCourseData = useCallback(async (authToken: string, id: string) => {
    try {
      const [courseData, docsData, convsData, qData] = await Promise.all([
        getCourseById(authToken, id),
        getCourseDocuments(authToken, id),
        getCourseConversations(authToken, id),
        getCourseQuestions(authToken, id),
      ]);
      setCourse(courseData);
      setDocuments(docsData);
      setConversations(convsData);
      setQuestions(qData);

      if (convsData.length > 0 && !activeConversationId) {
        setActiveConversationId(convsData[0].id);
        loadConversationMessages(authToken, convsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load course:', err);
      router.push('/courses');
    } flex-1
    finally {
      setLoading(false);
    }
  }, [router, activeConversationId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (token && courseId) {
      loadCourseData(token, courseId);
    }
  }, [authLoading, user, token, courseId, router, loadCourseData]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSendingMessage]);

  async function loadConversationMessages(authToken: string, convId: string) {
    try {
      const thread = await getConversationById(authToken, convId);
      setMessages(thread.messages || []);
    } catch (err) {
      console.error('Failed to load conversation messages:', err);
    }
  }

  async function handleSelectConversation(convId: string) {
    if (!token) return;
    setActiveConversationId(convId);
    await loadConversationMessages(token, convId);
  }

  async function handleNewConversation() {
    if (!token || !courseId) return;
    try {
      const newConv = await createConversation(token, courseId, 'New Discussion');
      setConversations([newConv, ...conversations]);
      setActiveConversationId(newConv.id);
      setMessages([]);
    } catch (err) {
      alert('Failed to start new conversation');
    }
  }

  async function handleDeleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    if (!confirm('Delete this conversation thread?')) return;

    try {
      await deleteConversation(token, convId);
      const updated = conversations.filter((c) => c.id !== convId);
      setConversations(updated);

      if (activeConversationId === convId) {
        if (updated.length > 0) {
          setActiveConversationId(updated[0].id);
          loadConversationMessages(token, updated[0].id);
        } else {
          setActiveConversationId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      alert('Failed to delete conversation');
    }
  }

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !courseId || !chatInput.trim() || isSendingMessage) return;

    const userText = chatInput.trim();
    setChatInput('');
    setIsSendingMessage(true);

    const tempUserMsg: ChatMessage = {
      id: 'temp-user-' + Date.now(),
      conversationId: activeConversationId || '',
      role: 'USER',
      content: userText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const result = await sendChatMessage(token, courseId, userText, activeConversationId || undefined);

      if (!activeConversationId) {
        setActiveConversationId(result.conversationId);
      }

      await Promise.all([
        loadConversationMessages(token, result.conversationId),
        getCourseConversations(token, courseId).then(setConversations),
      ]);
    } catch (err: any) {
      alert(err.message || 'Failed to generate answer. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  }

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

  async function handleDeleteCourse() {
    if (!token || !course) return;
    if (!confirm(`Are you sure you want to delete "${course.name}"? This action cannot be undone.`)) return;

    setDeletingCourse(true);
    try {
      await deleteCourse(token, course.id);
      router.push('/courses');
    } catch (err) {
      alert('Failed to delete course');
      setDeletingCourse(false);
    }
  }

  async function handleDeleteDoc(docId: string, name: string) {
    if (!token) return;
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      await deleteDocument(token, docId);
      if (courseId) loadCourseData(token, courseId);
    } catch (err) {
      alert('Failed to delete document');
    }
  }

  async function handleReprocessDoc(docId: string) {
    if (!token) return;
    try {
      await reprocessDocument(token, docId);
      if (courseId) loadCourseData(token, courseId);
    } catch (err) {
      alert('Failed to reprocess document');
    }
  }

  async function handleDeleteQuestion(qId: string) {
    if (!token) return;
    if (!confirm('Delete this question?')) return;

    try {
      await deleteQuestion(token, qId);
      if (courseId) loadCourseData(token, courseId);
    } catch (err) {
      alert('Failed to delete question');
    }
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready</span>
          </span>
        );
      case 'PROCESSING':
      case 'INDEXING':
      case 'QUEUED':
      case 'UPLOADED':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
            <span className="capitalize">{status.toLowerCase()}</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center space-x-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span>Failed</span>
          </span>
        );
      default:
        return null;
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Navigation Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/courses" className="text-slate-400 hover:text-slate-700 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className="bg-brand-600 text-white p-2 rounded-xl shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 leading-none block">{course.name}</span>
                <span className="text-xs text-slate-500">{course.academicYear || 'Active Course'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleDeleteCourse}
              disabled={deletingCourse}
              className="flex items-center space-x-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              {deletingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>Delete Course</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation Header */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-7xl mx-auto flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'overview'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'documents'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documents ({documents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'chat'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Course Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'questions'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Exam Questions ({questions.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-2">About {course.name}</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                {course.description || 'No description added for this course yet.'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Uploaded PDFs</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{documents.length}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Extracted Questions</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{questions.length}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 uppercase font-semibold">Conversations</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{conversations.length}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Course Materials & PDFs</h2>
                <p className="text-xs text-slate-500 mt-0.5">Upload lectures, past papers, and solutions for RAG ingestion.</p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload PDF Document</span>
              </button>
            </div>

            {documents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <FileText className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No documents uploaded yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6">
                  Upload lecture slides, past exam papers, or model solutions to begin studying.
                </p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload First Document</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-sm overflow-hidden">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3.5">
                      <div className="bg-brand-50 text-brand-600 p-2.5 rounded-xl shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-base font-bold text-slate-900">{doc.name}</span>
                          {renderStatusBadge(doc.status)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                          <span className="font-semibold text-slate-600">{doc.type.replace('_', ' ')}</span>
                          <span>•</span>
                          <span>{doc.originalFilename}</span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => handleOpenCitation(doc.id, 1)}
                        className="flex items-center space-x-1 text-slate-600 hover:text-brand-600 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View PDF</span>
                      </button>

                      {doc.status === 'FAILED' && (
                        <button
                          onClick={() => handleReprocessDoc(doc.id)}
                          className="flex items-center space-x-1 text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDoc(doc.id, doc.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2-Panel Course RAG Chat Workspace (Phase 8 MVP ALPHA) */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[700px]">
            {/* Left Panel: Course Materials & Thread History */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col justify-between shrink-0">
              <div className="p-4 overflow-y-auto space-y-4">
                {/* Course Material Summary */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Course Knowledge Base</span>
                    <span className="text-brand-600 bg-brand-50 px-2 py-0.5 rounded text-[10px]">
                      {documents.filter((d) => d.status === 'READY').length} Ready
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {documents.slice(0, 4).map((doc) => (
                      <div key={doc.id} className="text-xs text-slate-600 flex items-center space-x-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{doc.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conversation Threads Header */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Discussions</span>
                  <button
                    onClick={handleNewConversation}
                    className="text-xs text-brand-600 font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </button>
                </div>

                {/* Threads List */}
                <div className="space-y-1.5">
                  {conversations.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2 text-center">No discussion threads yet.</div>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`group p-3 rounded-xl cursor-pointer text-xs transition flex items-center justify-between ${
                          activeConversationId === conv.id
                            ? 'bg-brand-600 text-white font-semibold shadow-sm'
                            : 'hover:bg-slate-200/60 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate pr-2">
                          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{conv.title}</span>
                        </div>

                        <button
                          onClick={(e) => handleDeleteConversation(conv.id, e)}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                            activeConversationId === conv.id
                              ? 'hover:bg-brand-700 text-white'
                              : 'hover:bg-slate-300 text-slate-500'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-white/50 text-[11px] text-slate-400 text-center">
                Grounded RAG with Page Citations
              </div>
            </div>

            {/* Right Panel: Interactive Chat Stream */}
            <div className="flex-1 flex flex-col justify-between bg-white min-w-0">
              {/* Chat Messages Body */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
                    <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-4">
                      <Bot className="w-7 h-7" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">Chat with your Lecture Materials</h3>
                    <p className="text-slate-500 text-xs leading-relaxed mb-6">
                      Ask questions about lecture slides, key concepts, or past papers. Every answer is grounded with page citations.
                    </p>

                    <div className="grid grid-cols-1 gap-2 text-left w-full">
                      <button
                        onClick={() => setChatInput('What are the main topics covered in the lecture notes?')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition"
                      >
                        💡 "What are the main topics covered in the lecture notes?"
                      </button>
                      <button
                        onClick={() => setChatInput('Explain the key definitions and formulas with citations.')}
                        className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 transition"
                      >
                        💡 "Explain the key definitions and formulas with citations."
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex space-x-3 ${
                        msg.role === 'USER' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {msg.role === 'ASSISTANT' && (
                        <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-2xl ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'USER'
                              ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
                              : 'bg-slate-100 text-slate-900 rounded-bl-none border border-slate-200/60'
                          }`}
                        >
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        </div>

                        {/* Citations Section */}
                        {msg.role === 'ASSISTANT' && msg.citations && msg.citations.length > 0 && (
                          <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center space-x-1">
                              <BookMarked className="w-3.5 h-3.5 text-brand-600" />
                              <span>Sources & Evidence ({msg.citations.length})</span>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {msg.citations.map((cit) => (
                                <button
                                  key={cit.id}
                                  onClick={() => handleOpenCitation(cit.documentId, cit.pageNumber)}
                                  className="inline-flex items-center space-x-1.5 bg-brand-50 hover:bg-brand-100 border border-brand-200 text-brand-800 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                                >
                                  <FileText className="w-3.5 h-3.5 text-brand-600" />
                                  <span>
                                    {cit.document?.name || 'Lecture Material'} • Page {cit.pageNumber}
                                  </span>
                                  <ExternalLink className="w-3 h-3 text-brand-500 ml-1" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {msg.role === 'USER' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))
                )}

                {/* Thinking / Processing State */}
                {isSendingMessage && (
                  <div className="flex space-x-3 justify-start">
                    <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-slate-100 p-4 rounded-2xl rounded-bl-none border border-slate-200/60 flex items-center space-x-2 text-xs text-slate-600">
                      <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                      <span>Retrieving lecture material & generating answer...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-4 border-t border-slate-200 bg-white">
                <form onSubmit={handleSendChat} className="flex items-center space-x-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about your lecture materials..."
                    disabled={isSendingMessage}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition outline-none text-slate-900 text-sm disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isSendingMessage}
                    className="bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-xl shadow-md transition disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Question Review Workspace (Phase 9 & Phase 10 MVP BETA) */}
        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Extracted Exam Questions ({questions.length})</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select any question to generate an AI exam answer grounded in lecture material with page citations.
                </p>
              </div>
            </div>

            {questions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No exam questions extracted yet</h3>
                <p className="text-slate-500 text-sm max-w-md mb-6">
                  Upload a past paper PDF tagged as "Past Examination Paper" under the Documents tab to extract individual questions automatically.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('documents');
                    setIsUploadModalOpen(true);
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Past Paper PDF</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-extrabold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-lg">
                            Question {q.questionNumber}
                          </span>
                          <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg uppercase">
                            {q.type.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {q.marks && (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center space-x-1">
                              <Award className="w-3.5 h-3.5 text-amber-600" />
                              <span>{q.marks} Marks</span>
                            </span>
                          )}

                          <button
                            onClick={() => {
                              setEditingQuestion(q);
                              setIsEditQuestionModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-sm font-medium text-slate-800 leading-relaxed mb-4 whitespace-pre-wrap">
                        {q.content}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>Source Paper: {q.document?.name || 'Uploaded Exam Paper'}</span>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedAnswerQuestion(q);
                          setIsAnswerModalOpen(true);
                        }}
                        className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2 rounded-xl shadow-xs transition flex items-center space-x-1.5 text-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {q._count?.answers && q._count.answers > 0 ? 'View AI Exam Answer' : 'Generate AI Answer'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Upload Document Modal */}
      {token && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          courseId={course.id}
          token={token}
          onClose={() => setIsUploadModalOpen(false)}
          onSuccess={() => {
            if (courseId) loadCourseData(token, courseId);
          }}
        />
      )}

      {/* Edit Question Modal */}
      {token && (
        <EditQuestionModal
          isOpen={isEditQuestionModalOpen}
          question={editingQuestion}
          token={token}
          onClose={() => {
            setIsEditQuestionModalOpen(false);
            setEditingQuestion(null);
          }}
          onSuccess={() => {
            if (courseId) loadCourseData(token, courseId);
          }}
        />
      )}

      {/* Answer View Modal (Phase 10 MVP BETA) */}
      {token && (
        <AnswerViewModal
          isOpen={isAnswerModalOpen}
          question={selectedAnswerQuestion}
          token={token}
          onClose={() => {
            setIsAnswerModalOpen(false);
            setSelectedAnswerQuestion(null);
          }}
        />
      )}
    </div>
  );
}
