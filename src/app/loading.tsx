export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 dark:bg-black/50 backdrop-blur-md transition-all duration-500">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Outermost rotating elegant ring */}
        <div className="absolute inset-0 rounded-full border border-blue-500/20 dark:border-blue-400/20 scale-[1.5] animate-ping opacity-30"></div>
        <div className="absolute inset-0 rounded-full border-t flex-shrink-0 animate-[spin_3s_linear_infinite] border-blue-600 dark:border-blue-400 opacity-60"></div>
        {/* Inner geometric shapes */}
        <div className="absolute inset-2 rounded-full border-l flex-shrink-0 animate-[spin_2s_ease-in-out_infinite_reverse] border-cyan-500 dark:border-cyan-300 opacity-80"></div>
        <div className="absolute inset-4 rounded-full border-r flex-shrink-0 animate-[spin_1.5s_linear_infinite] border-indigo-500 dark:border-indigo-400"></div>
        {/* Central glowing core */}
        <div className="w-4 h-4 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-full animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.8)]"></div>
      </div>
    </div>
  )
}
