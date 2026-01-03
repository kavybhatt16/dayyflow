import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const LeaveAdmin = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchLeaveRequests();
    }
  }, [user, role]);

  const fetchLeaveRequests = async () => {
    const { data } = await supabase
      .from('leave_requests')
      .select(`
        *,
        leave_types (name),
        profiles!leave_requests_user_id_fkey (
          first_name,
          last_name,
          employee_id,
          department
        )
      `)
      .order('created_at', { ascending: false });

    setLeaveRequests(data || []);
  };

  const handleReviewRequest = (request: any) => {
    setSelectedRequest(request);
    setComment('');
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;

    setIsProcessing(true);

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        admin_comment: comment,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', selectedRequest.id);

    // If approved, update attendance for the leave days
    if (status === 'approved' && !error) {
      const startDate = new Date(selectedRequest.start_date);
      const endDate = new Date(selectedRequest.end_date);
      const days = differenceInDays(endDate, startDate) + 1;

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        await supabase
          .from('attendance')
          .upsert({
            user_id: selectedRequest.user_id,
            date: format(date, 'yyyy-MM-dd'),
            status: 'leave'
          }, { onConflict: 'user_id,date' });
      }
    }

    setIsProcessing(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update leave request',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: `Leave request ${status}`
      });
      setIsDialogOpen(false);
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

  const pendingRequests = leaveRequests.filter(r => r.status === 'pending');
  const processedRequests = leaveRequests.filter(r => r.status !== 'pending');

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
            <h1 className="text-3xl font-bold">Leave Approvals</h1>
            <p className="text-muted-foreground">Review and manage leave requests</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Clock className="h-4 w-4 mr-2" />
            {pendingRequests.length} Pending
          </Badge>
        </div>

        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="processed">
              Processed ({processedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length > 0 ? (
              pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">
                          {request.profiles?.first_name} {request.profiles?.last_name}
                        </h3>
                        <Badge variant="outline">{request.leave_types?.name}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.profiles?.employee_id} • {request.profiles?.department || 'No department'}
                      </p>
                      <p className="text-sm mt-1">
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                        {' '}({differenceInDays(new Date(request.end_date), new Date(request.start_date)) + 1} days)
                      </p>
                      {request.remarks && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          "{request.remarks}"
                        </p>
                      )}
                    </div>
                    <Button onClick={() => handleReviewRequest(request)}>
                      Review
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">All Caught Up!</h3>
                  <p className="text-muted-foreground">No pending leave requests</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="processed" className="space-y-4">
            {processedRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  {request.status === 'approved' ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">
                        {request.profiles?.first_name} {request.profiles?.last_name}
                      </h3>
                      <Badge variant="outline">{request.leave_types?.name}</Badge>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                    </p>
                    {request.admin_comment && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {request.admin_comment}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Reviewed</p>
                    <p>{request.reviewed_at && format(new Date(request.reviewed_at), 'MMM d, yyyy')}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Leave Request</DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="font-medium">
                    {selectedRequest.profiles?.first_name} {selectedRequest.profiles?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.profiles?.employee_id}
                  </p>
                  <p className="text-sm">
                    <strong>Type:</strong> {selectedRequest.leave_types?.name}
                  </p>
                  <p className="text-sm">
                    <strong>Period:</strong> {format(new Date(selectedRequest.start_date), 'MMM d')} - {format(new Date(selectedRequest.end_date), 'MMM d, yyyy')}
                    ({differenceInDays(new Date(selectedRequest.end_date), new Date(selectedRequest.start_date)) + 1} days)
                  </p>
                  {selectedRequest.remarks && (
                    <p className="text-sm">
                      <strong>Remarks:</strong> {selectedRequest.remarks}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Comment (Optional)</label>
                  <Textarea
                    placeholder="Add a comment for the employee..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    onClick={() => handleUpdateStatus('approved')}
                    disabled={isProcessing}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleUpdateStatus('rejected')}
                    disabled={isProcessing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default LeaveAdmin;
