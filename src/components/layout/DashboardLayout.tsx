import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Clock,
  Home,
  User,
  Calendar,
  ClipboardList,
  DollarSign,
  Users,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { role, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = role === 'admin';

  const employeeLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/attendance', label: 'Attendance', icon: Calendar },
    { href: '/leave', label: 'Leave Requests', icon: ClipboardList },
    { href: '/payroll', label: 'Payroll', icon: DollarSign },
  ];

  const adminLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/employees', label: 'Employees', icon: Users },
    { href: '/attendance-admin', label: 'Attendance', icon: Calendar },
    { href: '/leave-admin', label: 'Leave Approvals', icon: ClipboardList },
    { href: '/payroll-admin', label: 'Payroll', icon: DollarSign },
    { href: '/profile', label: 'My Profile', icon: User },
  ];

  const links = isAdmin ? adminLinks : employeeLinks;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-2 p-4 border-b">
            <Clock className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">DayFlow</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* User info */}
          <div className="p-4 border-b">
            <p className="font-medium truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-sm text-muted-foreground capitalize">{role}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-4 p-4 border-b bg-card">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            <span className="font-bold">DayFlow</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
