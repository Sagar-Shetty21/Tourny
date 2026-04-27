import { Trophy, Target, Zap, BarChart3 } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Brand Panel — hidden on mobile, visible on lg+ */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 text-white">
        {/* Decorative background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-[radial-gradient(circle,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
          <div className="absolute top-1/4 -left-12 w-64 h-64 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute bottom-1/4 right-0 w-48 h-48 rounded-full bg-indigo-400/10 blur-3xl" />
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        {/* Brand content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-bold tracking-tight">Tourny</span>
          </div>

          {/* Tagline */}
          <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
            Tournament management
            <br />
            <span className="text-indigo-200">made simple.</span>
          </h2>
          <p className="text-indigo-200/80 text-lg mb-10 max-w-md">
            Create, manage, and track tournaments effortlessly. Built for organizers who want results, not headaches.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Target className="h-5 w-5 text-indigo-200" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Create Tournaments</h4>
                <p className="text-indigo-300/80 text-sm">Set up custom tournaments with your rules in minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Zap className="h-5 w-5 text-indigo-200" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Auto Matchmaking</h4>
                <p className="text-indigo-300/80 text-sm">Automated bracket generation and scheduling</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-indigo-200" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Live Tracking</h4>
                <p className="text-indigo-300/80 text-sm">Real-time progress, scores, and leaderboards</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex-1 flex flex-col min-h-screen bg-background">
        {/* Mobile-only compact header */}
        <div className="lg:hidden flex items-center justify-center gap-2 pt-8 pb-2 px-4">
          <Trophy className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold text-foreground">Tourny</span>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Back to home */}
        <div className="pb-6 text-center px-4">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
