import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user profile from profiles table
  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No profile yet — user just signed up
          return null;
        }
        throw fetchError;
      }
      return data;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);

        if (currentSession?.user) {
          const userProfile = await fetchProfile(currentSession.user.id);
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);

        if (event === 'SIGNED_IN' && newSession?.user) {
          const userProfile = await fetchProfile(newSession.user.id);
          setProfile(userProfile);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Sign up with email + password, then create profile (Students only through portal)
  const signUp = async ({ email, collegeEmail, password, rollNo, fullName, gender, department, skills, phone, yearOfStudy, githubUrl, linkedinUrl }) => {
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCollegeEmail = collegeEmail ? collegeEmail.trim().toLowerCase() : '';
      const cleanRollNo = rollNo ? rollNo.trim().toUpperCase() : null;
      const cleanPhone = phone ? phone.trim() : null;
      const skillsArray = Array.isArray(skills) ? skills : [];
      const userRole = 'student';

      // 1. Double check uniqueness: Check Roll No
      if (cleanRollNo) {
        const { data: existingRoll } = await supabase
          .from('profiles')
          .select('id')
          .ilike('roll_no', cleanRollNo)
          .maybeSingle();

        if (existingRoll) {
          throw new Error(`Roll Number "${cleanRollNo}" is already registered. Please check your roll number or log in.`);
        }
      }

      // 2. Double check uniqueness: Check College Email
      if (cleanCollegeEmail) {
        const { data: existingCollege } = await supabase
          .from('profiles')
          .select('id')
          .ilike('college_email', cleanCollegeEmail)
          .maybeSingle();

        if (existingCollege) {
          throw new Error(`College Mail ID "${cleanCollegeEmail}" is already registered. Please log in or use a different email.`);
        }
      }

      // 3. Double check uniqueness: Check Personal Email
      const { data: existingEmail } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (existingEmail) {
        throw new Error(`Email address "${cleanEmail}" is already registered. Please log in instead.`);
      }

      // 4. Create auth user with complete user metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            roll_no: cleanRollNo,
            college_email: cleanCollegeEmail,
            gender: gender || 'Male',
            department: department || 'CSE',
            role: userRole,
            skills: skillsArray,
            phone: cleanPhone,
            year_of_study: yearOfStudy || null,
            github_url: githubUrl ? githubUrl.trim() : null,
            linkedin_url: linkedinUrl ? linkedinUrl.trim() : null
          }
        }
      });

      if (authError) throw authError;

      // In Supabase, if user already exists, GoTrue returns a user with empty identities
      if (authData?.user && authData.user.identities && authData.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Please log in instead.');
      }

      // 5. Automatically log the user in immediately
      if (authData?.user) {
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        const activeUserId = loginData?.user?.id || authData.user.id;

        // 6. Directly update/ensure all profile fields are explicitly saved in PostgreSQL profiles table
        const profilePayload = {
          full_name: fullName.trim(),
          roll_no: cleanRollNo,
          college_email: cleanCollegeEmail,
          email: cleanEmail,
          gender: gender || 'Male',
          department: department || 'CSE',
          role: userRole,
          skills: skillsArray,
          phone: cleanPhone,
          year_of_study: yearOfStudy || null,
          github_url: githubUrl ? githubUrl.trim() : null,
          linkedin_url: linkedinUrl ? linkedinUrl.trim() : null
        };

        const { error: updateErr } = await supabase
          .from('profiles')
          .update(profilePayload)
          .eq('id', activeUserId);

        if (updateErr) {
          console.warn('Profile direct sync note:', updateErr);
        }

        const userProfile = await fetchProfile(activeUserId);
        if (userProfile) setProfile(userProfile);
      }

      return { data: authData, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  // Sign in with personal email OR college mail ID + password
  const signIn = async ({ email, password }) => {
    setError(null);
    try {
      const cleanInput = email.trim().toLowerCase();
      let authEmail = cleanInput;

      // Check if user entered a College Mail ID instead of primary Auth email
      const { data: matchedProfile } = await supabase
        .from('profiles')
        .select('email')
        .ilike('college_email', cleanInput)
        .maybeSingle();

      if (matchedProfile?.email) {
        authEmail = matchedProfile.email;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password
      });

      if (signInError) throw signInError;

      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        setProfile(userProfile);
      }

      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  // Sign out
  const signOut = async () => {
    const { error: signOutError } = await supabase.auth.signOut();
    if (!signOutError) {
      setProfile(null);
      setSession(null);
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    const userId = session?.user?.id || profile?.id;
    if (!userId) return { error: new Error('Not authenticated') };

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) throw updateError;
      setProfile(data);
      return { data, error: null };
    } catch (err) {
      console.error('Update profile error:', err);
      return { data: null, error: err };
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (session?.user) {
      const userProfile = await fetchProfile(session.user.id);
      setProfile(userProfile);
    }
  };

  // Check if user has a specific role
  const hasRole = (role) => profile?.role === role;

  // Check if user is a team leader
  const isTeamLeader = useCallback(async () => {
    if (!profile) return false;
    const { data } = await supabase
      .from('teams')
      .select('id')
      .eq('leader_id', profile.id)
      .limit(1);
    return data && data.length > 0;
  }, [profile]);

  // Reset password 6-digit OTP email trigger
  const resetPasswordForEmail = async (email) => {
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Check if user profile exists
      const { data: userProfile, error: profErr } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (profErr || !userProfile) {
        throw new Error('No account found with this email address.');
      }

      // 2. Generate random 6-digit OTP code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // 3. Save to password_resets table in Supabase
      const { error: dbErr } = await supabase
        .from('password_resets')
        .insert({
          email: cleanEmail,
          otp_code: otpCode,
          expires_at: expiresAt
        });

      if (dbErr) {
        console.warn('DB OTP Log warning:', dbErr);
      }

      // 4. Send EXACTLY ONE email containing 6-digit OTP code via Nodemailer endpoint
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, otpCode })
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        throw new Error(resData.error || 'Failed to dispatch 6-digit OTP email.');
      }

      return { data: resData, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  // Update password for logged in user
  const updatePassword = async (newPassword) => {
    setError(null);
    try {
      const { data, error: updateErr } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (updateErr) throw updateErr;
      return { data, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  // Verify 6-digit OTP code and update password
  const verifyOtpForPasswordReset = async ({ email, token, newPassword }) => {
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanToken = token.trim();

      // 1. Verify 6-digit OTP code against password_resets table
      const { data: records, error: fetchErr } = await supabase
        .from('password_resets')
        .select('*')
        .eq('email', cleanEmail)
        .eq('otp_code', cleanToken)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (fetchErr || !records || records.length === 0) {
        throw new Error('Invalid or expired 6-digit OTP code. Please check your email or request a new OTP.');
      }

      // 2. Update user password via RPC (or session fallback)
      const { data: rpcData, error: rpcErr } = await supabase.rpc('reset_user_password_by_email', {
        p_email: cleanEmail,
        p_new_password: newPassword
      });

      if (rpcErr) {
        // Fallback: try session updateUser if RPC function not created yet
        const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
        if (updateErr) {
          throw new Error('Database password update function missing. Please run the SQL snippet in Supabase SQL Editor.');
        }
      }

      // 3. Clean up used OTP from password_resets table
      await supabase.from('password_resets').delete().eq('email', cleanEmail).eq('otp_code', cleanToken);

      return { data: { success: true }, error: null };
    } catch (err) {
      setError(err.message);
      return { data: null, error: err };
    }
  };

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    resetPasswordForEmail,
    verifyOtpForPasswordReset,
    updatePassword,
    updateProfile,
    refreshProfile,
    hasRole,
    isTeamLeader,
    isAuthenticated: !!session?.user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
