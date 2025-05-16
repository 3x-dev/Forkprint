
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";

export type AuthState = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

// Custom hook for authentication state
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
  });

  useEffect(() => {
    // First set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth state change event:", event);
        setAuthState({
          user: session?.user ?? null,
          session: session,
          isLoading: false,
        });
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        user: session?.user ?? null,
        session: session,
        isLoading: false,
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      
      if (error) {
        throw error;
      }
      
      return { data, error: null };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      return { error: null };
    } catch (error) {
      console.error("Error signing out:", error);
      return { error };
    }
  };

  return {
    user: authState.user,
    session: authState.session,
    isLoading: authState.isLoading,
    signInWithGoogle,
    signOut,
  };
}
