import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <>
      {/* Mobile: Full-screen chat skeleton */}
      <div className="md:hidden fixed inset-0 z-[55] flex flex-col" style={{ backgroundColor: "#ffe6c1" }}>
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0">
          <Skeleton className="h-9 w-9 rounded-xl" />
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden px-4 py-3 space-y-4">
          {/* Left message */}
          <div className="flex items-start gap-2.5">
            <Skeleton className="mt-5 h-8 w-8 rounded-full shrink-0" />
            <div className="flex flex-col max-w-[70%]">
              <div className="flex items-baseline gap-2 mb-0.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-md" />
            </div>
          </div>
          {/* Right message */}
          <div className="flex items-start gap-2.5 flex-row-reverse">
            <Skeleton className="mt-5 h-8 w-8 rounded-full shrink-0" />
            <div className="flex flex-col items-end max-w-[70%]">
              <div className="flex items-baseline gap-2 mb-0.5 flex-row-reverse">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-14 w-56 rounded-2xl rounded-br-md" />
            </div>
          </div>
          {/* Left message */}
          <div className="flex items-start gap-2.5">
            <Skeleton className="mt-5 h-8 w-8 rounded-full shrink-0" />
            <div className="flex flex-col max-w-[70%]">
              <div className="flex items-baseline gap-2 mb-0.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-8 w-36 rounded-2xl rounded-bl-md" />
            </div>
          </div>
          {/* Right message */}
          <div className="flex items-start gap-2.5 flex-row-reverse">
            <Skeleton className="mt-5 h-8 w-8 rounded-full shrink-0" />
            <div className="flex flex-col items-end max-w-[70%]">
              <div className="flex items-baseline gap-2 mb-0.5 flex-row-reverse">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-10 w-44 rounded-2xl rounded-br-md" />
            </div>
          </div>
          {/* Left message */}
          <div className="flex items-start gap-2.5">
            <Skeleton className="mt-5 h-8 w-8 rounded-full shrink-0" />
            <div className="flex flex-col max-w-[70%]">
              <div className="flex items-baseline gap-2 mb-0.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-16 w-52 rounded-2xl rounded-bl-md" />
            </div>
          </div>
        </div>

        {/* Input bar */}
        <div className="shrink-0 bg-white px-4 py-3 border-t border-gray-100" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Desktop: Standard chat skeleton */}
      <div className="hidden md:block max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-4 w-40 mt-1" />
        </div>

        {/* Quick Navigation */}
        <div className="mb-6 flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>

        {/* Chat Container */}
        <div className="border rounded-xl bg-white overflow-hidden flex flex-col" style={{ height: "calc(100vh - 340px)", minHeight: "400px" }}>
          <div className="flex-1 px-4 py-3 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`flex items-start gap-2.5 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                <Skeleton className="mt-5 h-8 w-8 rounded-full shrink-0" />
                <div className={`flex flex-col max-w-[70%] ${i % 2 === 0 ? "items-end" : "items-start"}`}>
                  <div className={`flex items-baseline gap-2 mb-0.5 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-2.5 w-10" />
                  </div>
                  <Skeleton className={`h-${8 + (i % 3) * 4} w-${32 + (i % 3) * 12} rounded-2xl`} style={{ height: `${32 + (i % 3) * 16}px`, width: `${128 + (i % 3) * 48}px` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t bg-gray-50 px-4 py-3">
            <div className="flex gap-2">
              <Skeleton className="flex-1 h-10 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
