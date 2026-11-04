import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { authService } from '../../services';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: '', slug: '', contactEmail: '', contactPhone: '', address: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '',
    subscriptionPlan: 'starter',
  });

  const update = (field: string, value: string) => setForm({ ...form, [field]: value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep(step + 1); return; }
    setLoading(true);
    try {
      const data = await authService.register(form);
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success('Organization registered!');
      navigate('/');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold">Register Organization</h2>
        <p className="text-sm text-gray-500 mt-1">Step {step} of 3</p>
        <div className="flex gap-1 mt-3">{[1,2,3].map(s => <div key={s} className={`h-1 flex-1 rounded ${s <= step ? 'bg-green-600' : 'bg-gray-200'}`} />)}</div>
      </div>

      {step === 1 && <>
        <Input label="Company Name" value={form.companyName} onChange={e => update('companyName', e.target.value)} required />
        <Input label="URL Slug" value={form.slug} onChange={e => update('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} helperText="e.g., greengrow-seeds" required />
        <Input label="Contact Email" type="email" value={form.contactEmail} onChange={e => update('contactEmail', e.target.value)} required />
        <Input label="Phone (optional)" value={form.contactPhone} onChange={e => update('contactPhone', e.target.value)} />
      </>}

      {step === 2 && <>
        <Input label="Admin First Name" value={form.adminFirstName} onChange={e => update('adminFirstName', e.target.value)} required />
        <Input label="Admin Last Name" value={form.adminLastName} onChange={e => update('adminLastName', e.target.value)} required />
        <Input label="Admin Email" type="email" value={form.adminEmail} onChange={e => update('adminEmail', e.target.value)} required />
        <Input label="Password" type="password" value={form.adminPassword} onChange={e => update('adminPassword', e.target.value)} helperText="Min 8 chars, uppercase, lowercase, number, special char" required />
      </>}

      {step === 3 && <>
        <Select label="Subscription Plan" value={form.subscriptionPlan} onChange={e => update('subscriptionPlan', e.target.value)} options={[
          { value: 'starter', label: 'Starter — 10 users, 100 batches/month' },
          { value: 'professional', label: 'Professional — 50 users, 500 batches/month' },
          { value: 'enterprise', label: 'Enterprise — 200 users, 5000 batches/month' },
        ]} />
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
          <p className="font-medium text-gray-900 mb-2">Summary</p>
          <p>Company: {form.companyName}</p>
          <p>Admin: {form.adminFirstName} {form.adminLastName} ({form.adminEmail})</p>
        </div>
      </>}

      <div className="flex gap-3">
        {step > 1 && <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
        <Button type="submit" loading={loading} className="flex-1">{step < 3 ? 'Next' : 'Register'}</Button>
      </div>
      <p className="text-center text-sm text-gray-500">Already registered? <Link to="/login" className="text-green-600 font-medium hover:underline">Sign in</Link></p>
    </form>
  );
}

