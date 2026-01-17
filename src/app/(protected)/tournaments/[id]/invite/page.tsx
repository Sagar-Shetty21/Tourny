import Link from "next/link";

interface InvitePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvitePage({ params }: InvitePageProps) {
  // TODO: Generate unique invitation token for tournament
  // TODO: Create shareable link with token
  // TODO: Allow copying link to clipboard
  // TODO: Optional: Send email invitations

  const { id } = await params;
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/EXAMPLE_TOKEN_${id}`;

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
        <h1 className="text-3xl font-bold text-gray-900">Invite Players</h1>
        <p className="text-gray-600 mt-2">
          Share this link to invite players to your tournament
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
        {/* Invitation Link */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invitation Link
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-mono text-sm"
            />
            <button
              type="button"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition font-medium"
            >
              📋 Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Anyone with this link can join the tournament
          </p>
        </div>

        {/* QR Code Placeholder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            QR Code
          </label>
          <div className="bg-gray-100 rounded-lg p-8 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-2">📱</div>
              <p className="text-sm text-gray-600">QR Code will appear here</p>
            </div>
          </div>
        </div>

        {/* TODO Notice */}
        <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>TODO:</strong> Generate unique token, implement copy-to-clipboard, create QR code, optionally add email invitation form
          </p>
        </div>

        {/* Email Invitation (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Invitations (Coming Soon)
          </label>
          <div className="flex space-x-2">
            <input
              type="email"
              placeholder="player@example.com"
              disabled
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-400"
            />
            <button
              type="button"
              disabled
              className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
            >
              Send Invite
            </button>
          </div>
        </div>

        {/* Share Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Share on Social Media
          </label>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
              Twitter
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition">
              Facebook
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
