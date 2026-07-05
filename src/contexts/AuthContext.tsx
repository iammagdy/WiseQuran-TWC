import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      console.log('[Auth] Starting sign up process...');

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.error('[Auth] Sign up error:', error.message, error);
        return { error: error.message };
      }

      if (!data.session) {
        console.warn('[Auth] Sign up succeeded but no session created - email confirmation may be enabled');
        return {
          error: 'Account created. Please check your email to verify your account before signing in.'
        };
      }

      console.log('[Auth] Sign up successful - user auto-logged in');
      return { error: null };

    } catch (err) {
      console.error('[Auth] Unexpected error during sign up:', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      console.log('[Auth] Starting sign in process...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('[Auth] Sign in error:', error.message, error);
        return { error: error.message };
      }

      if (!data.session) {
        console.error('[Auth] Sign in succeeded but no session created');
        return { error: 'Login failed. Please try again.' };
      }

      console.log('[Auth] Sign in successful');
      return { error: null };

    } catch (err) {
      console.error('[Auth] Unexpected error during sign in:', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
