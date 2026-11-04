import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import {
  LayoutDashboard, Package, Boxes, ArrowLeftRight, QrCode, Warehouse,
  ShieldAlert, Search as SearchIcon, AlertTriangle, Users, Building2, BarChart3,
  Settings, Bell, Menu, X, LogOut, ChevronDown, Leaf,
} from 'lucide-react';

const roleNavItems: Record<string, { label: string; icon: any; path: string }[]> = {
  platform_admin: [
    { label: 'Overview', icon: LayoutDashboard, path: '/' },
    { label: 'Organizations', icon: Building2, path: '/tenants' },
    { label: 'Users', icon: Users, path: '/users' },
    { label: 'Risk Management', icon: ShieldAlert, path: '/risk' },
    { label: 'Investigations', icon: SearchIcon, path: '/investigations' },
    { label: 'Alerts', icon: AlertTriangle, path: '/alerts' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics' },
    { label: 'Settings', icon: Settings, path: '/settings' },
  ],
  manufacturer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Products', icon: Package, path: '/products' },
    { label: 'Batches', icon: Boxes, path: '/batches' },
    { label: 'QR Codes', icon: QrCode, path: '/qr' },
    { label: 'Inventory', icon: Warehouse, path: '/inventory' },
    { label: 'Transfers', icon: ArrowLeftRight, path: '/transfers' },
    { label: 'Risk Alerts', icon: ShieldAlert, path: '/risk' },
    { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  ],
  distributor: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Incoming', icon: Boxes, path: '/transfers' },
    { label: 'Inventory', icon: Warehouse, path: '/inventory' },
    { label: 'Transfers', icon: ArrowLeftRight, path: '/transfers' },
    { label: 'Alerts', icon: AlertTriangle, path: '/alerts' },
  ],
  retailer: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Inventory', icon: Warehouse, path: '/inventory' },
    { label: 'Received', icon: Boxes, path: '/transfers' },
    { label: 'Alerts', icon: AlertTriangle, path: '/alerts' },
  ],
};

export function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const navItems = roleNavItems[user?.role || 'manufacturer'] || roleNavItems.manufacturer;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 transform transition-transform lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="p-2 bg-green-600 rounded-lg"><Leaf className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-lg font-bold text-white">SmartSeed</h1>
            <p className="text-xs text-gray-400">{user?.tenant_name || 'Platform'}</p>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-green-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'}`}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/notifications" className="relative p-2 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-green-700">{user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}</span>
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.firstName} {user?.lastName}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-1 z-50">
                  <div className="px-4 py-2 border-b"><p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p><p className="text-xs text-gray-500">{user?.role}</p></div>
                  <Link to="/settings" className="block px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Settings</Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

