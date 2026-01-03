import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';

const Attendance = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [view, setView] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user, selectedDate, view]);

  const fetchAttendance = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Get today's attendance
    const { data: todayData } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user!.id)
      .eq('date', today)
      .maybeSingle();
    
    setTodayAttendance(todayData);

    // Get attendance for selected period
    let startDate: Date, endDate: Date;
    if (view === 'weekly') {
      startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
      endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
    } else {
      startDate = startOfMonth(selectedDate);
      endDate = endOfMonth(selectedDate);
    }

    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('user_id', user!.id)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))
      .order('date', { ascending: false });

    setAttendance(data || []);
  };

  const handleCheckIn = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    await supabase
      .from('attendance')
      .upsert({
        user_id: user!.id,
        date: today,
        check_in: now,
        status: 'present'
      }, { onConflict: 'user_id,date' });

    fetchAttendance();
  };

  const handleCheckOut = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date().toISOString();

    await supabase
      .from('attendance')
      .update({ check_out: now })
      .eq('user_id', user!.id)
      .eq('date', today);

    fetchAttendance();
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'half-day':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
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
          <h1 className="text-3xl font-bold">My Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance</p>
        </div>

        {/* Today's Check In/Out */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today - {format(new Date(), 'EEEE, MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1 space-y-2">
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
                  <Badge className="bg-green-500">Completed</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Toggle */}
        <div className="flex gap-2">
          <Button 
            variant={view === 'daily' ? 'default' : 'outline'}
            onClick={() => setView('daily')}
          >
            Monthly View
          </Button>
          <Button 
            variant={view === 'weekly' ? 'default' : 'outline'}
            onClick={() => setView('weekly')}
          >
            Weekly View
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
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

          {/* Attendance List */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
              <CardDescription>
                {view === 'weekly' 
                  ? `Week of ${format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
                  : format(selectedDate, 'MMMM yyyy')
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {attendance.length > 0 ? (
                  attendance.map((record) => (
                    <div 
                      key={record.id} 
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium">
                            {format(new Date(record.date), 'EEEE, MMM d')}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.check_in && `In: ${format(new Date(record.check_in), 'hh:mm a')}`}
                            {record.check_out && ` | Out: ${format(new Date(record.check_out), 'hh:mm a')}`}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(record.status)}
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

export default Attendance;
