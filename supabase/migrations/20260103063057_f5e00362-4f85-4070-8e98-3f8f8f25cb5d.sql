-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create user_roles table for role-based access
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'employee',
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    employee_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    profile_picture TEXT,
    department TEXT,
    position TEXT,
    hire_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create attendance table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT CHECK (status IN ('present', 'absent', 'half-day', 'leave')) DEFAULT 'absent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, date)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Create leave_types table
CREATE TABLE public.leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    days_per_year INTEGER DEFAULT 0
);

-- Insert default leave types
INSERT INTO public.leave_types (name, description, days_per_year) VALUES
    ('Paid Leave', 'Annual paid leave', 20),
    ('Sick Leave', 'Medical/sick leave', 10),
    ('Unpaid Leave', 'Leave without pay', 0);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    leave_type_id UUID REFERENCES public.leave_types(id) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remarks TEXT,
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    admin_comment TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Create payroll table
CREATE TABLE public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
    allowances DECIMAL(12, 2) DEFAULT 0,
    deductions DECIMAL(12, 2) DEFAULT 0,
    net_salary DECIMAL(12, 2) GENERATED ALWAYS AS (basic_salary + allowances - deductions) STORED,
    effective_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for attendance
CREATE POLICY "Users can view their own attendance" ON public.attendance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attendance" ON public.attendance
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own attendance" ON public.attendance
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all attendance" ON public.attendance
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leave_requests
CREATE POLICY "Users can view their own leave requests" ON public.leave_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leave requests" ON public.leave_requests
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create leave requests" ON public.leave_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all leave requests" ON public.leave_requests
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payroll
CREATE POLICY "Users can view their own payroll" ON public.payroll
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all payroll" ON public.payroll
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all payroll" ON public.payroll
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger function to auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_employee_id TEXT;
    user_role app_role;
BEGIN
    -- Generate employee ID
    new_employee_id := 'EMP' || LPAD(EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT, 10, '0');
    
    -- Determine role from metadata or default to employee
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::app_role,
        'employee'
    );
    
    -- Create profile
    INSERT INTO public.profiles (user_id, employee_id, email, first_name, last_name)
    VALUES (
        NEW.id,
        new_employee_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'User')
    );
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role);
    
    -- Create initial payroll record
    INSERT INTO public.payroll (user_id, basic_salary)
    VALUES (NEW.id, 0);
    
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Update triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at
    BEFORE UPDATE ON public.payroll
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();