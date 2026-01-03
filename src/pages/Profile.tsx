import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Briefcase, Building, Phone, MapPin, Calendar, Mail, Save } from 'lucide-react';
import { format } from 'date-fns';

const Profile = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: ''
  });
  const [payroll, setPayroll] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (profile) {
      setFormData({
        phone: profile.phone || '',
        address: profile.address || ''
      });
    }
  }, [profile]);

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

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        phone: formData.phone,
        address: formData.address
      })
      .eq('user_id', user!.id);

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      });
      setIsEditing(false);
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
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">View and manage your profile information</p>
          </div>
          <Button 
            variant={isEditing ? "outline" : "default"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">First Name</Label>
                  <p className="font-medium">{profile?.first_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Name</Label>
                  <p className="font-medium">{profile?.last_name}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </Label>
                <p className="font-medium">{profile?.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Phone
                </Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                ) : (
                  <p className="font-medium">{profile?.phone || 'Not set'}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Address
                </Label>
                {isEditing ? (
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                    rows={2}
                  />
                ) : (
                  <p className="font-medium">{profile?.address || 'Not set'}</p>
                )}
              </div>
              {isEditing && (
                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Employee ID</Label>
                <p className="font-medium">{profile?.employee_id}</p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" /> Department
                </Label>
                <p className="font-medium">{profile?.department || 'Not assigned'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Position</Label>
                <p className="font-medium">{profile?.position || 'Not assigned'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Hire Date
                </Label>
                <p className="font-medium">
                  {profile?.hire_date ? format(new Date(profile.hire_date), 'MMMM d, yyyy') : 'Not set'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Salary Structure */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Salary Structure
              </CardTitle>
              <CardDescription>Read-only salary information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-muted-foreground text-sm">Basic Salary</Label>
                  <p className="text-xl font-bold">
                    ${payroll?.basic_salary?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-muted-foreground text-sm">Allowances</Label>
                  <p className="text-xl font-bold text-green-600">
                    +${payroll?.allowances?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-muted-foreground text-sm">Deductions</Label>
                  <p className="text-xl font-bold text-red-600">
                    -${payroll?.deductions?.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <Label className="text-muted-foreground text-sm">Net Salary</Label>
                  <p className="text-xl font-bold text-primary">
                    ${payroll?.net_salary?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
