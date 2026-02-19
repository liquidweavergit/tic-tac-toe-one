import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { screenName } = await api.signIn(form);
      const me = await api.me();
      setUser(me.screenName, me.wins, me.losses);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-xl w-80 space-y-4">
        <h1 className="text-2xl font-bold text-white text-center">Sign In</h1>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <input
          className="w-full p-2 rounded bg-gray-700 text-white"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          required
        />
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
          disabled={loading}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold disabled:opacity-50"
        >
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="text-gray-400 text-sm text-center">
          No account? <Link to="/signup" className="text-blue-400 hover:underline">Sign up</Link>
        </p>
      </form>
    </div>
  );
}
