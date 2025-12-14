import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="relative z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                🏆 Tourny
              </span>
            </div>
            <div className="flex space-x-4">
              <Link 
                href="/auth/sign-in"
                className="px-4 py-2 text-gray-700 hover:text-indigo-600 transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link 
                href="/auth/sign-up"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 text-indigo-800 text-sm font-medium">
                ⚡ Automated Matchmaking • Live Tracking • Multiple Formats
              </span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Create & Manage
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                Epic Tournaments
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              The modern platform for tournament organizers. Set up competitions, invite players, 
              and watch your tournaments unfold with automated matchmaking and real-time tracking.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                href="/auth/sign-up"
                className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-xl hover:bg-indigo-700 transform hover:-translate-y-1 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Start Your Tournament
              </Link>
              <button className="px-8 py-4 border-2 border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:border-indigo-600 hover:text-indigo-600 transition-colors duration-200">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-20 animate-bounce"></div>
        <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full opacity-20 animate-pulse"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From setup to victory ceremony, we've got every aspect of tournament management covered.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Easy Tournament Creation</h3>
              <p className="text-gray-600 leading-relaxed">
                Set up tournaments in minutes with custom rules, participant limits, and registration deadlines. Share invite links instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Smart Matchmaking</h3>
              <p className="text-gray-600 leading-relaxed">
                Automatic bracket generation with multiple formats: Random knockout, Round-robin, and Swiss system for fair competition.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-green-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Live Progress Tracking</h3>
              <p className="text-gray-600 leading-relaxed">
                Real-time leaderboards, auto-updating points tables, and live match results keep everyone engaged and informed.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-orange-50 to-yellow-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">🔐</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Secure Authentication</h3>
              <p className="text-gray-600 leading-relaxed">
                Advanced security with Clerk authentication supporting email, OTP, and OAuth for seamless user management.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">👥</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Player Management</h3>
              <p className="text-gray-600 leading-relaxed">
                Easy player invitations, registration tracking, and participant management with shareable tournament links.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group p-8 rounded-2xl bg-gradient-to-br from-rose-50 to-red-50 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="w-14 h-14 bg-rose-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-200">
                <span className="text-2xl">🏆</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Tournament Progression</h3>
              <p className="text-gray-600 leading-relaxed">
                Automated advancement through rounds, admin-controlled results, and clear progression paths to crown your champion.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Host Your First Tournament?
          </h2>
          <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
            Join tournament organizers worldwide who trust our platform to deliver seamless competitive experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/sign-up"
              className="px-8 py-4 bg-white text-indigo-600 text-lg font-bold rounded-xl hover:bg-gray-50 transform hover:-translate-y-1 transition-all duration-200 shadow-lg"
            >
              Create Account - It's Free
            </Link>
            <Link 
              href="/auth/sign-in"
              className="px-8 py-4 border-2 border-white text-white text-lg font-semibold rounded-xl hover:bg-white hover:text-indigo-600 transition-colors duration-200"
            >
              Already Have Account?
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <span className="text-2xl font-bold text-white">🏆 Tourny</span>
              <p className="mt-4 text-gray-400">
                The modern platform for creating and managing competitive tournaments with automated matchmaking and live tracking.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Platform</h4>
              <ul className="space-y-2">
                <li><span className="hover:text-white transition-colors cursor-pointer">Features</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Pricing</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Documentation</span></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2">
                <li><span className="hover:text-white transition-colors cursor-pointer">Help Center</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Contact Us</span></li>
                <li><span className="hover:text-white transition-colors cursor-pointer">Community</span></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              © 2025 Tourny. Built with Next.js, Clerk, and PostgreSQL.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
