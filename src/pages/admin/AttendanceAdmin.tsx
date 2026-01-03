import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Users } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

const AttendanceAdmin = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [view, setView] = useState<'daily' | 'weekly'>('daily');
  const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0 });

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchEmployees();
    }
  }, [user, role]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchAttendance();
    }
  }, [user, role, selectedDate, selectedEmployee, view]);

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('first_name');
    setEmployees(data || []);
  };

  const fetchAttendance = async () => {
    let startDate: Date, endDate: Date;
    
    if (view === 'weekly') {
      startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
      endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else {
      startDate = selectedDate;
      endDate = selectedDate;
    }

    let query = supabase
      .from('attendance')
      .select(`
        *,
        profiles!attendance_user_id_fkey (
          first_name,
          last_name,
          employee_id,
          department
        )
      `)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('date', { ascending: false });

    if (selectedEmployee !== 'all') {
      query = query.eq('user_id', selectedEmployee);
    }

    const { data } = await query;
    setAttendance(data || []);

    // Calculate stats for selected date
    const todayData = (data || []).filter(a => a.date === format(selectedDate, 'yyyy-MM-dd'));
    setStats({
      present: todayData.filter(a => a.status === 'present').length,
      absent: employees.length - todayData.filter(a => a.status === 'present' || a.status === 'leave').length,
      leave: todayData.filter(a => a.status === 'leave').length
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500">Present</Badge>;
      case 'absent':
        return <Badge variant="destructive">Absent</Badge>;
      case 'half-day':
        return <Badge variant="secondary">Half-day</Badge>;
      case 'leave':
        return <Badge variant="outline">Leave</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Attendance Management</h1>
          <p className="text-muted-foreground">View and manage employee attendance</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Present Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">On Leave</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.leave}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex gap-2">
            <Button 
              variant={view === 'daily' ? 'default' : 'outline'}
              onClick={() => setView('daily')}
            >
              Daily
            </Button>
            <Button 
              variant={view === 'weekly' ? 'default' : 'outline'}
              onClick={() => setView('weekly')}
            >
              Weekly
            </Button>
          </div>
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.user_id} value={emp.user_id}>
                  {emp.first_name} {emp.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Attendance Records */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {view === 'weekly' 
                  ? `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                  : format(selectedDate, 'EEEE, MMMM d, yyyy')
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {attendance.length > 0 ? (
                  attendance.map((record) => (
                    <div 
                      key={record.id} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">
                            {record.profiles?.first_name?.[0]}{record.profiles?.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">
                            {record.profiles?.first_name} {record.profiles?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.profiles?.employee_id} • {format(new Date(record.date), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mb-1">{getStatusBadge(record.status)}</div>
                        <p className="text-xs text-muted-foreground">
                          {record.check_in && `In: ${format(new Date(record.check_in), 'hh:mm a')}`}
                          {record.check_out && ` | Out: ${format(new Date(record.check_out), 'hh:mm a')}`}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No attendance records for this period
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AttendanceAdmin;
