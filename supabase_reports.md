-- Table for Post Reports
CREATE TABLE IF NOT EXISTS post_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  reporter_email TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(post_id, reporter_email)
);

-- Note: Ensure RLS is disabled if you are not using it, or add policies.
ALTER TABLE post_reports DISABLE ROW LEVEL SECURITY;
