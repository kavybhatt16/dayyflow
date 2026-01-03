import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, CalendarIcon, Clock, CheckCircle, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

const Leave = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newRequest, setNewRequest] = useState({
    leave_type_id: '',
    start_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    remarks: ''
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchLeaveRequests();
      fetchLeaveTypes();
    }
  }, [user]);

  const fetchLeaveRequests = async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (name)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    setLeaveRequests(data || []);
  };

  const fetchLeaveTypes = async () => {
    const { data } = await supabase
      .from('leave_types')
      .select('*')
      .order('name');

    setLeaveTypes(data || []);
  };

  const handleSubmitRequest = async () => {
    if (!newRequest.leave_type_id || !newRequest.start_date || !newRequest.end_date) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    if (newRequest.end_date < newRequest.start_date) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase
      .from('leave_requests')
      .insert({
        user_id: user!.id,
        leave_type_id: newRequest.leave_type_id,
        start_date: format(newRequest.start_date, 'yyyy-MM-dd'),
        end_date: format(newRequest.end_date, 'yyyy-MM-dd'),
        remarks: newRequest.remarks
      });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Leave request submitted successfully'
      });
      setIsDialogOpen(false);
      setNewRequest({
        leave_type_id: '',
        start_date: undefined,
        end_date: undefined,
        remarks: ''
      });
      fetchLeaveRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Leave Requests</h1>
            <p className="text-muted-foreground">Apply and manage your leave requests</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Apply for Leave
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Apply for Leave</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Leave Type *</Label>
                  <Select
                    value={newRequest.leave_type_id}
                    onValueChange={(value) => setNewRequest({ ...newRequest, leave_type_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.days_per_year} days/year)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newRequest.start_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newRequest.start_date ? format(newRequest.start_date, "MMM d, yyyy") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newRequest.start_date}
                          onSelect={(date) => setNewRequest({ ...newRequest, start_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newRequest.end_date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newRequest.end_date ? format(newRequest.end_date, "MMM d, yyyy") : "Select"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={newRequest.end_date}
                          onSelect={(date) => setNewRequest({ ...newRequest, end_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Textarea
                    placeholder="Add any additional notes..."
                    value={newRequest.remarks}
                    onChange={(e) => setNewRequest({ ...newRequest, remarks: e.target.value })}
                  />
                </div>

                <Button 
                  onClick={handleSubmitRequest} 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Leave Requests List */}
        <div className="grid gap-4">
          {leaveRequests.length > 0 ? (
            leaveRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {getStatusIcon(request.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{request.leave_types?.name}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), 'MMM d, yyyy')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      {' '}({differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1} days)
                    </p>
                    {request.remarks && (
                      <p className="text-sm mt-1">{request.remarks}</p>
                    )}
                    {request.admin_comment && (
                      <p className="text-sm mt-2 text-muted-foreground italic">
                        Admin: {request.admin_comment}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Submitted</p>
                    <p>{format(new Date(request.created_at), 'MMM d, yyyy')}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-1">No Leave Requests</h3>
                <p className="text-muted-foreground mb-4">You haven't applied for any leave yet</p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Apply for Leave
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Leave;
