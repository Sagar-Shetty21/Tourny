"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <CardHeader className="text-center px-0 pt-0">
        <CardTitle className="text-2xl font-semibold text-foreground">
          Reset Password
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {sent
            ? "Check your email for a reset link"
            : "Enter your email to receive a reset link"}
        </CardDescription>
      </CardHeader>

      <Card className="border border-border shadow-sm">
        <CardContent className="p-6 sm:p-8">
          {sent ? (
            <div className="text-center space-y-5">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Mail className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-muted-foreground text-sm">
                If an account with that email exists, we&apos;ve sent a password
                reset link.
              </p>
              <Link href="/sign-in">
                <Button variant="outline" className="w-full h-11">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {!sent && (
        <p className="text-center text-sm text-muted-foreground mt-6">
          Remember your password?{" "}
          <Link
            href="/sign-in"
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Sign In
          </Link>
        </p>
      )}
    </>
  );
}
