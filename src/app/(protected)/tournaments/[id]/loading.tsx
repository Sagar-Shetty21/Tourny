import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function TournamentLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title + Status Badge */}
      <div className="flex items-center gap-3 mb-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-72 mb-6" />

      {/* Quick Navigation */}
      <div className="mb-6 flex gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Players Section */}
      <div className="mb-8">
        <Skeleton className="h-6 w-24 mb-3" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
      </div>

      {/* Standings Table */}
      <div>
        <Skeleton className="h-6 w-28 mb-3" />
        <div className="border rounded-lg overflow-hidden">
          <div className="flex gap-4 px-4 py-3 bg-gray-50">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-32 flex-1" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 items-center px-4 py-3 border-t">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-28 flex-1" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
