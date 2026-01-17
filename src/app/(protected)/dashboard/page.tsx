import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

export default async function DashboardPage() {
  const { userId } = await auth();

  // TODO: Fetch user's tournaments from database
  // TODO: Display tournament stats (active, completed, upcoming)
  // TODO: Show recent matches and notifications

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Manage your tournaments and track ongoing matches
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Link
          href="/tournaments/create"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition border-2 border-transparent hover:border-indigo-500"
        >
          <div className="text-3xl mb-3">➕</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Create Tournament
          </h3>
          <p className="text-sm text-gray-600">
            Start a new tournament with custom settings
          </p>
        </Link>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-3">🏆</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Active Tournaments
          </h3>
          <p className="text-3xl font-bold text-indigo-600 mb-1">0</p>
          <p className="text-sm text-gray-600">Currently running</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="text-3xl mb-3">✅</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Completed
          </h3>
          <p className="text-3xl font-bold text-green-600 mb-1">0</p>
          <p className="text-sm text-gray-600">Finished tournaments</p>
        </div>
      </div>

      {/* Tournaments List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Your Tournaments
        </h2>

        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Display list of tournaments with filters (active, upcoming, completed)
          </p>
        </div>

        {/* Empty State */}
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tournaments yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first tournament to get started
          </p>
          <Link
            href="/tournaments/create"
            className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Create Tournament
          </Link>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>Dev Note:</strong> User ID: {userId}
        </p>
      </div>
    </div>
  );
}
