"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Target, Zap, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignInPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirectUrl, setRedirectUrl] = useState<string>("/dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const redirect = searchParams.get("redirect");
    if (redirect) {
      setRedirectUrl(redirect);
      sessionStorage.setItem("auth_redirect", redirect);
    } else {
      const storedRedirect = sessionStorage.getItem("auth_redirect");
      if (storedRedirect) {
        setRedirectUrl(storedRedirect);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "authenticated" && session) {
      const destination = sessionStorage.getItem("auth_redirect") || "/dashboard";
      sessionStorage.removeItem("auth_redirect");
      router.push(destination);
    }
  }, [status, session, router]);

  if (status === "authenticated") {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid username or password");
      setLoading(false);
    } else {
      const destination = sessionStorage.getItem("auth_redirect") || "/dashboard";
      sessionStorage.removeItem("auth_redirect");
      router.push(destination);
    }
  };

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

        {/* Sign In Form */}
        <div className="bg-white shadow-lg rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
              Forgot your password?
            </Link>
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{" "}
              <Link
                href={redirectUrl !== "/dashboard" ? `/sign-up?redirect=${encodeURIComponent(redirectUrl)}` : "/sign-up"}
                className="text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Sign Up
              </Link>
            </p>
          </div>
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
