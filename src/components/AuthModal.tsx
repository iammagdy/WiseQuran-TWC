import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = "signin" | "signup";

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { signIn, signUp } = useAuth();
  const { isRTL } = useLanguage();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setError(null);
    setSuccess(false);
    setLoading(false);
    setShowPass(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isRTL ? "يرجى ملء جميع الحقول" : "Please fill in all fields");
      return;
    }
    setLoading(true);
    setError(null);

    if (tab === "signin") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(isRTL ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
        setLoading(false);
      } else {
        handleClose();
      }
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        const msg = error.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists")) {
          setError(isRTL ? "هذا البريد الإلكتروني مسجل بالفعل" : "This email is already registered");
        } else if (msg.includes("password")) {
          setError(isRTL ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
        } else {
          setError(isRTL ? "حدث خطأ، يرجى المحاولة مجددًا" : "An error occurred, please try again");
        }
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card border-t border-border shadow-2xl"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1" />

            <div className="px-5 pb-8 pt-2">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-foreground">
                  {isRTL ? "حفظ التقدم" : "Save Progress"}
                </h2>
                <button
                  onClick={handleClose}
                  className="rounded-full p-2 bg-muted hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl">✓</span>
                  </div>
                  <p className="font-bold text-foreground mb-1">
                    {isRTL ? "تم إنشاء الحساب بنجاح" : "Account created successfully"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {isRTL ? "يمكنك الآن تسجيل الدخول" : "You can now sign in"}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => { setTab("signin"); setSuccess(false); setPassword(""); }}
                  >
                    {isRTL ? "تسجيل الدخول" : "Sign In"}
                  </Button>
                </motion.div>
              ) : (
                <>
                  <div className="flex rounded-xl bg-muted p-1 mb-5">
                    <button
                      onClick={() => { setTab("signin"); setError(null); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === "signin"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isRTL ? "تسجيل الدخول" : "Sign In"}
                    </button>
                    <button
                      onClick={() => { setTab("signup"); setError(null); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === "signup"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      {isRTL ? "إنشاء حساب" : "Create Account"}
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className={`absolute top-3.5 ${isRTL ? "right-3.5" : "left-3.5"} h-4 w-4 text-muted-foreground`} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isRTL ? "البريد الإلكتروني" : "Email address"}
                        className={`w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors ${isRTL ? "pr-10 text-right" : "pl-10"}`}
                        autoComplete="email"
                      />
                    </div>

                    <div className="relative">
                      <Lock className={`absolute top-3.5 ${isRTL ? "right-3.5" : "left-3.5"} h-4 w-4 text-muted-foreground`} />
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isRTL ? "كلمة المرور" : "Password"}
                        className={`w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors ${isRTL ? "pr-10 pl-10 text-right" : "pl-10 pr-10"}`}
                        autoComplete={tab === "signin" ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className={`absolute top-3.5 ${isRTL ? "left-3.5" : "right-3.5"} text-muted-foreground hover:text-foreground transition-colors`}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {error && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                      >
                        {error}
                      </motion.p>
                    )}

                    <Button
                      type="submit"
                      className="w-full mt-1"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground animate-spin" />
                          {isRTL ? "جارٍ التحميل..." : "Loading..."}
                        </span>
                      ) : tab === "signin" ? (
                        <span className="flex items-center gap-2">
                          <LogIn className="h-4 w-4" />
                          {isRTL ? "تسجيل الدخول" : "Sign In"}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <UserPlus className="h-4 w-4" />
                          {isRTL ? "إنشاء حساب" : "Create Account"}
                        </span>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
