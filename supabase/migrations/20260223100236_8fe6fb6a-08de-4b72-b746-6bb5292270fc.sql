
-- Create announcements table
CREATE TABLE public.announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general_news',
  priority text NOT NULL DEFAULT 'normal',
  target_audience text NOT NULL DEFAULT 'all_members',
  status text NOT NULL DEFAULT 'draft',
  attachment_url text,
  attachment_name text,
  created_by uuid NOT NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create announcement reads tracking table
CREATE TABLE public.announcement_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Announcements RLS policies
-- Authorized roles can create announcements (PRO, President, General Secretary, Admin)
CREATE POLICY "Authorized roles can insert announcements"
ON public.announcements FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    public.has_role(auth.uid(), 'general_secretary') OR
    public.has_role(auth.uid(), 'pro')
  )
);

CREATE POLICY "Authorized roles can update announcements"
ON public.announcements FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'president') OR
  public.has_role(auth.uid(), 'general_secretary') OR
  public.has_role(auth.uid(), 'pro')
);

CREATE POLICY "Authorized roles can delete announcements"
ON public.announcements FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'president') OR
  public.has_role(auth.uid(), 'general_secretary') OR
  public.has_role(auth.uid(), 'pro')
);

-- All authenticated users can view published announcements
CREATE POLICY "Users can view published announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (
  status = 'published' OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'president') OR
  public.has_role(auth.uid(), 'general_secretary') OR
  public.has_role(auth.uid(), 'pro')
);

-- Announcement reads RLS policies
CREATE POLICY "Users can insert own reads"
ON public.announcement_reads FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reads"
ON public.announcement_reads FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins/authorized can view all reads for analytics
CREATE POLICY "Authorized roles can view all reads"
ON public.announcement_reads FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'president') OR
  public.has_role(auth.uid(), 'general_secretary') OR
  public.has_role(auth.uid(), 'pro')
);

-- Create storage bucket for announcement attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('announcement-attachments', 'announcement-attachments', false);

-- Storage policies for announcement attachments
CREATE POLICY "Authorized roles can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcement-attachments' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    public.has_role(auth.uid(), 'general_secretary') OR
    public.has_role(auth.uid(), 'pro')
  )
);

CREATE POLICY "Authenticated users can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'announcement-attachments');

CREATE POLICY "Authorized roles can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcement-attachments' AND (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'president') OR
    public.has_role(auth.uid(), 'general_secretary') OR
    public.has_role(auth.uid(), 'pro')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
