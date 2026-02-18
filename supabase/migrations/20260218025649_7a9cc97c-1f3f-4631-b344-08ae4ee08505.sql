
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('director', 'musician');

-- Approval status
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Churches table
CREATE TABLE public.churches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  church_id UUID REFERENCES public.churches(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  bio TEXT,
  photo_url TEXT,
  instruments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  status approval_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, church_id, role)
);

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event musicians (scheduling)
CREATE TABLE public.event_musicians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  instrument TEXT,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  type TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Director votes
CREATE TABLE public.director_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(church_id, voter_id)
);

-- Enable RLS on all tables
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_musicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_votes ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has a specific role in a church
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role AND status = 'approved'
  )
$$;

-- Helper: check if user is director of a specific church
CREATE OR REPLACE FUNCTION public.is_director_of_church(_user_id UUID, _church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND church_id = _church_id AND role = 'director' AND status = 'approved'
  )
$$;

-- Helper: check if user is member of a church
CREATE OR REPLACE FUNCTION public.is_member_of_church(_user_id UUID, _church_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND church_id = _church_id AND status = 'approved'
  )
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_churches_updated_at BEFORE UPDATE ON public.churches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Profiles: users can see own profile, directors can see all in their church
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Directors can view church profiles" ON public.profiles FOR SELECT USING (
  church_id IS NOT NULL AND public.is_director_of_church(auth.uid(), church_id)
);
CREATE POLICY "Members can view church profiles" ON public.profiles FOR SELECT USING (
  church_id IS NOT NULL AND public.is_member_of_church(auth.uid(), church_id)
);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Churches: members can view their church
CREATE POLICY "Members can view their church" ON public.churches FOR SELECT USING (
  public.is_member_of_church(auth.uid(), id)
);
CREATE POLICY "Directors can update their church" ON public.churches FOR UPDATE USING (
  public.is_director_of_church(auth.uid(), id)
);
CREATE POLICY "Authenticated users can create churches" ON public.churches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- User roles: members can see roles in their church, directors can manage
CREATE POLICY "Members can view church roles" ON public.user_roles FOR SELECT USING (
  public.is_member_of_church(auth.uid(), church_id) OR user_id = auth.uid()
);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Directors can update roles in church" ON public.user_roles FOR UPDATE USING (
  public.is_director_of_church(auth.uid(), church_id)
);
CREATE POLICY "Directors can delete roles in church" ON public.user_roles FOR DELETE USING (
  public.is_director_of_church(auth.uid(), church_id)
);

-- Events
CREATE POLICY "Members can view church events" ON public.events FOR SELECT USING (
  public.is_member_of_church(auth.uid(), church_id)
);
CREATE POLICY "Directors can create events" ON public.events FOR INSERT WITH CHECK (
  public.is_director_of_church(auth.uid(), church_id)
);
CREATE POLICY "Directors can update events" ON public.events FOR UPDATE USING (
  public.is_director_of_church(auth.uid(), church_id)
);
CREATE POLICY "Directors can delete events" ON public.events FOR DELETE USING (
  public.is_director_of_church(auth.uid(), church_id)
);

-- Event musicians
CREATE POLICY "Members can view event musicians" ON public.event_musicians FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_member_of_church(auth.uid(), e.church_id))
);
CREATE POLICY "Directors can manage event musicians" ON public.event_musicians FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_director_of_church(auth.uid(), e.church_id))
);
CREATE POLICY "Directors can update event musicians" ON public.event_musicians FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_director_of_church(auth.uid(), e.church_id))
);
CREATE POLICY "Directors can delete event musicians" ON public.event_musicians FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND public.is_director_of_church(auth.uid(), e.church_id))
);

-- Notifications: users can only see their own
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Authenticated can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Director votes
CREATE POLICY "Members can view church votes" ON public.director_votes FOR SELECT USING (
  public.is_member_of_church(auth.uid(), church_id)
);
CREATE POLICY "Members can cast votes" ON public.director_votes FOR INSERT WITH CHECK (
  voter_id = auth.uid() AND public.is_member_of_church(auth.uid(), church_id)
);
CREATE POLICY "Voters can update own vote" ON public.director_votes FOR UPDATE USING (
  voter_id = auth.uid()
);
CREATE POLICY "Voters can delete own vote" ON public.director_votes FOR DELETE USING (
  voter_id = auth.uid()
);
