import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/auth.store';

export function SettingsPage() {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Settings</h1></div>
      <Card title="Profile">
        <div className="space-y-4 max-w-md">
          <Input label="First Name" defaultValue={user?.firstName} />
          <Input label="Last Name" defaultValue={user?.lastName} />
          <Input label="Email" defaultValue={user?.email} disabled />
          <Input label="Role" defaultValue={user?.role} disabled />
          <Button>Save Changes</Button>
        </div>
      </Card>
      <Card title="Security">
        <div className="space-y-4 max-w-md">
          <Input label="Current Password" type="password" />
          <Input label="New Password" type="password" />
          <Input label="Confirm Password" type="password" />
          <Button>Update Password</Button>
        </div>
      </Card>
    </div>
  );
}

