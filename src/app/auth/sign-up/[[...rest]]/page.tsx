"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        🏆 Tourny
                    </h1>
                    <h2 className="text-2xl font-semibold text-gray-700">
                        Join the Competition
                    </h2>
                    <p className="text-gray-600 mt-2">
                        Create your account to start organizing tournaments
                    </p>
                </div>

                {/* Clerk Sign Up Component */}
                <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
                    <SignUp
                        path="/auth/sign-up"
                        routing="path"
                        signInUrl="/auth/sign-in"
                        appearance={{
                            elements: {
                                formButtonPrimary:
                                    "bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-md transition duration-200",
                                card: "shadow-none",
                                headerTitle: "hidden",
                                headerSubtitle: "hidden",
                                socialButtonsBlockButton:
                                    "border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-md transition duration-200",
                                formFieldInput:
                                    "block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-emerald-500 focus:border-emerald-500",
                                footerActionLink:
                                    "text-emerald-600 hover:text-emerald-500 font-medium",
                            },
                        }}
                    />
                </div>

                {/* Footer Links */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link
                            href="/auth/sign-in"
                            className="text-emerald-600 hover:text-emerald-500 font-medium transition duration-200"
                        >
                            Sign in here
                        </Link>
                    </p>

                    <div className="mt-4">
                        <Link
                            href="/"
                            className="text-sm text-gray-500 hover:text-gray-700 transition duration-200"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bottom Features */}
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
                <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 mx-4">
                    <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
                        Get Started in Minutes
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="p-4">
                            <div className="text-2xl mb-2">🔐</div>
                            <h4 className="font-medium text-gray-700">
                                Secure Authentication
                            </h4>
                            <p className="text-sm text-gray-600">
                                Email verification and secure login
                            </p>
                        </div>
                        <div className="p-4">
                            <div className="text-2xl mb-2">🎪</div>
                            <h4 className="font-medium text-gray-700">
                                Easy Setup
                            </h4>
                            <p className="text-sm text-gray-600">
                                Create your first tournament instantly
                            </p>
                        </div>
                        <div className="p-4">
                            <div className="text-2xl mb-2">👥</div>
                            <h4 className="font-medium text-gray-700">
                                Invite Players
                            </h4>
                            <p className="text-sm text-gray-600">
                                Share links and manage participants
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Terms and Privacy */}
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                    By creating an account, you agree to our{" "}
                    <a
                        href="#"
                        className="text-emerald-600 hover:text-emerald-500"
                    >
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                        href="#"
                        className="text-emerald-600 hover:text-emerald-500"
                    >
                        Privacy Policy
                    </a>
                </p>
            </div>
        </div>
    );
}
