import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = [
  { role: 'Manufacturer', email: 'manufacturer@greengrow.example', pass: 'Manufacturer@2026', desc: 'Creates products & seed batches' },
  { role: 'Distributor', email: 'distributor@greengrow.example', pass: 'Distributor@2026', desc: 'Receives & dispatches stock' },
  { role: 'Retailer', email: 'retailer@greengrow.example', pass: 'Retailer@2026', desc: 'Manages retail inventory' },
  { role: 'Platform Admin', email: 'admin@smartseed.io', pass: 'SmartSeed@Admin2026', desc: 'Platform oversight & analytics' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Signed in as ${data.user.role.replace('_', ' ')}`);
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Sign in</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your credentials to access the platform</p>
        </div>

        <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@smartseed.io" required />
        <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />

        <Button type="submit" loading={loading} className="w-full">Sign in</Button>

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account? <Link to="/register" className="text-green-600 font-medium hover:underline">Register your organization</Link>
        </p>
      </form>

      {/* Demo Role Selector */}
      <div className="pt-4 border-t border-gray-100">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-center">
          Quick Demo Login by Role
        </p>
        <p className="text-xs text-gray-400 text-center mb-3">
          Click any role below to pre-fill credentials:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => fillDemo(acc)}
              className={`p-2.5 rounded-lg border text-left text-xs transition-all ${
                email === acc.email
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-semibold">{acc.role}</div>
              <div className="text-[11px] text-gray-500 truncate mt-0.5">{acc.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

