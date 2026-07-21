import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="mt-3 text-slate-300">You are authenticated and can access protected routes.</p>
        <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-200">
          <p>
            <span className="font-semibold text-slate-100">Name:</span> {user?.name || 'N/A'}
          </p>
          <p className="mt-2">
            <span className="font-semibold text-slate-100">Email:</span> {user?.email || 'N/A'}
          </p>
        </div>
      </section>
    </main>
  );
}
