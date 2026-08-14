'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getCourses, Course } from '@/services/courses';
import { Logo } from '@/components/ui/Logo';
import { Sparkles, BookOpen, Plus, LogOut, FileText, Loader2, ArrowRight, HelpCircle, Settings } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }

    if (token) {
      loadCourses(token);
    }
  }, [authLoading, user, token, router]);

  async function loadCourses(authToken: string) {
    try {
      const data = await getCourses(authToken);
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  async function handleLogout() {
    await logout();
    router.push('/auth/login');
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo linkHref="/dashboard" />

          <div className="flex items-center space-x-4">
            <Link
              href="/courses"
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
            >
              All Courses
            </Link>
            <div className="text-right hidden sm:block border-l border-slate-200 pl-4">
              <div className="text-sm font-semibold text-slate-900">{user.name}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>

            <Link
              href="/settings"
              className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 text-sm font-medium px-3 py-2 rounded-lg transition hover:bg-slate-100"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-slate-600 hover:text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition hover:bg-slate-100"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 rounded-3xl p-8 text-white shadow-xl mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              Student Dashboard
            </span>
            <h1 className="text-3xl font-extrabold mt-3">Welcome back, {user.name}! 👋</h1>
            <p className="text-brand-100 text-sm mt-2 max-w-xl">
              Upload your lecture notes, past exam papers, and question sets to start studying with AI.
            </p>
          </div>

          <Link
            href="/courses/new"
            className="bg-white text-brand-900 hover:bg-brand-50 font-semibold px-6 py-3 rounded-xl shadow-md transition flex items-center space-x-2 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </Link>
        </div>

        {/* Quick Stats / Courses Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Active Courses ({courses.length})</h2>
          <Link
            href="/courses/new"
            className="text-xs font-semibold text-brand-600 hover:underline flex items-center space-x-1"
          >
            <span>+ Add Course</span>
          </Link>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No courses created yet</h3>
            <p className="text-slate-500 text-sm max-w-md mb-6">
              Get started by creating your first course/module to upload lecture PDFs and past papers.
            </p>

            <Link
              href="/courses/new"
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow transition flex items-center space-x-2 text-sm"
            >
              <span>Create Course</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-brand-300 transition group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1 rounded-full">
                      {course.academicYear || 'Current Term'}
                    </span>
                    <span className="text-xs text-slate-400">
                      Updated {new Date(course.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-brand-600 transition mb-2">
                    {course.name}
                  </h3>

                  <p className="text-slate-600 text-sm line-clamp-2 mb-6">
                    {course.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                      <span>{course._count?.documents ?? 0} Docs</span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-400" />
                      <span>{course._count?.questions ?? 0} Qs</span>
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-600 group-hover:translate-x-1 transition" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
