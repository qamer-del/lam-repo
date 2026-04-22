'use client'

import React from 'react'

export function ModernLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 dark:bg-black/40 backdrop-blur-md">
      <div className="relative">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-blue-500 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
        
        {/* Creative Spinner */}
        <div className="relative flex items-center justify-center">
          <div className="w-24 h-24 border-4 border-gray-200/30 dark:border-gray-800/30 rounded-full"></div>
          <div className="absolute w-24 h-24 border-t-4 border-r-4 border-blue-600 rounded-full animate-spin"></div>
          
          <div className="absolute w-16 h-16 border-b-4 border-l-4 border-cyan-400 rounded-full animate-spin-reverse opacity-70"></div>
          
          <div className="absolute flex flex-col items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm font-black tracking-[0.2em] uppercase bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Processing
          </p>
          <div className="flex justify-center gap-1 mt-2">
            <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"></span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin-reverse {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        .animate-spin-reverse {
          animation: spin-reverse 1.5s linear infinite;
        }
      `}</style>
    </div>
  )
}
