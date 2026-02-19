import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

type AvailStatus = 'idle' | 'checking' | 'available' | 'taken';

function useAvailability(
  value: string,
  checker: (v: string) => Promise<{ available: boolean }>
): AvailStatus {
  const [status, setStatus] = useState<AvailStatus>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value) { setStatus('idle'); return; }
    setStatus('checking');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const { available } = await checker(value);
        setStatus(available ? 'available' : 'taken');
      } catch {
        setStatus('idle');
      }
    }, 2000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  return status;
}

function FieldFeedback({ status }: { status: AvailStatus }) {
  if (status === 'available') return <p className="text-green-400 text-xs">Available</p>;
  if (status === 'taken') return <p className="text-red-400 text-xs">Already taken</p>;
  if (status === 'checking') return <p className="text-gray-400 text-xs">Checking…</p>;
  return null;
}

export function SignupPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ username: '', screenName: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const usernameStatus = useAvailability(form.username, (v) => api.usernameAvailable(v));
  const screenNameStatus = useAvailability(form.screenName, (v) => api.screenNameAvailable(v));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (usernameStatus !== 'available' || screenNameStatus !== 'available') return;
    setError('');
    setLoading(true);
    try {
      await api.signUp(form);
      const me = await api.me();
      setUser(me.screenName, me.wins, me.losses);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl w-80 space-y-3">
        <h1 className="text-2xl font-bold text-white text-center">Create Account</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div>
          <input
            className="w-full p-2 rounded bg-gray-700 text-white"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
            required
          />
          <FieldFeedback status={usernameStatus} />
        </div>
        <div>
          <input
            className="w-full p-2 rounded bg-gray-700 text-white"
            placeholder="Screen name"
            value={form.screenName}
            onChange={(e) => setForm((f) => ({ ...f, screenName: e.target.value }))}
            required
          />
          <FieldFeedback status={screenNameStatus} />
        </div>
        <input
          type="password"
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          required
        />
        <button
          type="submit"
          disabled={loading || usernameStatus !== 'available' || screenNameStatus !== 'available'}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Creating…' : 'Create User'}
        </button>
        <p className="text-gray-400 text-sm text-center">
          Have an account? <Link to="/login" className="text-blue-400 hover:underline">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
