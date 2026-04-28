import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <div className="min-h-screen flex">
      {/* Brand panel — Desktop only */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-indigo-600 to-purple-700 items-center justify-center p-12">
        <div className="text-center space-y-6">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto bg-white/20" />
          <Skeleton className="h-10 w-48 mx-auto bg-white/20" />
          <Skeleton className="h-4 w-64 mx-auto bg-white/15" />
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Skeleton className="h-12 w-12 rounded-xl mx-auto mb-3" />
            <Skeleton className="h-6 w-24 mx-auto" />
          </div>

          <div className="space-y-2 text-center">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          <Skeleton className="h-4 w-52 mx-auto" />
        </div>
      </div>
    </div>
  );
}
