import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../services';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatRelative } from '../../utils/format';
import { Users, Search, Plus, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'distributor',
    phone: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search],
    queryFn: () => usersService.list({ page, pageSize: 20, search }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: typeof form) => usersService.create(formData),
    onSuccess: (newUser) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['users-all'] });
      toast.success(`User ${newUser.first_name} (${newUser.role}) created successfully!`);
      setShowAddModal(false);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'distributor',
        phone: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.role) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    createMutation.mutate(form);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'platform_admin': return 'danger';
      case 'manufacturer': return 'success';
      case 'distributor': return 'warning';
      case 'wholesaler': return 'warning';
      case 'retailer': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users & Roles</h1>
          <p className="text-gray-500">Manage distributors, wholesalers, retailers, and staff in your organization network</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add User / Role
        </Button>
      </div>

      <Card>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-white"
            placeholder="Search users by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {data?.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Phone</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u: any) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{u.first_name} {u.last_name}</td>
                    <td className="py-3 text-gray-600">{u.email}</td>
                    <td className="py-3">
                      <Badge variant={getRoleBadgeVariant(u.role)}>
                        {u.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-500">{u.phone || '—'}</td>
                    <td className="py-3">
                      <Badge variant="status" value={u.is_active ? 'active' : 'suspended'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-500 text-xs">
                      {u.last_login_at ? formatRelative(u.last_login_at) : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No users found"
            description="Add your first distributor or retailer to begin supply chain transfers."
            actionLabel="Add User"
            onAction={() => setShowAddModal(true)}
          />
        )}
      </Card>

      {/* Add User Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add User to Organization Network">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-green-50 text-green-800 p-3 rounded-lg text-xs flex items-start gap-2">
            <UserCheck className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <p>
              Users created here (e.g. <strong>Distributors</strong> or <strong>Retailers</strong>) can log into the platform with the email & password you set, and will immediately be available as transfer receivers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={e => setForm({ ...form, firstName: e.target.value })}
              placeholder="e.g. Ramesh"
              required
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={e => setForm({ ...form, lastName: e.target.value })}
              placeholder="e.g. Kumar"
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            placeholder="ramesh.distributor@example.com"
            required
          />

          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            placeholder="Min. 8 characters"
            helperText="The user will use this password to sign into their portal."
            required
          />

          <Select
            label="Supply Chain Role"
            value={form.role}
            onChange={e => setForm({ ...form, role: e.target.value })}
            options={[
              { value: 'distributor', label: 'Distributor (Receives from Manufacturer & transfers to Retailer)' },
              { value: 'retailer', label: 'Retailer (Receives stock & sells directly to farmers)' },
              { value: 'wholesaler', label: 'Wholesaler (Intermediary bulk distributor)' },
              { value: 'manufacturer', label: 'Manufacturer Staff (Can register batches and products)' },
              { value: 'auditor', label: 'Auditor (Read-only compliance & verification access)' },
            ]}
          />

          <Input
            label="Phone (optional)"
            value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            placeholder="+91-9876543210"
          />

          <div className="flex justify-end gap-3 pt-3 border-t">
            <Button variant="outline" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
