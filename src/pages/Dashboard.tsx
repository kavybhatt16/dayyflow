import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { User, Calendar, ClipboardList, DollarSign, Users, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user, role, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    todayAttendance: 0,
    checkedIn: false
  });
  const [todayAttendance, setTodayAttendance] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, role]);

  const fetchDashboardData = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');

    // Get today's attendance for current user
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user!.id)
      .eq('date', today)
      .maybeSingle();

    setTodayAttendance(attendance);

    if (role === 'admin') {
      // Admin stats
      const [employeesResult, leavesResult, attendanceResult] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }),
        supabase.from('leave_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('attendance').select('id', { count: 'exact' }).eq('date', today).eq('status', 'present')
      ]);

      setStats({
        totalEmployees: employeesResult.count || 0,
        pendingLeaves: leavesResult.count || 0,
        todayAttendance: attendanceResult.count || 0,
        checkedIn: !!attendance?.check_in
      });
    } else {
      // Employee stats
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('id', { count: 'exact' })
        .eq('user_id', user!.id)
        .eq('status', 'pending');

      setStats({
        totalEmployees: 0,
        pendingLeaves: leaves?.length || 0,
        todayAttendance: 0,
        checkedIn: !!attendance?.check_in
      });
    }
  };

  const handleCheckIn = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('attendance')
      .upsert({
        user_id: user!.id,
        date: today,
        check_in: now,
        status: 'present'
      }, { onConflict: 'user_id,date' });

    if (!error) {
      fetchDashboardData();
    }
  };

  const handleCheckOut = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('attendance')
      .update({ check_out: now })
      .eq('user_id', user!.id)
      .eq('date', today);

    if (!error) {
      fetchDashboardData();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome, {profile?.first_name}!
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isAdmin ? (
            <>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/employees')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalEmployees}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/leave-admin')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/attendance-admin')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.todayAttendance}</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/payroll-admin')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Payroll</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Manage</div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/profile')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Profile</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">View</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/attendance')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.checkedIn ? 'Checked In' : 'Not Checked In'}
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/leave')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Leave Requests</CardTitle>
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.pendingLeaves} pending</div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/payroll')}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Payroll</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">View</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Check In/Out Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Attendance
            </CardTitle>
            <CardDescription>
              {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 space-y-1">
                {todayAttendance?.check_in ? (
                  <p className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Checked in at {format(new Date(todayAttendance.check_in), 'hh:mm a')}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Not checked in yet</p>
                )}
                {todayAttendance?.check_out && (
                  <p className="flex items-center gap-2 text-blue-600">
                    <CheckCircle className="h-4 w-4" />
                    Checked out at {format(new Date(todayAttendance.check_out), 'hh:mm a')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!todayAttendance?.check_in ? (
                  <Button onClick={handleCheckIn}>
                    <Clock className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                ) : !todayAttendance?.check_out ? (
                  <Button onClick={handleCheckOut} variant="outline">
                    <Clock className="h-4 w-4 mr-2" />
                    Check Out
                  </Button>
                ) : (
                  <p className="text-muted-foreground">Completed for today</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
