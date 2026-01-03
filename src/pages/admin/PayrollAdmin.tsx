import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Edit, Search, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

const PayrollAdmin = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    basic_salary: 0,
    allowances: 0,
    deductions: 0
  });

  useEffect(() => {
    if (!loading && (!user || role !== 'admin')) {
      navigate('/dashboard');
    }
  }, [user, role, loading, navigate]);

  useEffect(() => {
    if (user && role === 'admin') {
      fetchPayrollData();
    }
  }, [user, role]);

  const fetchPayrollData = async () => {
    const { data } = await supabase
      .from('payroll')
      .select(`
        *,
        profiles!payroll_user_id_fkey (
          first_name,
          last_name,
          employee_id,
          department,
          position
        )
      `)
      .order('created_at', { ascending: false });

    setPayrollData(data || []);
  };

  const handleEditPayroll = (payroll: any) => {
    setSelectedPayroll(payroll);
    setEditData({
      basic_salary: payroll.basic_salary || 0,
      allowances: payroll.allowances || 0,
      deductions: payroll.deductions || 0
    });
    setIsDialogOpen(true);
  };

  const handleSavePayroll = async () => {
    if (!selectedPayroll) return;

    setIsSaving(true);

    const { error } = await supabase
      .from('payroll')
      .update({
        basic_salary: editData.basic_salary,
        allowances: editData.allowances,
        deductions: editData.deductions,
        effective_date: format(new Date(), 'yyyy-MM-dd')
      })
      .eq('id', selectedPayroll.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update payroll',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Payroll updated successfully'
      });
      setIsDialogOpen(false);
      fetchPayrollData();
    }
  };

  const filteredPayroll = payrollData.filter(p => 
    p.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.profiles?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPayroll = payrollData.reduce((sum, p) => sum + (p.net_salary || 0), 0);

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
          <h1 className="text-3xl font-bold">Payroll Management</h1>
          <p className="text-muted-foreground">Manage employee salaries</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payrollData.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Monthly Payroll</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${totalPayroll.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${payrollData.length > 0 ? Math.round(totalPayroll / payrollData.length).toLocaleString() : 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Payroll List */}
        <div className="space-y-4">
          {filteredPayroll.map((payroll) => (
            <Card key={payroll.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {payroll.profiles?.first_name?.[0]}{payroll.profiles?.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">
                      {payroll.profiles?.first_name} {payroll.profiles?.last_name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {payroll.profiles?.employee_id} • {payroll.profiles?.position || 'No position'} • {payroll.profiles?.department || 'No department'}
                  </p>
                </div>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Basic</p>
                    <p className="font-medium">${payroll.basic_salary?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Allowances</p>
                    <p className="font-medium text-green-600">+${payroll.allowances?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Deductions</p>
                    <p className="font-medium text-red-600">-${payroll.deductions?.toLocaleString() || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className="font-bold text-primary">${payroll.net_salary?.toLocaleString() || 0}</p>
                  </div>
                </div>
                <Button variant="outline" size="icon" onClick={() => handleEditPayroll(payroll)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit Payroll - {selectedPayroll?.profiles?.first_name} {selectedPayroll?.profiles?.last_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Basic Salary ($)</Label>
                <Input
                  type="number"
                  value={editData.basic_salary}
                  onChange={(e) => setEditData({ ...editData, basic_salary: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Allowances ($)</Label>
                <Input
                  type="number"
                  value={editData.allowances}
                  onChange={(e) => setEditData({ ...editData, allowances: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Deductions ($)</Label>
                <Input
                  type="number"
                  value={editData.deductions}
                  onChange={(e) => setEditData({ ...editData, deductions: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Net Salary</p>
                <p className="text-2xl font-bold text-primary">
                  ${(editData.basic_salary + editData.allowances - editData.deductions).toLocaleString()}
                </p>
              </div>
              <Button onClick={handleSavePayroll} className="w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PayrollAdmin;
