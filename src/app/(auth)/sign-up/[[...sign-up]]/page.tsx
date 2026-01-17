"use client";

import { useSignUp } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignUpPage() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [code, setCode] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        setIsLoading(true);
        setError("");

        try {
            await signUp.create({
                emailAddress: email,
                password,
                firstName,
                lastName,
            });

            await signUp.prepareEmailAddressVerification({
                strategy: "email_code",
            });

            setVerifying(true);
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e: FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        setIsLoading(true);
        setError("");

        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === "complete") {
                await setActive({ session: completeSignUp.createdSessionId });
                router.push("/dashboard");
            }
        } catch (err: any) {
            setError(err.errors?.[0]?.message || "Invalid verification code");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        🏆 Tourny
                    </h1>
                    <h2 className="text-2xl font-semibold text-gray-700">
                        {verifying ? "Verify Your Email" : "Join the Competition"}
                    </h2>
                    <p className="text-gray-600 mt-2">
                        {verifying 
                            ? "Enter the code sent to your email" 
                            : "Create your account to start organizing tournaments"}
                    </p>
                </div>

                {/* Custom Sign Up Form */}
                <div className="bg-white py-8 px-4 shadow-lg rounded-lg sm:px-10">
                    {!verifying ? (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                                        First name
                                    </label>
                                    <input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                        placeholder="John"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                                        Last name
                                    </label>
                                    <input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Email address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                                    placeholder="••••••••"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Must be at least 8 characters
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                            >
                                {isLoading ? "Creating account..." : "Create account"}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-5">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div>
                                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                                    Verification code
                                </label>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-center text-lg tracking-widest"
                                    placeholder="000000"
                                />
                                <p className="mt-1 text-xs text-gray-500 text-center">
                                    Check your email for the verification code
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                            >
                                {isLoading ? "Verifying..." : "Verify email"}
                            </button>
                        </form>
                    )}
                </div>

                {/* Footer Links */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                        Already have an account?{" "}
                        <Link
                            href="/sign-in"
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
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>

            {/* Bottom Features */}
            {!verifying && (
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
            )}

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
