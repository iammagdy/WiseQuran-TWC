import { createContext, useContext, type ReactNode } from "react";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const STUB_VALUE: AuthContextValue = {
  user: null,
  session: null,
  loading: false,
};

const AuthContext = createContext<AuthContextValue>(STUB_VALUE);

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={STUB_VALUE}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context hook co-exports with provider
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
