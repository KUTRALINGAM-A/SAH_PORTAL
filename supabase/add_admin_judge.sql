-- ============================================================
-- SQL Snippet: Add Admin, Judge, or SPOC Accounts
-- Run this in Supabase SQL Editor (Dashboard -> SQL Editor)
-- ============================================================

-- 1. Create Admin User
DO $$
DECLARE
    v_user_id UUID := gen_random_uuid();
    v_email TEXT := 'admin_new@amrita.edu';
    v_password TEXT := 'Password123!';
    v_full_name TEXT := 'Dr. Admin User';
    v_department TEXT := 'CSE';
    v_phone TEXT := '+91 9999999999';
    v_college_email TEXT := 'admin_new@ch.amrita.edu';
BEGIN
    -- Insert into auth.users
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
    VALUES (
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt(v_password, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        jsonb_build_object('full_name', v_full_name, 'role', 'admin'),
        NOW(), NOW(), 'authenticated', 'authenticated'
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
        v_user_id,
        v_user_id,
        jsonb_build_object('sub', v_user_id, 'email', v_email),
        'email',
        v_email,
        NOW(), NOW(), NOW()
    );

    -- Insert into public.profiles
    INSERT INTO profiles (id, full_name, email, college_email, gender, department, role, phone, year_of_study)
    VALUES (
        v_user_id,
        v_full_name,
        v_email,
        v_college_email,
        'Male',
        v_department,
        'admin', -- 'admin', 'judge', or 'spoc'
        v_phone,
        'Faculty / Staff'
    );
END $$;
