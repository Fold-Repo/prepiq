'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/ui/Logo';
import { ArrowLeft, Save, Loader2, Bot, Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  
  const [preferredAI, setPreferredAI] = useState('OPENAI');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
      return;
    }
    if (user?.preferredAI) {
      setPreferredAI(user.preferredAI);
    }
  }, [authLoading, user, router]);

  async function handleSave() {
    if (!token) return;
    
    setIsSaving(true);
    setMessage('');
    
    try {
      const res = await fetch(`${API_URL}/auth/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ preferredAI }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to update settings');
      }
      
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
      
      // We could force a reload of the profile here, but for now just showing success is enough
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link
              href="/dashboard"
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <Logo linkHref="/dashboard" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-8">Account Settings</h1>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <Bot className="w-5 h-5 text-brand-500" />
              <span>AI Provider Preference</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Choose which AI model you want to power your chat, answers, and generated quizzes.
              Note that embeddings (used for processing PDFs) will always fallback to OpenAI.
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none \${preferredAI === 'OPENAI' ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200'}`}>
              <input
                type="radio"
                name="ai-provider"
                value="OPENAI"
                checked={preferredAI === 'OPENAI'}
                onChange={(e) => setPreferredAI(e.target.value)}
                className="sr-only"
              />
              <span className="flex flex-1">
                <span className="flex flex-col">
                  <span className="block text-sm font-medium text-slate-900 flex items-center">
                    OpenAI (GPT-4o)
                    {preferredAI === 'OPENAI' && (
                      <Sparkles className="w-4 h-4 ml-2 text-brand-500" />
                    )}
                  </span>
                  <span className="mt-1 flex items-center text-sm text-slate-500">
                    Industry standard, fast, and highly capable model for general tasks.
                  </span>
                </span>
              </span>
              <span
                className={`pointer-events-none absolute -inset-px rounded-xl border-2 \${preferredAI === 'OPENAI' ? 'border border-brand-500' : 'border-transparent'}`}
                aria-hidden="true"
              />
            </label>

            <label className={`relative flex cursor-pointer rounded-xl border p-4 shadow-sm focus:outline-none \${preferredAI === 'ANTHROPIC' ? 'border-brand-500 ring-1 ring-brand-500 bg-brand-50' : 'border-slate-200 hover:border-brand-200'}`}>
              <input
                type="radio"
                name="ai-provider"
                value="ANTHROPIC"
                checked={preferredAI === 'ANTHROPIC'}
                onChange={(e) => setPreferredAI(e.target.value)}
                className="sr-only"
              />
              <span className="flex flex-1">
                <span className="flex flex-col">
                  <span className="block text-sm font-medium text-slate-900 flex items-center">
                    Anthropic (Claude 3.5 Sonnet)
                    {preferredAI === 'ANTHROPIC' && (
                      <Sparkles className="w-4 h-4 ml-2 text-brand-500" />
                    )}
                  </span>
                  <span className="mt-1 flex items-center text-sm text-slate-500">
                    Exceptionally good at reading long PDFs and writing human-like answers.
                  </span>
                </span>
              </span>
              <span
                className={`pointer-events-none absolute -inset-px rounded-xl border-2 \${preferredAI === 'ANTHROPIC' ? 'border border-brand-500' : 'border-transparent'}`}
                aria-hidden="true"
              />
            </label>
          </div>
          
          <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
            <span className="text-sm font-medium text-green-600">{message}</span>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-brand-600 text-white hover:bg-brand-700 font-semibold px-5 py-2 rounded-lg shadow-sm transition flex items-center space-x-2 disabled:opacity-70"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
