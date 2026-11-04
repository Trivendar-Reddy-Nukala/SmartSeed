import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';

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
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}

