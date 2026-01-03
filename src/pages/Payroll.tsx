import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { format } from 'date-fns';

const Payroll = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [payroll, setPayroll] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPayroll();
    }
  }, [user]);

  const fetchPayroll = async () => {
    const { data } = await supabase
      .from('payroll')
      .select('*')
      .eq('user_id', user!.id)
      .maybeSingle();

    setPayroll(data);
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
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">My Payroll</h1>
          <p className="text-muted-foreground">View your salary details</p>
        </div>

        {/* Employee Info */}
        <Card>
          <CardHeader>
            <CardTitle>Employee Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Employee ID</p>
                <p className="font-medium">{profile?.employee_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{profile?.department || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Position</p>
                <p className="font-medium">{profile?.position || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Basic Salary</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${payroll?.basic_salary?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">Per month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Allowances</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +${payroll?.allowances?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">Total allowances</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Deductions</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                -${payroll?.deductions?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">Total deductions</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Net Salary</CardTitle>
              <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                ${payroll?.net_salary?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">Take home</p>
            </CardContent>
          </Card>
        </div>

        {/* Salary Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Breakdown</CardTitle>
            <CardDescription>
              Effective from {payroll?.effective_date ? format(new Date(payroll.effective_date), 'MMMM d, yyyy') : 'N/A'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span>Basic Salary</span>
                <span className="font-medium">${payroll?.basic_salary?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-green-600">
                <span>Allowances (+)</span>
                <span className="font-medium">${payroll?.allowances?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b text-red-600">
                <span>Deductions (-)</span>
                <span className="font-medium">${payroll?.deductions?.toLocaleString() || '0'}</span>
              </div>
              <div className="flex justify-between items-center py-3 bg-muted rounded-lg px-4">
                <span className="font-bold">Net Salary</span>
                <span className="font-bold text-lg text-primary">${payroll?.net_salary?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          For any queries regarding your salary, please contact HR.
        </p>
      </div>
    </DashboardLayout>
  );
};

export default Payroll;
