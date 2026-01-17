import Link from "next/link";

interface TournamentPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function TournamentPage({ params }: TournamentPageProps) {
  // TODO: Fetch tournament details from database
  // TODO: Check if user is tournament organizer
  // TODO: Display current bracket/standings
  // TODO: Show match results

  const { id } = await params;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Tournament Details
            </h1>
            <p className="text-gray-600 mt-1">Tournament ID: {id}</p>
          </div>
          <Link
            href={`/tournaments/${id}/settings`}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            ⚙️ Settings
          </Link>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex space-x-4 overflow-x-auto">
          <Link
            href={`/tournaments/${id}`}
            className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium whitespace-nowrap"
          >
            Overview
          </Link>
          <Link
            href={`/tournaments/${id}/players`}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition"
          >
            Players
          </Link>
          <Link
            href={`/tournaments/${id}/matches`}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition"
          >
            Matches
          </Link>
          <Link
            href={`/tournaments/${id}/invite`}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium whitespace-nowrap transition"
          >
            Invite
          </Link>
        </div>
      </div>

      {/* Tournament Info Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-2xl mb-2">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Participants
          </h3>
          <p className="text-3xl font-bold text-indigo-600">0 / 16</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-2xl mb-2">🎮</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Matches
          </h3>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-2xl mb-2">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Status
          </h3>
          <p className="text-lg font-semibold text-yellow-600">Not Started</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Tournament Overview
        </h2>

        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded mb-6">
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Display tournament details, current bracket, upcoming matches, and recent results
          </p>
        </div>

        {/* Tournament Details Placeholder */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Format</h3>
            <p className="text-gray-900">Single Elimination</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Start Date</h3>
            <p className="text-gray-900">TBD</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="text-gray-900">Tournament description will appear here</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex space-x-4">
          <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-medium">
            Start Tournament
          </button>
          <Link
            href={`/tournaments/${id}/invite`}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
          >
            Invite Players
          </Link>
        </div>
      </div>
    </div>
  );
}
