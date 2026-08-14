import Link from 'next/link';
import { BookOpen, FileText, MessageSquare, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          <nav className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition shadow-sm"
            >
              Go to Dashboard
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center flex flex-col items-center justify-center">
        <div className="inline-flex items-center space-x-2 bg-brand-50 border border-brand-100 text-brand-700 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Grounded RAG with Page Citations</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-4xl">
          Prepare Smarter. <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-indigo-600">Perform Better.</span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
          Upload lecture PDFs, past papers, and question sets. Chat directly with your course material and receive grounded exam answers backed by exact page-level citations.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg transition text-base"
          >
            Get Started Free
          </Link>
          <a
            href="#features"
            className="w-full sm:w-auto bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold px-8 py-3.5 rounded-xl transition text-base"
          >
            Explore Features
          </a>
        </div>

        {/* Feature Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 text-left w-full">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Lecture RAG Chat</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Ask any question about your lectures and receive accurate, context-bound answers with exact page attribution.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Past Paper Extraction</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Upload past examination papers to extract individual questions automatically for structured review.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Exam Answer Generation</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Generate structured, exam-ready answers derived from lecture materials and official mark schemes.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} PrepIQ — Prepare Smarter. Perform Better.</p>
          <p className="text-xs text-slate-400">Phase 1 Infrastructure Active</p>
        </div>
      </footer>
    </div>
  );
}
