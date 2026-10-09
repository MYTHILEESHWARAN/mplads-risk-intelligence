import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Eye, EyeOff, Loader2, ChevronDown } from 'lucide-react';
import { loginDemo } from '../services/api';

const DEMO_ROLES = [
  { role: 'MP / Constituency', desc: 'View projects under your constituency', id: 'MP-001' },
  { role: 'District Officer', desc: 'Monitor all projects in your district', id: 'DO-042' },
  { role: 'State Nodal Officer', desc: 'State-wide risk oversight', id: 'SNO-07' },
  { role: 'Ministry Officer', desc: 'National-level monitoring & audit', id: 'MIN-003' },
];

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please enter your credentials.'); return; }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setError('Invalid credentials. Use Demo Login below to access the system.');
  };

  const handleDemo = async (role) => {
    setDemoOpen(false);
    setLoading(true);
    await loginDemo(role);
    setLoading(false);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header strip */}
          <div className="bg-[#0f1c3f] px-8 py-7 text-center">
            <div className="flex items-center justify-center gap-2.5 mb-3">
              <div className="p-2 bg-blue-500 rounded-xl">
                <ShieldAlert className="w-6 h-6 text-white" aria-hidden="true" />
              </div>
              <div className="text-left">
                <h1 className="text-white font-bold text-lg leading-tight">MPLADS Risk Intelligence</h1>
                <p className="text-blue-300 text-xs">AI-powered anomaly, fraud and inefficiency detection</p>
              </div>
            </div>
            <p className="text-blue-200/70 text-xs mt-2">Government of India · Ministry of Statistics and Programme Implementation</p>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <h2 className="text-gray-900 font-semibold text-base mb-1">Sign in to your account</h2>
            <p className="text-gray-500 text-xs mb-6">Enter your officer credentials to continue</p>

            {error && (
              <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSignIn} noValidate>
              <div className="mb-4">
                <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1.5">
                  Email / Officer ID
                </label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  autoComplete="username"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="officer@mplads.gov.in"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-medium text-gray-700">Password</label>
                  <button type="button" className="text-xs text-blue-600 hover:underline">Forgot password?</button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-xs text-gray-600">Remember me on this device</label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : null}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Demo Login */}
            <div className="relative">
              <button
                onClick={() => setDemoOpen(!demoOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 border-2 border-dashed border-blue-300 rounded-lg text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                aria-expanded={demoOpen}
                aria-haspopup="listbox"
              >
                <span>Demo Login — Select Role</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${demoOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>
              {demoOpen && (
                <ul
                  role="listbox"
                  aria-label="Select demo role"
                  className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-10"
                >
                  {DEMO_ROLES.map(({ role, desc, id }) => (
                    <li key={role}>
                      <button
                        role="option"
                        onClick={() => handleDemo(role)}
                        disabled={loading}
                        className="w-full flex flex-col items-start px-4 py-3 hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                      >
                        <span className="text-sm font-semibold text-gray-800">{role}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{desc} · {id}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-center text-[10px] text-gray-400 mt-6 leading-relaxed">
              This system is for authorised government officers only.<br />
              Unauthorised access is a criminal offence.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-blue-200/40 mt-4">
          © 2026 Ministry of Statistics &amp; Programme Implementation · SIH 2026 · AI Avengers
        </p>
      </div>
    </div>
  );
}
