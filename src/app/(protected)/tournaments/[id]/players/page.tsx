import Link from "next/link";

interface PlayersPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PlayersPage({ params }: PlayersPageProps) {
  // TODO: Fetch tournament participants from database
  // TODO: Display player stats and seeding
  // TODO: Allow organizer to remove players
  // TODO: Allow organizer to adjust seeding

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
        <h1 className="text-3xl font-bold text-gray-900">Players</h1>
        <p className="text-gray-600 mt-2">
          Manage participants for this tournament
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Participant List
          </h2>
          <Link
            href={`/tournaments/${id}/invite`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            + Invite Players
          </Link>
        </div>

        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded mb-6">
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Display table of players with name, join date, seeding, and actions (remove, adjust seed)
          </p>
        </div>

        {/* Empty State */}
        <div className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No players yet
          </h3>
          <p className="text-gray-600 mb-6">
            Invite players to join your tournament
          </p>
          <Link
            href={`/tournaments/${id}/invite`}
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Send Invitations
          </Link>
        </div>
      </div>
    </div>
  );
}
