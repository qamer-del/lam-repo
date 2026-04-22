'use client'

import React from 'react'

export function ModernLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 dark:bg-black/20 backdrop-blur-xl">
      <div className="relative group">
        {/* Dynamic Multi-Color Glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-blue-500/20 rounded-full blur-[80px] animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/20 rounded-full blur-[80px] animate-pulse [animation-delay:1s]"></div>
        
        {/* Glassmorphic Container */}
        <div className="relative p-12 rounded-[3rem] bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/5 shadow-2xl backdrop-blur-2xl flex flex-col items-center">
          
          <div className="relative w-24 h-24">
            {/* Inner Ring */}
            <div className="absolute inset-0 border-2 border-dashed border-blue-400/30 rounded-full animate-spin-slower"></div>
            
            {/* Middle Ring */}
            <div className="absolute inset-2 border-t-2 border-r-2 border-cyan-400 rounded-full animate-spin"></div>
            
            {/* Outer Ring */}
            <div className="absolute -inset-2 border-b-2 border-l-2 border-indigo-500 rounded-full animate-spin-reverse"></div>
            
            {/* Glowing Core */}
            <div className="absolute inset-8 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.6)] animate-pulse"></div>
          </div>

          <div className="mt-10 text-center space-y-3">
            <h2 className="text-sm font-black tracking-[0.4em] uppercase text-gray-800 dark:text-white/90 drop-shadow-sm">
              Processing
            </h2>
            <div className="flex justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span 
                  key={i} 
                  className="w-2 h-2 rounded-full bg-gradient-to-b from-blue-500 to-cyan-400 shadow-sm"
                  style={{ animation: `bounce 1s infinite ${i * 0.2}s` }}
                ></span>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin-slower {
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          to { transform: rotate(-360deg); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        .animate-spin-slower { animation: spin-slower 4s linear infinite; }
        .animate-spin-reverse { animation: spin-reverse 2s linear infinite; }
        .animate-spin { animation: spin-slower 1.5s linear infinite; }
      `}</style>
    </div>
  )
}
