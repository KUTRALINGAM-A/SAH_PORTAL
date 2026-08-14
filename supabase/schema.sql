-- ============================================================
-- Smart Amrita Hackathon 2026 — Complete Supabase Schema
-- Execute this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ============================================================
-- 1. PROFILES TABLE (Extended)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    roll_no TEXT UNIQUE,                         -- Format: AM.CH.U4CSE22001 (Students only, NULL for Admin/Judge/SPOC)
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    gender TEXT CHECK (gender IN ('Male', 'Female', 'Other')) NOT NULL,
    campus TEXT DEFAULT 'Amrita Chennai' NOT NULL,
    department TEXT NOT NULL,
    skills TEXT[] DEFAULT '{}',
    role TEXT CHECK (role IN ('student', 'admin', 'judge', 'spoc')) DEFAULT 'student',
    phone TEXT,
    year_of_study TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PROBLEM STATEMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS problem_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ps_code TEXT UNIQUE NOT NULL,                -- e.g. SAH2026_PS01
    title TEXT NOT NULL,
    category TEXT CHECK (category IN ('Software', 'Hardware')) NOT NULL,
    organization TEXT NOT NULL,
    domain TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. TEAMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_name TEXT UNIQUE NOT NULL,
    campus TEXT DEFAULT 'Amrita Chennai' NOT NULL,
    leader_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    ps_id UUID REFERENCES problem_statements(id),
    needed_skills TEXT[] DEFAULT '{}',
    is_open_for_recruitment BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    is_spoc_verified BOOLEAN DEFAULT FALSE,
    ppt_url TEXT,
    github_url TEXT,
    video_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TEAM MEMBERS JUNCTION TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    member_role TEXT DEFAULT 'Member' NOT NULL,   -- 'Leader' or 'Member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, student_id)
);

-- ============================================================
-- 5. JOIN REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS join_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    message TEXT,
    status TEXT CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, student_id)
);

-- ============================================================
-- 5b. TEAM INVITATIONS TABLE (Leader invites student)
-- ============================================================
CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, student_id)
);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read invitations" ON team_invitations;
DROP POLICY IF EXISTS "Insert invitations" ON team_invitations;
DROP POLICY IF EXISTS "Update invitations" ON team_invitations;
DROP POLICY IF EXISTS "Delete invitations" ON team_invitations;

CREATE POLICY "Read invitations" ON team_invitations FOR SELECT USING (true);
CREATE POLICY "Insert invitations" ON team_invitations FOR INSERT WITH CHECK (true);
CREATE POLICY "Update invitations" ON team_invitations FOR UPDATE USING (true);
CREATE POLICY "Delete invitations" ON team_invitations FOR DELETE USING (true);

-- ============================================================
-- 6. EVALUATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    judge_id UUID REFERENCES profiles(id) ON DELETE RESTRICT NOT NULL,
    understanding_score INT CHECK (understanding_score BETWEEN 0 AND 25) NOT NULL,
    execution_score INT CHECK (execution_score BETWEEN 0 AND 30) NOT NULL,
    impact_score INT CHECK (impact_score BETWEEN 0 AND 25) NOT NULL,
    pitch_score INT CHECK (pitch_score BETWEEN 0 AND 20) NOT NULL,
    total_raw INT GENERATED ALWAYS AS (understanding_score + execution_score + impact_score + pitch_score) STORED,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, judge_id)
);

-- ============================================================
-- 7. NOTIFICATIONS TABLE (New — for Realtime bell)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,                          -- 'join_request', 'request_accepted', 'request_declined', 'team_locked', 'team_verified'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',                 -- Extra data (team_id, request_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (Idempotent with DROP POLICY IF EXISTS)
-- ============================================================

-- Profiles
DROP POLICY IF EXISTS "Public Read Profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Public Read Profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (true);

-- Problem Statements
DROP POLICY IF EXISTS "Public Read PS" ON problem_statements;
DROP POLICY IF EXISTS "Admin Insert PS" ON problem_statements;
DROP POLICY IF EXISTS "Admin Update PS" ON problem_statements;
DROP POLICY IF EXISTS "Admin Delete PS" ON problem_statements;
CREATE POLICY "Public Read PS" ON problem_statements FOR SELECT USING (true);
CREATE POLICY "Admin Insert PS" ON problem_statements FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin Update PS" ON problem_statements FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admin Delete PS" ON problem_statements FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Teams
DROP POLICY IF EXISTS "Public Read Teams" ON teams;
DROP POLICY IF EXISTS "Authenticated Insert Teams" ON teams;
DROP POLICY IF EXISTS "Leader Update Teams" ON teams;
CREATE POLICY "Public Read Teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Authenticated Insert Teams" ON teams FOR INSERT WITH CHECK (auth.uid() = leader_id);
CREATE POLICY "Leader Update Teams" ON teams FOR UPDATE USING (auth.uid() = leader_id);

-- Team Members
DROP POLICY IF EXISTS "Public Read Members" ON team_members;
DROP POLICY IF EXISTS "Leader or self Insert Members" ON team_members;
DROP POLICY IF EXISTS "Leader Delete Members" ON team_members;
CREATE POLICY "Public Read Members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Leader or self Insert Members" ON team_members FOR INSERT WITH CHECK (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND leader_id = auth.uid())
);
CREATE POLICY "Leader Delete Members" ON team_members FOR DELETE USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND leader_id = auth.uid())
    OR auth.uid() = student_id
);

-- Join Requests
DROP POLICY IF EXISTS "Read own or team requests" ON join_requests;
DROP POLICY IF EXISTS "Students create requests" ON join_requests;
DROP POLICY IF EXISTS "Leader update requests" ON join_requests;
CREATE POLICY "Read own or team requests" ON join_requests FOR SELECT USING (
    auth.uid() = student_id OR
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND leader_id = auth.uid())
);
CREATE POLICY "Students create requests" ON join_requests FOR INSERT WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Leader update requests" ON join_requests FOR UPDATE USING (
    EXISTS (SELECT 1 FROM teams WHERE id = team_id AND leader_id = auth.uid())
);

-- Evaluations
DROP POLICY IF EXISTS "Read evaluations" ON evaluations;
DROP POLICY IF EXISTS "Judges insert evaluations" ON evaluations;
DROP POLICY IF EXISTS "Judges update own evaluations" ON evaluations;
CREATE POLICY "Read evaluations" ON evaluations FOR SELECT USING (
    auth.uid() = judge_id OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'spoc'))
);
CREATE POLICY "Judges insert evaluations" ON evaluations FOR INSERT WITH CHECK (
    auth.uid() = judge_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'judge')
);
CREATE POLICY "Judges update own evaluations" ON evaluations FOR UPDATE USING (
    auth.uid() = judge_id
);

-- Notifications
DROP POLICY IF EXISTS "Read own notifications" ON notifications;
DROP POLICY IF EXISTS "Update own notifications" ON notifications;
DROP POLICY IF EXISTS "System insert notifications" ON notifications;
CREATE POLICY "Read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System insert notifications" ON notifications FOR INSERT WITH CHECK (true);

-- ============================================================
-- STORED PROCEDURE: LOCK & VERIFY SIH TEAM
-- ============================================================
CREATE OR REPLACE FUNCTION lock_and_verify_sih_team(p_team_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_member_count INT;
    v_female_count INT;
    v_conflicting_student TEXT;
    v_has_ps BOOLEAN;
BEGIN
    -- Check 1: Exactly 6 Members
    SELECT COUNT(*) INTO v_member_count 
    FROM team_members 
    WHERE team_id = p_team_id;
    
    IF v_member_count != 6 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', format('SIH Guardrail Error: Team must have exactly 6 members. Current count: %s', v_member_count)
        );
    END IF;
    
    -- Check 2: At least 1 Female Member
    SELECT COUNT(*) INTO v_female_count 
    FROM team_members tm
    JOIN profiles p ON tm.student_id = p.id
    WHERE tm.team_id = p_team_id AND p.gender = 'Female';
    
    IF v_female_count < 1 THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', 'SIH Guardrail Error: Team must have at least 1 female member.'
        );
    END IF;
    
    -- Check 3: Problem Statement assigned
    SELECT (ps_id IS NOT NULL) INTO v_has_ps
    FROM teams WHERE id = p_team_id;
    
    IF NOT v_has_ps THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'SIH Guardrail Error: Team must have a problem statement assigned.'
        );
    END IF;
    
    -- Check 4: Single-Team Constraint (No student in another locked team)
    SELECT p.full_name INTO v_conflicting_student
    FROM team_members tm
    JOIN profiles p ON tm.student_id = p.id
    JOIN team_members tm_other ON tm_other.student_id = p.id
    JOIN teams t_other ON tm_other.team_id = t_other.id
    WHERE tm.team_id = p_team_id 
      AND t_other.id != p_team_id 
      AND t_other.is_locked = TRUE
    LIMIT 1;
    
    IF v_conflicting_student IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false, 
            'message', format('SIH Guardrail Error: Member "%s" is already in another locked team.', v_conflicting_student)
        );
    END IF;
    
    -- All checks passed — Lock the Team
    UPDATE teams SET is_locked = TRUE, is_open_for_recruitment = FALSE WHERE id = p_team_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', 'SIH Verification Passed! Team is now locked and ready for SPOC review.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STORED PROCEDURE: AUTO PROFILE CREATION ON SIGNUP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
  v_roll_no TEXT;
  v_skills TEXT[];
BEGIN
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'student');
  v_roll_no := NULLIF(TRIM(new.raw_user_meta_data->>'roll_no'), '');
  
  -- Only students have roll numbers (AM.CH.U4...)
  IF v_role != 'student' THEN
    v_roll_no := NULL;
  END IF;

  -- Safely parse skills array from JSON metadata
  BEGIN
    IF new.raw_user_meta_data->'skills' IS NOT NULL AND jsonb_typeof(new.raw_user_meta_data->'skills') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(new.raw_user_meta_data->'skills')) INTO v_skills;
    ELSE
      v_skills := '{}'::TEXT[];
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_skills := '{}'::TEXT[];
  END;

  INSERT INTO public.profiles (
    id, roll_no, full_name, email, gender, department, role,
    skills, phone, year_of_study, github_url, linkedin_url
  )
  VALUES (
    new.id,
    v_roll_no,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    COALESCE(new.raw_user_meta_data->>'gender', 'Male'),
    COALESCE(new.raw_user_meta_data->>'department', 'CSE'),
    v_role,
    COALESCE(v_skills, '{}'::TEXT[]),
    NULLIF(TRIM(new.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'year_of_study'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'github_url'), ''),
    NULLIF(TRIM(new.raw_user_meta_data->>'linkedin_url'), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    roll_no = COALESCE(EXCLUDED.roll_no, profiles.roll_no),
    department = EXCLUDED.department,
    gender = EXCLUDED.gender,
    skills = COALESCE(EXCLUDED.skills, profiles.skills),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    year_of_study = COALESCE(EXCLUDED.year_of_study, profiles.year_of_study),
    github_url = COALESCE(EXCLUDED.github_url, profiles.github_url),
    linkedin_url = COALESCE(EXCLUDED.linkedin_url, profiles.linkedin_url);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ENABLE REALTIME for notifications table (Safe / Idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    WHERE p.pubname = 'supabase_realtime' AND c.relname = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
