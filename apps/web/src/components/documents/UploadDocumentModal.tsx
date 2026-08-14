'use client';

import React, { useState } from 'react';
import { uploadDocument, DocumentType } from '@/services/documents';
import { X, UploadCloud, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  courseId: string;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadDocumentModal({
  isOpen,
  courseId,
  token,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('LECTURE');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== 'application/pdf') {
        setError('Only PDF files are supported');
        setFile(null);
        return;
      }
      setError(null);
      setFile(selected);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      await uploadDocument(token, courseId, file, docType);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-brand-50 text-brand-600 p-3 rounded-xl">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Upload Course Material</h2>
            <p className="text-xs text-slate-500">Supported format: PDF (Max 50MB)</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Document Category
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentType)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition outline-none text-slate-900 text-sm bg-white"
            >
              <option value="LECTURE">Lecture Slides / Notes</option>
              <option value="PAST_QUESTION">Past Examination Paper</option>
              <option value="QUESTION_ANSWER">Question & Answer Reference</option>
              <option value="OTHER">Other Study Material</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              PDF Document
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-brand-400 rounded-2xl p-6 text-center transition bg-slate-50 relative">
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              {file ? (
                <div className="flex items-center justify-center space-x-2 text-brand-700 font-semibold text-sm">
                  <FileText className="w-5 h-5 text-brand-600" />
                  <span className="truncate max-w-xs">{file.name}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Click or drag PDF here to upload</p>
                  <p className="text-xs text-slate-400 mt-1">PDF up to 50MB</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="bg-brand-600 hover:bg-brand-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition flex items-center space-x-2 text-xs disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload PDF</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
