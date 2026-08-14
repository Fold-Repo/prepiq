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
  MessageCitationData,
} from '@/services/chat';
import { getCourseQuizzes, generateQuiz, Quiz } from '@/services/quizzes';
import { getCourseAnalytics, CourseAnalytics } from '@/services/analytics';
import { 
  getCourseQuestions, 
  createQuestion, 
  generateQuestionAnswer, 
  evaluateStudentAnswer,
  deleteQuestion,
  QuestionData,
  GeneratedAnswerResult,
  StudentAnswerEvaluation
} from '@/services/questions';
import { UploadDocumentModal } from '@/components/documents/UploadDocumentModal';
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
  BarChart,
  Target,
  TrendingUp,
  BrainCircuit,
  PenTool,
  Award,
  ChevronDown,
  ChevronUp,
  Settings,
} from 'lucide-react';

type TabType = 'overview' | 'documents' | 'chat' | 'questions' | 'quizzes' | 'mock-exams' | 'analytics';

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const { user, token, isLoading: authLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [documents, setDocuments] = useState<DocumentDetails[]>([]);
  const [conversations, setConversations] = useState<ConversationThread[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatingMockExam, setGeneratingMockExam] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<CourseAnalytics | null>(null);

  // Questions State
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<QuestionData | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionMarks, setNewQuestionMarks] = useState('10');
  const [studentAnswerText, setStudentAnswerText] = useState('');
  const [evaluation, setEvaluation] = useState<StudentAnswerEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<GeneratedAnswerResult | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [deletingCourse, setDeletingCourse] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Chat input states
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadCourseData = useCallback(async (authToken: string, id: string) => {
    try {
      const [courseData, docsData, convsData, quizzesData, questionsData, analyticsResult] = await Promise.all([
        getCourseById(authToken, id),
        getCourseDocuments(authToken, id),
        getCourseConversations(authToken, id),
        getCourseQuizzes(authToken, id),
        getCourseQuestions(authToken, id).catch(() => []),
        getCourseAnalytics(authToken, id).catch(() => null)
      ]);
      setCourse(courseData);
      setDocuments(docsData);
      setConversations(convsData);
      setQuizzes(quizzesData);
      setQuestions(questionsData);
      setAnalyticsData(analyticsResult);

      if (convsData.length > 0 && !activeConversationId) {
        setActiveConversationId(convsData[0].id);
        loadConversationMessages(authToken, convsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load course:', err);
      router.push('/courses');
    } finally {
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

    // Optimistic user message preview
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

      // Reload updated thread & conversations list
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

  async function handleGenerateQuiz() {
    if (!token || !courseId) return;
    setGeneratingQuiz(true);
    try {
      const newQuiz = await generateQuiz(token, courseId, undefined, 5);
      setQuizzes([newQuiz, ...quizzes]);
    } catch (err) {
      alert('Failed to generate quiz. Please ensure you have uploaded documents.');
    } finally {
      setGeneratingQuiz(false);
    }
  }

  async function handleGenerateMockExam() {
    if (!token || !courseId) return;
    setGeneratingMockExam(true);
    try {
      const newExam = await generateQuiz(token, courseId, undefined, 20, true);
      setQuizzes([newExam, ...quizzes]);
    } catch (err) {
      alert('Failed to generate mock exam. Please ensure you have uploaded documents.');
    } finally {
      setGeneratingMockExam(false);
    }
  }

  // --- Questions Handlers ---
  async function handleAddQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !courseId || !newQuestionText.trim()) return;
    try {
      const q = await createQuestion(token, courseId, newQuestionText, parseInt(newQuestionMarks));
      setQuestions([q, ...questions]);
      setIsAddingQuestion(false);
      setNewQuestionText('');
      setNewQuestionMarks('10');
    } catch (err) {
      alert('Failed to add question');
    }
  }

  async function handleDeleteQuestion(qid: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!token) return;
    if (!confirm('Delete this question?')) return;
    try {
      await deleteQuestion(token, qid);
      setQuestions(questions.filter(q => q.id !== qid));
      if (activeQuestion?.id === qid) setActiveQuestion(null);
    } catch (err) {
      alert('Failed to delete question');
    }
  }

  async function handleGenerateAiAnswer() {
    if (!token || !activeQuestion) return;
    setIsGeneratingAnswer(true);
    try {
      const res = await generateQuestionAnswer(token, activeQuestion.id);
      setAiAnswer(res);
    } catch (err) {
      alert('Failed to generate AI answer');
    } finally {
      setIsGeneratingAnswer(false);
    }
  }

  async function handleEvaluateStudentAnswer() {
    if (!token || !activeQuestion || !studentAnswerText.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await evaluateStudentAnswer(token, activeQuestion.id, studentAnswerText);
      setEvaluation(res);
    } catch (err) {
      alert('Failed to evaluate answer');
    } finally {
      setIsEvaluating(false);
    }
  }

  function handleSelectQuestion(q: QuestionData) {
    setActiveQuestion(q);
    setAiAnswer(null);
    setEvaluation(null);
    setStudentAnswerText('');
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
            <Link
              href="/settings"
              className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold px-3 py-2 rounded-lg transition"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
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
            <span>Exam Questions</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'quizzes'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Quizzes ({quizzes.filter(q => !q.isMockExam).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('mock-exams')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'mock-exams'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Mock Exams ({quizzes.filter(q => q.isMockExam).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3.5 text-sm font-semibold border-b-2 transition flex items-center space-x-2 ${
              activeTab === 'analytics'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart className="w-4 h-4" />
            <span>Analytics</span>
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
                  <div className="text-2xl font-bold text-slate-900 mt-1">{course._count?.questions ?? 0}</div>
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

        {activeTab === 'questions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Exam Questions</h2>
                <p className="text-xs text-slate-500 mt-0.5">Manage past paper questions and practice answering them.</p>
              </div>
              <button
                onClick={() => setIsAddingQuestion(true)}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Question</span>
              </button>
            </div>

            {isAddingQuestion && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Add Manual Question</h3>
                <form onSubmit={handleAddQuestion} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Question Content</label>
                    <textarea
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                      placeholder="e.g. Explain the process of cellular respiration."
                      required
                    />
                  </div>
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Marks (Max Score)</label>
                      <input
                        type="number"
                        value={newQuestionMarks}
                        onChange={(e) => setNewQuestionMarks(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-sm"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3 pt-2">
                    <button type="submit" className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition">
                      Save Question
                    </button>
                    <button type="button" onClick={() => setIsAddingQuestion(false)} className="text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold transition border border-slate-200 hover:bg-slate-50">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!activeQuestion ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questions.length === 0 ? (
                  <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center">
                    <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-slate-500 text-sm">No exam questions found. Add one manually to start practicing.</p>
                  </div>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-brand-300 transition cursor-pointer group" onClick={() => handleSelectQuestion(q)}>
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">{q.marks} Marks</span>
                        <button onClick={(e) => handleDeleteQuestion(q.id, e)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-800 text-sm font-medium line-clamp-3 leading-relaxed">{q.content}</p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <button onClick={() => setActiveQuestion(null)} className="flex items-center text-slate-500 hover:text-brand-600 text-sm font-semibold transition mb-2">
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back to questions
                </button>

                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm relative">
                  <span className="absolute top-6 right-6 bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md">{activeQuestion.marks} Marks</span>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Question</h3>
                  <p className="text-slate-800 font-medium text-lg pr-20 leading-relaxed">{activeQuestion.content}</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Column: Student Answer & Evaluation */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                        <PenTool className="w-4 h-4 mr-2" /> Your Answer
                      </h3>
                      <textarea
                        value={studentAnswerText}
                        onChange={(e) => setStudentAnswerText(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-sm mb-4 leading-relaxed bg-slate-50 focus:bg-white transition"
                        placeholder="Type your answer here to get AI feedback..."
                      />
                      <button 
                        onClick={handleEvaluateStudentAnswer} 
                        disabled={!studentAnswerText.trim() || isEvaluating}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl shadow-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
                      >
                        {isEvaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                        <span>Evaluate My Answer</span>
                      </button>
                    </div>

                    {evaluation && (
                      <div className="bg-white rounded-2xl border border-brand-200 p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-xs font-bold text-brand-600 uppercase tracking-wider flex items-center">
                            <Bot className="w-4 h-4 mr-2" /> AI Evaluation
                          </h3>
                          <div className="text-2xl font-extrabold text-slate-800">
                            {evaluation.score} <span className="text-base text-slate-400 font-semibold">/ {evaluation.maxScore}</span>
                          </div>
                        </div>

                        <div className="space-y-5 text-sm">
                          <div>
                            <h4 className="font-bold text-slate-800 mb-2 flex items-center text-green-600"><CheckCircle2 className="w-4 h-4 mr-2" /> Strengths</h4>
                            <ul className="list-disc pl-5 space-y-1 text-slate-600">
                              {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                          </div>

                          {evaluation.missingConcepts.length > 0 && (
                            <div>
                              <h4 className="font-bold text-slate-800 mb-2 flex items-center text-rose-500"><AlertTriangle className="w-4 h-4 mr-2" /> Missing Concepts</h4>
                              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                                {evaluation.missingConcepts.map((m, i) => <li key={i}>{m}</li>)}
                              </ul>
                            </div>
                          )}

                          <div className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed border border-slate-100">
                            <strong>Feedback:</strong> {evaluation.feedback}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: AI Reference Answer */}
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-md text-white">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                          <BrainCircuit className="w-4 h-4 mr-2 text-brand-400" /> Reference Answer
                        </h3>
                        {!aiAnswer && (
                          <button 
                            onClick={handleGenerateAiAnswer}
                            disabled={isGeneratingAnswer}
                            className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center"
                          >
                            {isGeneratingAnswer ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Sparkles className="w-3 h-3 mr-2 text-brand-400" />}
                            Generate AI Answer
                          </button>
                        )}
                      </div>

                      {aiAnswer ? (
                        <div className="space-y-6">
                          <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {aiAnswer.answer.answer}
                          </div>
                          
                          {aiAnswer.citations.length > 0 && (
                            <div className="border-t border-slate-700 pt-5 mt-5">
                              <h4 className="text-xs font-bold text-slate-400 mb-3">Sources Grounded In:</h4>
                              <div className="space-y-2">
                                {aiAnswer.citations.map((cite, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleOpenCitation(cite.documentId, cite.pageNumber)}
                                    className="block w-full text-left bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/10 transition group"
                                  >
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-xs font-semibold text-brand-400">Source {i+1}</span>
                                      <span className="text-xs text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md">Page {cite.pageNumber}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{cite.excerpt}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl bg-slate-900/50">
                          <BrainCircuit className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-400 text-sm">Generate an AI reference answer grounded<br/>in your uploaded lecture materials.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'quizzes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Quizzes</h2>
                <p className="text-xs text-slate-500 mt-0.5">Test your knowledge with AI-generated quizzes from course materials.</p>
              </div>
              <button
                onClick={handleGenerateQuiz}
                disabled={generatingQuiz}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm disabled:opacity-50"
              >
                {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Generate Quiz</span>
              </button>
            </div>

            {quizzes.filter(q => !q.isMockExam).length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No quizzes generated yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6">
                  Generate a quiz based on your uploaded documents to test your understanding.
                </p>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={generatingQuiz}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm disabled:opacity-50"
                >
                  {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  <span>Generate First Quiz</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.filter(q => !q.isMockExam).map((quiz) => (
                  <div key={quiz.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                          {quiz._count?.questions || 0} Questions
                        </span>
                        <span className="text-xs text-slate-400">{new Date(quiz.createdAt).toLocaleDateString()}</span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{quiz.title}</h4>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                        {quiz.description || 'AI Generated Quiz'}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {quiz._count?.attempts || 0} attempts
                      </div>
                      <Link
                        href={`/courses/${courseId}/quizzes/${quiz.id}`}
                        className="text-brand-600 hover:text-brand-700 font-semibold text-sm transition"
                      >
                        Attempt Quiz &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mock-exams' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Mock Exams</h2>
                <p className="text-xs text-slate-500 mt-0.5">Take timed, full-length mock exams based on your course materials.</p>
              </div>
              <button
                onClick={handleGenerateMockExam}
                disabled={generatingMockExam}
                className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm disabled:opacity-50"
              >
                {generatingMockExam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                <span>Generate Mock Exam</span>
              </button>
            </div>

            {quizzes.filter(q => q.isMockExam).length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <Clock className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No mock exams generated yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6">
                  Generate a timed mock exam based on your uploaded documents to simulate a real testing environment.
                </p>
                <button
                  onClick={handleGenerateMockExam}
                  disabled={generatingMockExam}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm disabled:opacity-50"
                >
                  {generatingMockExam ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  <span>Generate First Mock Exam</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.filter(q => q.isMockExam).map((exam) => (
                  <div key={exam.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{exam.timeLimitMinutes || 60} mins</span>
                        </span>
                        <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full">
                          {exam._count?.questions || 0} Questions
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-900 mb-1">{exam.title}</h4>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                        {exam.description || 'AI Generated Mock Exam'}
                      </p>
                    </div>
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-500">
                        {new Date(exam.createdAt).toLocaleDateString()}
                      </div>
                      <Link
                        href={`/courses/${courseId}/mock-exams/${exam.id}`}
                        className="text-brand-600 hover:text-brand-700 font-semibold text-sm transition"
                      >
                        Start Exam &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Learning Analytics</h2>
                <p className="text-xs text-slate-500 mt-0.5">Track your progress and get AI-driven study recommendations.</p>
              </div>
            </div>

            {!analyticsData || analyticsData.topicPerformance.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
                <BarChart className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-900 mb-1">No Data Available</h3>
                <p className="text-slate-500 text-sm max-w-sm mb-6">
                  Complete some quizzes or mock exams to generate your learning analytics.
                </p>
                <button
                  onClick={() => setActiveTab('quizzes')}
                  className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Take a Quiz</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Readiness Score & Strong/Weak overview */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Readiness Score</h3>
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle className="text-slate-100" strokeWidth="12" stroke="currentColor" fill="transparent" r="58" cx="64" cy="64" />
                        <circle
                          className={analyticsData.readinessScore > 75 ? 'text-green-500' : analyticsData.readinessScore > 50 ? 'text-amber-500' : 'text-rose-500'}
                          strokeWidth="12"
                          strokeDasharray={364}
                          strokeDashoffset={364 - (364 * analyticsData.readinessScore) / 100}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r="58"
                          cx="64"
                          cy="64"
                        />
                      </svg>
                      <span className="absolute text-3xl font-extrabold text-slate-800">{analyticsData.readinessScore}</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center"><Target className="w-4 h-4 mr-2" /> Top Strengths</h3>
                    {analyticsData.strongTopics.length > 0 ? (
                      <ul className="space-y-3">
                        {analyticsData.strongTopics.map(t => (
                          <li key={t.topic} className="flex justify-between items-center text-sm">
                            <span className="font-semibold text-slate-700 truncate">{t.topic}</span>
                            <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md">{t.accuracy}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No strong topics identified yet.</p>
                    )}
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-rose-500" /> Focus Areas</h3>
                    {analyticsData.weakTopics.length > 0 ? (
                      <ul className="space-y-3">
                        {analyticsData.weakTopics.map(t => (
                          <li key={t.topic} className="flex justify-between items-center text-sm">
                            <span className="font-semibold text-slate-700 truncate">{t.topic}</span>
                            <span className="text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md">{t.accuracy}%</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Great job! No weak topics right now.</p>
                    )}
                  </div>
                </div>

                {/* Main Content Area (Topic Performance & AI Recommendations) */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* AI Recommendations */}
                  <div className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-6 shadow-md text-white">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                        <BrainCircuit className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-lg font-bold">AI Study Recommendations</h3>
                    </div>
                    {analyticsData.recommendations.length > 0 ? (
                      <ul className="space-y-3">
                        {analyticsData.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start space-x-3 bg-white/10 rounded-xl p-4">
                            <span className="bg-brand-500 text-white w-6 h-6 rounded-full flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">{i+1}</span>
                            <p className="text-sm text-brand-50 leading-relaxed">{rec}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-brand-200">Take more quizzes to receive personalized recommendations.</p>
                    )}
                  </div>

                  {/* Detailed Topic Performance List */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-6">Detailed Topic Performance</h3>
                    <div className="space-y-5">
                      {analyticsData.topicPerformance.sort((a,b) => b.accuracy - a.accuracy).map(t => (
                        <div key={t.topic}>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-semibold text-slate-700">{t.topic}</span>
                            <span className="text-slate-500">{t.scoreAwarded} / {t.maxScore} marks ({t.accuracy}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className={`h-2.5 rounded-full ${t.accuracy >= 80 ? 'bg-green-500' : t.accuracy < 60 ? 'bg-rose-500' : 'bg-brand-500'}`}
                              style={{ width: \`\${Math.max(0, Math.min(100, t.accuracy))}%\` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
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
    </div>
  );
}
