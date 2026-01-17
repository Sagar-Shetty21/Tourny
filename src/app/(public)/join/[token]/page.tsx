import Link from "next/link";

interface JoinTournamentPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function JoinTournamentPage({ params }: JoinTournamentPageProps) {
  // TODO: Fetch tournament details using the token
  // TODO: Verify token validity
  // TODO: Handle user authentication (redirect to sign-in if not authenticated)
  // TODO: Add user to tournament participants

  const { token } = await params;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🏆</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Join Tournament
          </h1>
          <p className="text-gray-600">
            You've been invited to participate
          </p>
        </div>

        {/* Placeholder tournament info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Invitation Token</p>
          <p className="text-lg font-mono text-gray-900 break-all">{token}</p>
        </div>

        <div className="space-y-4">
          <div className="border-l-4 border-indigo-500 bg-indigo-50 p-4 rounded">
            <p className="text-sm text-indigo-800">
              <strong>TODO:</strong> Display tournament name, format, start date, and participant count
            </p>
          </div>

          <button
            type="button"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
          >
            Join Tournament
          </button>

          <Link
            href="/"
            className="block text-center text-sm text-gray-500 hover:text-gray-700 transition duration-200"
          >
            ← Back to Home
          </Link>
        </div>

        {/* Development info */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Dev Note:</strong> This page will validate the token and allow authenticated users to join the tournament.
          </p>
        </div>
      </div>
    </div>
  );
}
