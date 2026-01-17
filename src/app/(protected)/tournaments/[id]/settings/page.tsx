import Link from "next/link";

interface SettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  // TODO: Fetch tournament settings from database
  // TODO: Allow organizer to update tournament details
  // TODO: Add danger zone (delete tournament, cancel tournament)
  // TODO: Implement permissions management

  const { id } = await params;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href={`/tournaments/${id}`}
          className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
        >
          ← Back to Tournament
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Tournament Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your tournament configuration
        </p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            General Settings
          </h2>

          <form className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Tournament Name
              </label>
              <input
                type="text"
                id="name"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Tournament name"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Tournament description"
              />
            </div>

            <div>
              <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-1">
                Format
              </label>
              <select
                id="format"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option>Single Elimination</option>
                <option>Double Elimination</option>
                <option>Round Robin</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Save Changes
            </button>
          </form>
        </div>

        {/* Visibility Settings */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Visibility
          </h2>

          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Make tournament public
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">
                Allow spectators to view matches
              </span>
            </label>
          </div>
        </div>

        {/* TODO Notice */}
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Connect form to API, add validation, implement actual save functionality
          </p>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-red-200">
          <h2 className="text-xl font-bold text-red-900 mb-4">
            Danger Zone
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Cancel Tournament
                </h3>
                <p className="text-sm text-gray-600">
                  Cancel this tournament and notify all participants
                </p>
              </div>
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium">
                Cancel
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Delete Tournament
                </h3>
                <p className="text-sm text-gray-600">
                  Permanently delete this tournament and all data
                </p>
              </div>
              <button className="px-4 py-2 bg-red-700 text-white rounded-lg hover:bg-red-800 transition font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
