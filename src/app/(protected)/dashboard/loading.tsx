import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-white md:bg-white">
      {/* Mobile Header + Bento Grid */}
      <div className="md:hidden">
        <div style={{ backgroundColor: "#ffb689" }}>
          <div className="px-4 pt-6 pb-4">
            <Skeleton className="h-8 w-40 bg-white/30" />
            <Skeleton className="h-4 w-56 mt-2 bg-white/20" />
          </div>
          <div className="px-4 pb-6">
            <div className="grid grid-cols-2 gap-3">
              {/* Create Tournament Card */}
              <Card className="col-span-2 border-0 shadow-lg" style={{ backgroundColor: "#fee9ca" }}>
                <CardHeader className="gap-0">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div>
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </CardHeader>
              </Card>
              {/* 4 stat cards */}
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-lg rounded-2xl py-0" style={{ backgroundColor: "#fddcc0" }}>
                  <CardContent className="flex items-center gap-3 py-4 px-4">
                    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-7 w-8" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
        {/* Tournament List */}
        <div className="bg-white rounded-t-3xl -mt-4 pt-6 px-4 pb-24 relative z-10">
          <div className="mb-4">
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="py-0 border border-gray-200">
                <CardContent className="flex items-center justify-between py-3 px-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-5 w-5 rounded shrink-0 ml-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-56 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="py-0 border border-gray-200">
              <CardContent className="flex items-center justify-between py-3 px-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-5 rounded shrink-0 ml-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
