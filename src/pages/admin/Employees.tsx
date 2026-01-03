import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Search, Edit, Mail, Phone, Building } from 'lucide-react';
import { format } from 'date-fns';

const Employees = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState({
    department: '',
    position: '',
    phone: '',
    address: ''
  });

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

  const fetchEmployees = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        user_roles (role)
      `)
      .order('first_name');

    setEmployees(data || []);
  };

  const handleEditEmployee = (employee: any) => {
    setSelectedEmployee(employee);
    setEditData({
      department: employee.department || '',
      position: employee.position || '',
      phone: employee.phone || '',
      address: employee.address || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEmployee = async () => {
    if (!selectedEmployee) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(editData)
      .eq('id', selectedEmployee.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update employee',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Employee updated successfully'
      });
      setIsEditDialogOpen(false);
      fetchEmployees();
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold">Employees</h1>
            <p className="text-muted-foreground">Manage employee profiles</p>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Users className="h-4 w-4 mr-2" />
            {employees.length} Total
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or employee ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Employee List */}
        <div className="grid gap-4">
          {filteredEmployees.map((employee) => (
            <Card key={employee.id}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {employee.first_name?.[0]}{employee.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">{employee.first_name} {employee.last_name}</h3>
                    <Badge variant={employee.user_roles?.[0]?.role === 'admin' ? 'default' : 'secondary'}>
                      {employee.user_roles?.[0]?.role || 'employee'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {employee.email}
                    </span>
                    {employee.department && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {employee.department}
                      </span>
                    )}
                    {employee.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {employee.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>{employee.employee_id}</p>
                  <p>{employee.position || 'No position'}</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => handleEditEmployee(employee)}>
                  <Edit className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Edit Employee - {selectedEmployee?.first_name} {selectedEmployee?.last_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={editData.department}
                  onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                  placeholder="e.g., Engineering, Sales"
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  value={editData.position}
                  onChange={(e) => setEditData({ ...editData, position: e.target.value })}
                  placeholder="e.g., Software Engineer, Manager"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={editData.phone}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={editData.address}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
              <Button onClick={handleSaveEmployee} className="w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Employees;
