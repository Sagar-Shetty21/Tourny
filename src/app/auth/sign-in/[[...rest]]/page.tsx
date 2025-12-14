"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🏆 Tourny</h1>
          <h2 className="text-2xl font-semibold text-gray-700">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to manage your tournaments</p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
          <SignIn 
            path="/auth/sign-in"
            routing="path"
            signUpUrl="/auth/sign-up"
            appearance={{
              elements: {
                formButtonPrimary: "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-200",
                card: "shadow-none",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200",
                formFieldInput: "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500",
                footerActionLink: "text-indigo-600 hover:text-indigo-500 font-medium"
              }
            }}
          />
        </div>

        {/* Footer Links */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link 
              href="/auth/sign-up" 
              className="text-indigo-600 hover:text-indigo-500 font-medium transition duration-200"
            >
              Sign up here
            </Link>
          </p>
          
          <div className="mt-4">
            <Link 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-700 transition duration-200"
            >
              ← Back to Home
            </Link>
          </div>
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
              <div className="text-2xl mb-2">🎯</div>
              <h4 className="font-medium text-gray-700">Create Tournaments</h4>
              <p className="text-sm text-gray-600">Set up custom tournaments with your rules</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">⚡</div>
              <h4 className="font-medium text-gray-700">Auto Matchmaking</h4>
              <p className="text-sm text-gray-600">Automated bracket generation and scheduling</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">📊</div>
              <h4 className="font-medium text-gray-700">Live Tracking</h4>
              <p className="text-sm text-gray-600">Real-time progress and leaderboards</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}