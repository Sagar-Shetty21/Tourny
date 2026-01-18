"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, Trophy, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, isLoaded } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !userId) {
      router.push("/sign-in");
    }
  }, [isLoaded, userId, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Trophy className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/tournaments/create", label: "Create Tournament", icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation - Desktop Only */}
      <nav className="hidden md:block bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Desktop Logo */}
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Trophy className="h-7 w-7" style={{ color: '#da6c6c' }} />
                <span className="text-2xl font-bold" style={{ color: '#da6c6c' }}>
                  Tourny
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="flex items-center space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="flex items-center gap-2"
                      style={isActive ? { backgroundColor: '#da6c6c' } : {}}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[280px] bg-white p-0">
          {/* Header Section */}
          <div className="p-6 pb-8" style={{ backgroundColor: '#ffb689' }}>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-8 w-8 text-gray-900" />
              <SheetTitle className="text-2xl font-bold text-gray-900">Tourny</SheetTitle>
            </div>
            <p className="text-gray-700 text-sm">Tournament Management</p>
          </div>

          {/* Navigation Section */}
          <nav className="flex flex-col gap-1 p-4 pb-24">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-12"
                    )}
                    style={isActive ? { backgroundColor: '#da6c6c' } : {}}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Footer Section with Profile */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-gray-100">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <span className="text-sm font-medium text-gray-700">Profile</span>
              </div>
            </div>
            <div className="px-4 pb-4 text-xs text-gray-500 flex items-center justify-between">
              <span>&copy; 2026 Tourny</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="pb-24 md:pb-8">{children}</main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-2 left-4 right-4 border border-gray-200 z-50 shadow-2xl rounded-2xl" style={{ backgroundColor: '#ffe6c1' }}>
        <div className="grid grid-cols-3 gap-1 p-2 max-w-md mx-auto">
          <Link href="/dashboard">
            <Button
              variant={pathname === "/dashboard" ? "default" : "ghost"}
              className={cn(
                "w-full flex flex-col items-center gap-1 h-auto py-3 rounded-xl transition-all",
                pathname === "/dashboard" && "shadow-md"
              )}
              style={pathname === "/dashboard" ? { backgroundColor: '#da6c6c' } : {}}
              size="sm"
            >
              <Home className={cn(
                "h-5 w-5",
                pathname === "/dashboard" ? "text-white" : "text-gray-600"
              )} />
              <span className={cn(
                "text-xs font-medium",
                pathname === "/dashboard" ? "text-white" : "text-gray-600"
              )}>Home</span>
            </Button>
          </Link>
          <Link href="/tournaments/create">
            <Button
              variant={pathname.includes("/tournaments/create") ? "default" : "ghost"}
              className={cn(
                "w-full flex flex-col items-center gap-1 h-auto py-3 rounded-xl transition-all",
                pathname.includes("/tournaments/create") && "shadow-md"
              )}
              style={pathname.includes("/tournaments/create") ? { backgroundColor: '#da6c6c' } : {}}
              size="sm"
            >
              <PlusCircle className={cn(
                "h-5 w-5",
                pathname.includes("/tournaments/create") ? "text-white" : "text-gray-600"
              )} />
              <span className={cn(
                "text-xs font-medium",
                pathname.includes("/tournaments/create") ? "text-white" : "text-gray-600"
              )}>Create</span>
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full flex flex-col items-center gap-1 h-auto py-3 rounded-xl transition-all"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5 text-gray-600" />
            <span className="text-xs font-medium text-gray-600">More</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
