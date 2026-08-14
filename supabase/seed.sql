-- ============================================================
-- Smart Amrita Hackathon 2026 — Complete & Validated Seed Data
-- Execute this in Supabase SQL Editor (Dashboard → SQL Editor)
-- All test users share password: Password123!
-- ============================================================

-- Ensure pgcrypto extension is active for bcrypt hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. CLEANUP PREVIOUS SEED DATA
DELETE FROM evaluations WHERE true;
DELETE FROM join_requests WHERE true;
DELETE FROM team_members WHERE true;
DELETE FROM teams WHERE true;
DELETE FROM problem_statements WHERE true;
DELETE FROM notifications WHERE true;
DELETE FROM profiles WHERE true;
DELETE FROM auth.identities WHERE email LIKE '%@amrita.edu';
DELETE FROM auth.users WHERE email LIKE '%@amrita.edu';


-- 2. PROBLEM STATEMENTS (Hardware & Software)
INSERT INTO problem_statements (id, ps_code, title, category, organization, domain, description) VALUES
('11111111-1111-1111-1111-111111111111', 'SAH2026_PS01', 'AI-Driven Smart Traffic Management System', 'Software', 'Ministry of Road Transport & Highways', 'Smart Vehicles & Mobility', 'Develop a real-time AI solution using computer vision to dynamically control traffic signal timers based on vehicle density and prioritize emergency vehicles.'),
('22222222-2222-2222-2222-222222222222', 'SAH2026_PS02', 'IoT-Based Water Quality Monitoring Device', 'Hardware', 'Ministry of Jal Shakti', 'Clean & Green Technology', 'Design a low-cost, solar-powered IoT device to monitor pH, turbidity, and dissolved oxygen levels in rural water reservoirs and transmit data to a central dashboard.'),
('33333333-3333-3333-3333-333333333333', 'SAH2026_PS03', 'Blockchain-Based Agricultural Supply Chain', 'Software', 'Ministry of Agriculture & Farmers Welfare', 'Agriculture & Rural Development', 'Build a transparent blockchain platform to track agricultural produce from farm to fork, ensuring fair pricing and preventing food spoilage.'),
('44444444-4444-4444-4444-444444444444', 'SAH2026_PS04', 'Autonomous Drone for Forest Fire Detection', 'Hardware', 'Ministry of Environment, Forest & Climate Change', 'Disaster Management', 'Develop an autonomous drone equipped with thermal imaging cameras and onboard edge AI to detect forest fires in early stages and send immediate alerts.'),
('55555555-5555-5555-5555-555555555555', 'SAH2026_PS05', 'Smart Healthcare Patient Triage System', 'Software', 'Ministry of Health & Family Welfare', 'Healthcare & MedTech', 'Create an intelligent triage system using machine learning to predict emergency room patient priorities and reduce hospital wait times.');


-- 3. AUTH USERS (Password: Password123!)
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud) VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'admin@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. K. Sivaraman","role":"admin"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('f0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'judge1@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Prof. Rajesh Kumar","role":"judge"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('f0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'judge2@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. Lakshmi Prasad","role":"judge"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('e0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'spoc@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dr. M. Venkatesh","role":"spoc"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'student1@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Aarav Sharma","roll_no":"AM.CH.U4CSE22001","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'student2@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ananya Ramesh","roll_no":"AM.CH.U4ECE22045","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'student3@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vikram Patel","roll_no":"AM.CH.U4AIE22012","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'student4@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Sundaram","roll_no":"AM.CH.U4ME22008","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'student5@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Karthik Raja","roll_no":"AM.CH.U4CSE22099","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'student6@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Meera Nair","roll_no":"AM.CH.U4CYS22015","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'student7@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohan Verma","roll_no":"AM.CH.U4CSE22044","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated'),
('c0000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'student8@amrita.edu', crypt('Password123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sneha Das","roll_no":"AM.CH.U4AIE22088","role":"student"}', NOW(), NOW(), 'authenticated', 'authenticated');


-- 4. AUTH IDENTITIES (REQUIRED BY SUPABASE GOTRUE AUTH FOR PASSWORD LOGIN)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
('a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin@amrita.edu"}', 'email', 'admin@amrita.edu', NOW(), NOW(), NOW()),
('f0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', '{"sub":"f0000000-0000-0000-0000-000000000001","email":"judge1@amrita.edu"}', 'email', 'judge1@amrita.edu', NOW(), NOW(), NOW()),
('f0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000002', '{"sub":"f0000000-0000-0000-0000-000000000002","email":"judge2@amrita.edu"}', 'email', 'judge2@amrita.edu', NOW(), NOW(), NOW()),
('e0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '{"sub":"e0000000-0000-0000-0000-000000000001","email":"spoc@amrita.edu"}', 'email', 'spoc@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', '{"sub":"c0000000-0000-0000-0000-000000000001","email":"student1@amrita.edu"}', 'email', 'student1@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', '{"sub":"c0000000-0000-0000-0000-000000000002","email":"student2@amrita.edu"}', 'email', 'student2@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', '{"sub":"c0000000-0000-0000-0000-000000000003","email":"student3@amrita.edu"}', 'email', 'student3@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', '{"sub":"c0000000-0000-0000-0000-000000000004","email":"student4@amrita.edu"}', 'email', 'student4@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000005', '{"sub":"c0000000-0000-0000-0000-000000000005","email":"student5@amrita.edu"}', 'email', 'student5@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000006', '{"sub":"c0000000-0000-0000-0000-000000000006","email":"student6@amrita.edu"}', 'email', 'student6@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000007', '{"sub":"c0000000-0000-0000-0000-000000000007","email":"student7@amrita.edu"}', 'email', 'student7@amrita.edu', NOW(), NOW(), NOW()),
('c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000008', '{"sub":"c0000000-0000-0000-0000-000000000008","email":"student8@amrita.edu"}', 'email', 'student8@amrita.edu', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- 5. PROFILES
INSERT INTO profiles (id, roll_no, full_name, email, gender, department, role, skills, phone, year_of_study) VALUES
('a0000000-0000-0000-0000-000000000001', NULL, 'Dr. K. Sivaraman (Admin)', 'admin@amrita.edu', 'Male', 'CSE', 'admin', '{}', '+91 9876543210', 'Faculty'),
('f0000000-0000-0000-0000-000000000001', NULL, 'Prof. Rajesh Kumar (Judge)', 'judge1@amrita.edu', 'Male', 'ECE', 'judge', '{}', '+91 9876543211', 'Faculty'),
('f0000000-0000-0000-0000-000000000002', NULL, 'Dr. Lakshmi Prasad (Judge)', 'judge2@amrita.edu', 'Female', 'AI & DS', 'judge', '{}', '+91 9876543212', 'Faculty'),
('e0000000-0000-0000-0000-000000000001', NULL, 'Dr. M. Venkatesh (SPOC)', 'spoc@amrita.edu', 'Male', 'Mechanical Engineering', 'spoc', '{}', '+91 9876543213', 'Faculty'),
('c0000000-0000-0000-0000-000000000001', 'AM.CH.U4CSE22001', 'Aarav Sharma', 'student1@amrita.edu', 'Male', 'CSE', 'student', '{"React", "Python", "Machine Learning"}', '+91 9876543201', '3rd Year'),
('c0000000-0000-0000-0000-000000000002', 'AM.CH.U4ECE22045', 'Ananya Ramesh', 'student2@amrita.edu', 'Female', 'ECE', 'student', '{"Embedded C", "IoT", "Arduino"}', '+91 9876543202', '3rd Year'),
('c0000000-0000-0000-0000-000000000003', 'AM.CH.U4AIE22012', 'Vikram Patel', 'student3@amrita.edu', 'Male', 'AI & DS', 'student', '{"PyTorch", "Computer Vision", "OpenCV"}', '+91 9876543203', '3rd Year'),
('c0000000-0000-0000-0000-000000000004', 'AM.CH.U4ME22008', 'Priya Sundaram', 'student4@amrita.edu', 'Female', 'Mechanical Engineering', 'student', '{"CAD/CAM", "3D Printing", "UI/UX Design"}', '+91 9876543204', '2nd Year'),
('c0000000-0000-0000-0000-000000000005', 'AM.CH.U4CSE22099', 'Karthik Raja', 'student5@amrita.edu', 'Male', 'CSE', 'student', '{"Node.js", "Docker", "PostgreSQL"}', '+91 9876543205', '3rd Year'),
('c0000000-0000-0000-0000-000000000006', 'AM.CH.U4CYS22015', 'Meera Nair', 'student6@amrita.edu', 'Female', 'Cyber Security', 'student', '{"Ethical Hacking", "Network Security"}', '+91 9876543206', '2nd Year'),
('c0000000-0000-0000-0000-000000000007', 'AM.CH.U4CSE22044', 'Rohan Verma', 'student7@amrita.edu', 'Male', 'CSE', 'student', '{"Golang", "Kubernetes", "AWS"}', '+91 9876543207', '3rd Year'),
('c0000000-0000-0000-0000-000000000008', 'AM.CH.U4AIE22088', 'Sneha Das', 'student8@amrita.edu', 'Female', 'AI & DS', 'student', '{"Machine Learning", "TensorFlow", "React"}', '+91 9876543208', '2nd Year')
ON CONFLICT (id) DO UPDATE SET
  roll_no = EXCLUDED.roll_no,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  gender = EXCLUDED.gender,
  department = EXCLUDED.department,
  role = EXCLUDED.role,
  skills = EXCLUDED.skills,
  phone = EXCLUDED.phone,
  year_of_study = EXCLUDED.year_of_study;


-- 6. TEAMS
INSERT INTO teams (id, team_name, leader_id, ps_id, needed_skills, is_open_for_recruitment, is_locked, is_spoc_verified, ppt_url, github_url, video_url) VALUES
('b1111111-1111-1111-1111-111111111111', 'Team InnoVision', 'c0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '{"Computer Vision", "IoT"}', false, true, true, 'https://docs.google.com/presentation/d/sah2026_innovision_pitch', 'https://github.com/innovision/sah2026-traffic-ai', 'https://youtube.com/watch?v=innovision_demo'),
('b2222222-2222-2222-2222-222222222222', 'Team CyberKnights', 'c0000000-0000-0000-0000-000000000007', '33333333-3333-3333-3333-333333333333', '{"Female Member Required", "Solidity", "React", "Node.js"}', true, false, false, NULL, NULL, NULL);


-- 7. TEAM MEMBERS
INSERT INTO team_members (team_id, student_id, member_role) VALUES
('b1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000001', 'Leader'),
('b1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000002', 'Member'),
('b1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000003', 'Member'),
('b1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000004', 'Member'),
('b1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000005', 'Member'),
('b1111111-1111-1111-1111-111111111111', 'c0000000-0000-0000-0000-000000000006', 'Member'),
('b2222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000007', 'Leader');


-- 8. JOIN REQUESTS
INSERT INTO join_requests (team_id, student_id, message, status) VALUES
('b2222222-2222-2222-2222-222222222222', 'c0000000-0000-0000-0000-000000000008', 'Hi Rohan! I am proficient in React and AI, and I would love to join CyberKnights as a female member.', 'PENDING');


-- 9. EVALUATIONS
INSERT INTO evaluations (team_id, judge_id, understanding_score, execution_score, impact_score, pitch_score, remarks) VALUES
('b1111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000001', 23, 27, 22, 18, 'Excellent computer vision model for vehicle detection. Clean UI presentation.'),
('b1111111-1111-1111-1111-111111111111', 'f0000000-0000-0000-0000-000000000002', 24, 28, 24, 19, 'Outstanding real-world impact and prototype execution. Ready for national SIH.');


-- 10. NOTIFICATIONS
INSERT INTO notifications (user_id, type, title, message) VALUES
('c0000000-0000-0000-0000-000000000001', 'team_verified', 'Team Verified by SPOC! 🏆', 'Your team "Team InnoVision" has been verified and authorized for SIH National Portal submission.'),
('c0000000-0000-0000-0000-000000000007', 'join_request', 'New Join Request', 'Sneha Das (AI & DS) wants to join your team "Team CyberKnights"');
