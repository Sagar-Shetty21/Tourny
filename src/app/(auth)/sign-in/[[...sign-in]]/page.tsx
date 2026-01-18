import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Trophy, Target, Zap, BarChart3 } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-10 w-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">Tourny</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to manage your tournaments</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="flex justify-center">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg",
              },
            }}
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
          />
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <Link 
            href="/" 
            className="text-sm text-gray-500 hover:text-gray-700 transition duration-200"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      {/* Bottom Features */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 mx-4">
          <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
            What you can do with Tourny
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mx-auto mb-2">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <h4 className="font-medium text-gray-700">Create Tournaments</h4>
              <p className="text-sm text-gray-600">Set up custom tournaments with your rules</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-gray-700">Auto Matchmaking</h4>
              <p className="text-sm text-gray-600">Automated bracket generation and scheduling</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-gray-700">Live Tracking</h4>
              <p className="text-sm text-gray-600">Real-time progress and leaderboards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
