import Link from "next/link";

interface MatchesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MatchesPage({ params }: MatchesPageProps) {
  // TODO: Fetch all matches for this tournament
  // TODO: Display bracket visualization
  // TODO: Allow organizer to submit match results
  // TODO: Show match history and upcoming matches

  const { id } = await params;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/tournaments/${id}`}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          ← Back to Tournament
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Matches</h1>
        <p className="text-gray-600 mt-2">
          View and manage tournament matches
        </p>
      </div>

      {/* Match Status Tabs */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium">
            All Matches
          </button>
          <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition">
            Upcoming
          </button>
          <button className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition">
            Completed
          </button>
        </div>
      </div>

      {/* Bracket View */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Tournament Bracket
        </h2>

        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Implement bracket visualization based on tournament format (single/double elimination, round-robin)
          </p>
        </div>
      </div>

      {/* Matches List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Match Schedule
        </h2>

        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded mb-6">
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Display list of matches with player names, scheduled time, and result submission form
          </p>
        </div>

        {/* Empty State */}
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🎮</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No matches scheduled
          </h3>
          <p className="text-gray-600 mb-6">
            Matches will be generated when the tournament starts
          </p>
        </div>
      </div>
    </div>
  );
}
