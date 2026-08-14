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

  // Sign up with email + password, then create profile
  const signUp = async ({ email, password, rollNo, fullName, gender, department, skills, phone, yearOfStudy, githubUrl, linkedinUrl, role = 'student' }) => {
    setError(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanRollNo = role === 'student' && rollNo ? rollNo.trim().toUpperCase() : null;
      const skillsArray = Array.isArray(skills) ? skills : [];

      // 1. Create auth user with complete user metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            roll_no: cleanRollNo,
            gender: gender || 'Male',
            department: department || 'CSE',
            role: role || 'student',
            skills: skillsArray,
            phone: phone ? phone.trim() : null,
            year_of_study: role === 'student' ? (yearOfStudy || null) : 'Faculty / Staff',
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

      // 2. Automatically log the user in immediately
      if (authData?.user) {
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        const activeUserId = loginData?.user?.id || authData.user.id;

        // 3. Directly update/ensure all profile fields are explicitly saved in PostgreSQL profiles table
        const profilePayload = {
          full_name: fullName.trim(),
          roll_no: cleanRollNo,
          gender: gender || 'Male',
          department: department || 'CSE',
          role: role || 'student',
          skills: skillsArray,
          phone: phone ? phone.trim() : null,
          year_of_study: role === 'student' ? (yearOfStudy || null) : 'Faculty / Staff',
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

  // Sign in with email + password
  const signIn = async ({ email, password }) => {
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
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

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
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
