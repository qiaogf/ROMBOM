"use client";

export function Newsletter() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">Stay Updated</h2>
        <p className="text-slate-400 mb-8 text-sm sm:text-base">
          Subscribe to our newsletter for exclusive offers and new arrivals.
        </p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-5 py-3.5 bg-white/10 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <button
            type="submit"
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors duration-200 whitespace-nowrap"
          >
            Subscribe
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-4">
          By subscribing, you agree to our Privacy Policy.
        </p>
      </div>
    </section>
  );
}
