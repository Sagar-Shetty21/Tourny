import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function CreateTournamentLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title */}
      <div className="mb-8">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64 mt-2" />
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-52 mt-1" />
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tournament Name */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full rounded-md" />
          </div>

          {/* Format Selection */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-gray-200">
                  <CardHeader className="p-4">
                    <Skeleton className="w-10 h-10 rounded-lg mb-2" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-full mt-1" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Team Type */}
          <div className="space-y-3">
            <Skeleton className="h-4 w-20" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2].map((i) => (
                <Card key={i} className="border-gray-200">
                  <CardHeader className="p-4">
                    <Skeleton className="w-10 h-10 rounded-lg mb-2" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full mt-1" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          {/* Max Participants */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Join Expiry */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>

          {/* Submit Button */}
          <Skeleton className="h-10 w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
