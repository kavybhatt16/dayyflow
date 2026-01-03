import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, Calendar, ClipboardList, DollarSign, Shield } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const features = [
    { icon: Users, title: 'Employee Management', description: 'Manage employee profiles and departments' },
    { icon: Calendar, title: 'Attendance Tracking', description: 'Track check-ins and attendance history' },
    { icon: ClipboardList, title: 'Leave Management', description: 'Apply for leave and manage approvals' },
    { icon: DollarSign, title: 'Payroll Visibility', description: 'View salary structure and deductions' },
    { icon: Shield, title: 'Role-Based Access', description: 'Secure Admin and Employee roles' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Clock className="h-12 w-12 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold">DayFlow</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-2">Human Resource Management System</p>
          <p className="text-2xl font-medium text-primary mb-8">Every workday, perfectly aligned.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>Get Started</Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>Sign In</Button>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;
