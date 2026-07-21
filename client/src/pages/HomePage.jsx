import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-4 py-12 sm:px-6">
      <section className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl sm:p-10">
        <h1 className="text-4xl font-bold sm:text-5xl">MeetForge</h1>
        <p className="mt-4 max-w-2xl text-slate-300">
          Production-ready collaboration platform foundation with secure JWT authentication.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="rounded-md bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
          >
            Signup
          </Link>
        </div>
      </section>
    </main>
  );
}
