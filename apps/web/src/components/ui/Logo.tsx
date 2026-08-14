import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  withText?: boolean;
  linkHref?: string;
  iconOnly?: boolean;
}

export function Logo({ className = '', withText = true, linkHref = '/', iconOnly = false }: LogoProps) {
  const content = (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* App Icon */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main 'P' shape */}
          <path d="M40 85 V30 C40 20 45 15 55 15 H65 C82 15 90 25 90 40 C90 55 82 65 65 65 H55 C50 65 48 68 48 72 V85 Z" fill="url(#pGradient)" />
          
          {/* Book Pages */}
          <path d="M25 85 V35 C25 25 28 22 35 20 V75 C28 77 25 80 25 85 Z" fill="#6d28d9" />
          <path d="M10 85 V40 C10 32 13 28 20 25 V75 C13 77 10 80 10 85 Z" fill="#8b5cf6" />
          
          {/* Checkmark overlapping the 'P' */}
          <path d="M48 70 L58 82 L85 55" stroke="url(#checkGradient)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          
          <defs>
            <linearGradient id="pGradient" x1="40" y1="15" x2="90" y2="85" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0f172a" />
              <stop offset="1" stopColor="#1e3a8a" />
            </linearGradient>
            <linearGradient id="checkGradient" x1="48" y1="70" x2="85" y2="55" gradientUnits="userSpaceOnUse">
              <stop stopColor="#a855f7" />
              <stop offset="1" stopColor="#6d28d9" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* App Text */}
      {!iconOnly && withText && (
        <div className="font-extrabold text-[1.6rem] tracking-tight leading-none mt-1">
          <span className="text-[#0f172a]">Prep</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-br from-[#8b5cf6] to-[#6d28d9]">IQ</span>
        </div>
      )}
    </div>
  );

  if (linkHref) {
    return (
      <Link href={linkHref} className="hover:opacity-90 transition">
        {content}
      </Link>
    );
  }

  return content;
}
