"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Info, Trophy, Target, Layers, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function CreateTournamentPage() {
  const router = useRouter();
  const [date, setDate] = useState<Date>();
  const [selectedFormat, setSelectedFormat] = useState<string>("round-robin");
  const [teamType, setTeamType] = useState<string>("individual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const maxParticipants = formData.get("maxParticipants") as string;

    if (!name.trim()) {
      setError("Tournament name is required");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || undefined,
          type: teamType === "individual" ? "SINGLES" : "DOUBLES",
          matchmakingMethod: "ROUND_ROBIN",
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
          joinExpiry: date ? date.toISOString() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create tournament");
      }

      toast.success("Tournament created successfully!", {
        description: "Redirecting to tournament page...",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });

      // Redirect to the tournament page
      setTimeout(() => {
        router.push(`/tournaments/${data.tournament.id}`);
      }, 1000);
    } catch (err: any) {
      setError(err.message);
      toast.error("Failed to create tournament", {
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Tournament</h1>
        <p className="text-gray-600 mt-2">
          Set up a new tournament with your custom rules
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
          <CardDescription>
            Configure your tournament settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Tournament Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                type="text"
                id="name"
                name="name"
                placeholder="Summer Championship 2026"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={4}
                placeholder="Describe your tournament..."
              />
            </div>

            {/* Tournament Format */}
            <div className="space-y-3">
              <Label>Format</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Round Robin */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedFormat === "round-robin" 
                      ? "border-indigo-600 border-2 bg-indigo-50/50 shadow-md" 
                      : "border-gray-200 hover:border-gray-300"
                  )}
                  onClick={() => setSelectedFormat("round-robin")}
                >
                  <CardHeader className="p-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                      selectedFormat === "round-robin" ? "bg-indigo-600" : "bg-gray-100"
                    )}>
                      <Layers className={cn(
                        "h-5 w-5",
                        selectedFormat === "round-robin" ? "text-white" : "text-gray-600"
                      )} />
                    </div>
                    <CardTitle className="text-base">Round Robin</CardTitle>
                    <CardDescription className="text-xs">
                      Every participant plays against each other
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Single Elimination */}
                <Card 
                  className={cn(
                    "cursor-not-allowed opacity-60 transition-all",
                    "border-gray-200"
                  )}
                >
                  <CardHeader className="p-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                      <Trophy className="h-5 w-5 text-gray-600" />
                    </div>
                    <CardTitle className="text-base">Single Elimination</CardTitle>
                    <CardDescription className="text-xs">
                      Lose once and you're out
                      <span className="block text-orange-600 mt-1">Coming Soon</span>
                    </CardDescription>
                  </CardHeader>
                </Card>

                {/* Double Elimination */}
                <Card 
                  className={cn(
                    "cursor-not-allowed opacity-60 transition-all",
                    "border-gray-200"
                  )}
                >
                  <CardHeader className="p-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-2">
                      <Target className="h-5 w-5 text-gray-600" />
                    </div>
                    <CardTitle className="text-base">Double Elimination</CardTitle>
                    <CardDescription className="text-xs">
                      Two chances to win the tournament
                      <span className="block text-orange-600 mt-1">Coming Soon</span>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
              <input type="hidden" name="format" value={selectedFormat} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teamType">Team Type</Label>
              <Select name="teamType" value={teamType} onValueChange={setTeamType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Players</SelectItem>
                  <SelectItem value="doubles">Teams (Doubles)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Max Participants */}
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                min="2"
                max="256"
                placeholder="16"
              />
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Creating Tournament..." : "Create Tournament"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 sm:flex-none"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
