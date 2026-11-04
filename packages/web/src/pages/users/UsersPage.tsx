import { useQuery } from '@tanstack/react-query';
import { usersService } from '../../services';
import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatRelative } from '../../utils/format';
import { Users, Search } from 'lucide-react';

export function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['users', page, search], queryFn: () => usersService.list({ page, pageSize: 20, search }) });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Users</h1><p className="text-gray-500">Manage platform users</p></div>
      <Card>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {data?.data?.length ? (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500"><th className="pb-3 font-medium">Name</th><th className="pb-3 font-medium">Email</th><th className="pb-3 font-medium">Role</th><th className="pb-3 font-medium">Status</th><th className="pb-3 font-medium">Last Login</th></tr></thead>
            <tbody>{data.data.map((u: any) => (
              <tr key={u.id} className="border-b border-gray-50"><td className="py-3 font-medium">{u.first_name} {u.last_name}</td><td className="py-3 text-gray-500">{u.email}</td><td className="py-3"><Badge variant="default">{u.role}</Badge></td><td className="py-3"><Badge variant="status" value={u.is_active ? 'active' : 'suspended'}>{u.is_active ? 'Active' : 'Inactive'}</Badge></td><td className="py-3 text-gray-500 text-xs">{u.last_login_at ? formatRelative(u.last_login_at) : '—'}</td></tr>
            ))}</tbody>
          </table>
        ) : <EmptyState icon={Users} title="No users found" />}
      </Card>
    </div>
  );
}

