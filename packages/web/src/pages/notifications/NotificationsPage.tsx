import { useQuery } from '@tanstack/react-query';
import { notificationsService } from '../../services';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageLoader } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatRelative } from '../../utils/format';
import { Bell, Check } from 'lucide-react';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['notifications'], queryFn: () => notificationsService.list({ pageSize: 50 }) });
  const markAllMutation = useMutation({ mutationFn: () => notificationsService.markAllAsRead(), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const markOneMutation = useMutation({ mutationFn: (id: string) => notificationsService.markAsRead(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Notifications</h1></div>
        <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()}><Check className="w-4 h-4" /> Mark all read</Button>
      </div>
      <Card>
        {data?.data?.length ? (
          <div className="divide-y">{data.data.map((n: any) => (
            <div key={n.id} className={`py-3 flex items-start gap-3 ${!n.is_read ? 'bg-green-50/50' : ''}`}>
              <div className={`w-2 h-2 rounded-full mt-2 ${n.is_read ? 'bg-gray-300' : 'bg-green-500'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-sm text-gray-500">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
              </div>
              {!n.is_read && <button className="text-xs text-green-600 hover:underline" onClick={() => markOneMutation.mutate(n.id)}>Mark read</button>}
            </div>
          ))}</div>
        ) : <EmptyState icon={Bell} title="No notifications" description="You're all caught up" />}
      </Card>
    </div>
  );
}

