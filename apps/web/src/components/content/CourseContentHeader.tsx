'use client';

import Link from 'next/link';
import { ArrowLeft, BookOpen, FileText, HelpCircle } from 'lucide-react';

interface CourseContentHeaderProps {
  courseId: string;
  courseName?: string;
  active: 'documents' | 'document' | 'syllabus' | 'questions';
  title?: string;
}

export function CourseContentHeader({
  courseId,
  courseName,
  active,
  title,
}: CourseContentHeaderProps) {
  const links = [
    { id: 'documents', href: `/courses/${courseId}`, label: 'Documents', icon: FileText },
    { id: 'syllabus', href: `/courses/${courseId}/syllabus`, label: 'Syllabus', icon: BookOpen },
    { id: 'questions', href: `/courses/${courseId}/question-bank`, label: 'Question bank', icon: HelpCircle },
  ] as const;

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4 min-w-0">
          <Link
            href={`/courses/${courseId}`}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              {courseName || 'Course'} · Content
            </p>
            <h1 className="text-lg font-bold text-slate-900 truncate">{title || 'Manage content'}</h1>
          </div>
        </div>
        <nav className="hidden sm:flex items-center space-x-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = active === link.id || (active === 'document' && link.id === 'documents');
            return (
              <Link
                key={link.id}
                href={link.href}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
