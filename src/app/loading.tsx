export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-sm transition-all duration-300">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100 dark:border-blue-900/30"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <div className="text-sm font-medium text-blue-600 dark:text-blue-400 animate-pulse">
          Loading...
        </div>
      </div>
    </div>
  )
}
