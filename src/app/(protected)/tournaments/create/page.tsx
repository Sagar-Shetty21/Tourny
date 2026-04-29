"use client";

import { useState, useMemo } from "react";
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
import { CalendarIcon, Info, Layers, Loader2, CheckCircle2, Crown, RefreshCw, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { invalidateTournaments } from "@/lib/swr";

type FormatOption = {
  id: string;
  method: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  doublesOnly?: boolean;
  minSingles?: number;
  minDoubles?: number;
};

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: "round-robin",
    method: "ROUND_ROBIN",
    label: "Round Robin",
    description: "Every participant plays against each other",
    icon: <Layers className="h-5 w-5" />,
    minSingles: 2,
    minDoubles: 4,
  },
  {
    id: "swiss",
    method: "SWISS",
    label: "Swiss System",
    description: "Winners play winners, losers play losers. Multiple rounds.",
    icon: <Swords className="h-5 w-5" />,
    minSingles: 4,
    minDoubles: 8,
  },
  {
    id: "rotating-partner",
    method: "ROTATING_PARTNER",
    label: "Rotating Partner",
    description: "Partners rotate every round. Doubles only.",
    icon: <RefreshCw className="h-5 w-5" />,
    doublesOnly: true,
    minDoubles: 8,
  },
  {
    id: "king-of-the-court",
    method: "KING_OF_THE_COURT",
    label: "King of the Court",
    description: "Winning team stays on court. Losers rotate out.",
    icon: <Crown className="h-5 w-5" />,
    minSingles: 4,
    minDoubles: 6,
  },
];

export default function CreateTournamentPage() {
  const router = useRouter();
  const [date, setDate] = useState<Date>();
  const [selectedFormat, setSelectedFormat] = useState<string>("round-robin");
  const [teamType, setTeamType] = useState<string>("individual");
  const [totalRounds, setTotalRounds] = useState<string>("");
  const [totalMatches, setTotalMatches] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentFormatOption = FORMAT_OPTIONS.find((f) => f.id === selectedFormat)!;
  const matchmakingMethod = currentFormatOption.method;

  // Auto-switch to doubles if Rotating Partner is selected
  const effectiveTeamType = selectedFormat === "rotating-partner" ? "doubles" : teamType;

  const minPlayerHint = useMemo(() => {
    const opt = currentFormatOption;
    if (effectiveTeamType === "doubles") return opt.minDoubles || 4;
    return opt.minSingles || 2;
  }, [currentFormatOption, effectiveTeamType]);

  const handleFormatSelect = (formatId: string) => {
    const opt = FORMAT_OPTIONS.find((f) => f.id === formatId);
    if (!opt) return;
    if (opt.doublesOnly && teamType === "individual") {
      setTeamType("doubles");
    }
    setSelectedFormat(formatId);
  };

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

    const payload: Record<string, any> = {
      name: name.trim(),
      description: description?.trim() || undefined,
      type: effectiveTeamType === "individual" ? "SINGLES" : "DOUBLES",
      matchmakingMethod,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
      joinExpiry: date ? date.toISOString() : undefined,
    };

    // Add format-specific fields
    if (matchmakingMethod === "SWISS" || matchmakingMethod === "ROTATING_PARTNER") {
      const rounds = parseInt(totalRounds);
      if (!rounds || rounds < 2) {
        setError("Please specify the number of rounds (at least 2)");
        setLoading(false);
        return;
      }
      payload.totalRounds = rounds;
    }

    if (matchmakingMethod === "KING_OF_THE_COURT") {
      const matches = parseInt(totalMatches);
      if (!matches || matches < 3) {
        setError("Please specify the total number of matches (at least 3)");
        setLoading(false);
        return;
      }
      payload.totalMatches = matches;
    }

    try {
      const res = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create tournament");
      }

      toast.success("Tournament created successfully!", {
        description: "Redirecting to tournament page...",
        icon: <CheckCircle2 className="h-4 w-4" />,
      });

      invalidateTournaments();

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

            {/* Team Type — placed before Format so Rotating Partner can react */}
            <div className="space-y-2">
              <Label htmlFor="teamType">Team Type</Label>
              <Select
                name="teamType"
                value={effectiveTeamType}
                onValueChange={(v) => {
                  setTeamType(v);
                  // If switching to individual, deselect doubles-only format
                  if (v === "individual" && currentFormatOption.doublesOnly) {
                    setSelectedFormat("round-robin");
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Players</SelectItem>
                  <SelectItem value="doubles">Teams (Doubles)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tournament Format */}
            <div className="space-y-3">
              <Label>Format</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {FORMAT_OPTIONS.map((opt) => {
                  const isDisabled = opt.doublesOnly && effectiveTeamType === "individual";
                  const isSelected = selectedFormat === opt.id;
                  return (
                    <Card
                      key={opt.id}
                      className={cn(
                        "transition-all",
                        isDisabled
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:shadow-md",
                        isSelected && !isDisabled
                          ? "border-indigo-600 border-2 bg-indigo-50/50 shadow-md"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                      onClick={() => !isDisabled && handleFormatSelect(opt.id)}
                    >
                      <CardHeader className="p-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center mb-2",
                            isSelected && !isDisabled ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                          )}
                        >
                          {opt.icon}
                        </div>
                        <CardTitle className="text-base">{opt.label}</CardTitle>
                        <CardDescription className="text-xs">
                          {opt.description}
                          {isDisabled && (
                            <span className="block text-orange-600 mt-1">
                              Select Doubles to enable
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Min. {minPlayerHint} players required for {currentFormatOption.label}
                {effectiveTeamType === "doubles" ? " (Doubles)" : " (Singles)"}
              </p>
            </div>

            {/* Swiss: Number of Rounds */}
            {matchmakingMethod === "SWISS" && (
              <div className="space-y-2">
                <Label htmlFor="totalRounds">Number of Rounds</Label>
                <Input
                  type="number"
                  id="totalRounds"
                  min="2"
                  max="20"
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(e.target.value)}
                  placeholder="e.g. 5"
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 3-5 rounds. More rounds = more accurate rankings.
                </p>
              </div>
            )}

            {/* Rotating Partner: Number of Rounds */}
            {matchmakingMethod === "ROTATING_PARTNER" && (
              <div className="space-y-2">
                <Label htmlFor="totalRounds">Number of Rounds</Label>
                <Input
                  type="number"
                  id="totalRounds"
                  min="3"
                  max="12"
                  value={totalRounds}
                  onChange={(e) => setTotalRounds(e.target.value)}
                  placeholder="e.g. 6"
                />
                <p className="text-xs text-muted-foreground">
                  All matches are generated upfront. 5-8 rounds recommended.
                </p>
              </div>
            )}

            {/* King of the Court: Total Matches */}
            {matchmakingMethod === "KING_OF_THE_COURT" && (
              <div className="space-y-2">
                <Label htmlFor="totalMatches">Total Matches</Label>
                <Input
                  type="number"
                  id="totalMatches"
                  min="3"
                  max="100"
                  value={totalMatches}
                  onChange={(e) => setTotalMatches(e.target.value)}
                  placeholder="e.g. 15"
                />
                <p className="text-xs text-muted-foreground">
                  The tournament ends after this many matches. No draws allowed — a winner must be decided each match.
                </p>
              </div>
            )}

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
