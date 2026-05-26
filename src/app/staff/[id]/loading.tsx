export default function StaffProfileLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Profile header skeleton */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-48" />
            <div className="flex gap-2">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-24" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-20" />
            </div>
          </div>
          <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>

      {/* Tab bar skeleton */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6">
        <div className="flex gap-1 py-3 overflow-hidden">
          {[100, 80, 90, 100, 85, 75].map((w, i) => (
            <div
              key={i}
              className="h-9 bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0"
              style={{ width: `${w}px` }}
            />
          ))}
        </div>
      </div>

      {/* Content skeleton */}
      <div className="flex-1 p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full w-1/3" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-full" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-5/6" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 space-y-2">
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full w-2/3" />
              <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
