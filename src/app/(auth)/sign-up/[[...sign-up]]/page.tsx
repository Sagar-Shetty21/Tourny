import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Trophy, Rocket, Gamepad2, Users } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="h-10 w-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-900">Tourny</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-700">Get Started</h2>
          <p className="text-gray-600 mt-2">Create your account to organize tournaments</p>
        </div>

        {/* Clerk Sign Up Component */}
        <div className="flex justify-center">
          <SignUp 
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-lg",
              },
            }}
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            afterSignUpUrl="/dashboard"
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
            Why Choose Tourny?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mx-auto mb-2">
                <Rocket className="h-6 w-6 text-indigo-600" />
              </div>
              <h4 className="font-medium text-gray-700">Quick Setup</h4>
              <p className="text-sm text-gray-600">Create tournaments in minutes</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mx-auto mb-2">
                <Gamepad2 className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium text-gray-700">Multiple Formats</h4>
              <p className="text-sm text-gray-600">Single/Double elimination & Round robin</p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center mx-auto mb-2">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium text-gray-700">Easy Invites</h4>
              <p className="text-sm text-gray-600">Share links to invite participants</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
