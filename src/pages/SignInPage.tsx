import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, ArrowRight, CircleCheck as CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

type Tab = "signin" | "signup";

export default function SignInPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const { isRTL } = useLanguage();

  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleBack = () => navigate(-1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(isRTL ? "يرجى ملء جميع الحقول" : "Please fill in all fields");
      return;
    }
    setSubmitting(true);
    setError(null);

    if (tab === "signin") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(isRTL ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
        setSubmitting(false);
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
        setSubmitting(false);
      } else {
        setSuccess(true);
        setSubmitting(false);
      }
    }
  };

  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div
      className="min-h-screen bg-background gradient-spiritual pattern-islamic flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="absolute inset-0 gradient-spiritual" />
      <div className="absolute inset-0 pattern-islamic opacity-40" />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1 }}
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 30%, hsl(var(--primary) / 0.08) 0%, transparent 80%)",
        }}
      />

      <div className="relative z-10 flex flex-col min-h-screen max-w-lg mx-auto w-full px-5">
        <div className="pt-safe-top pt-4 pb-2">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-1 -mx-1 rounded-lg"
          >
            <BackIcon className="h-4 w-4" />
            <span>{isRTL ? "رجوع" : "Back"}</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center mb-10"
          >
            <motion.div
              className="relative mb-6"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.1 }}
            >
              <motion.div
                className="absolute rounded-2xl border border-primary/15"
                style={{ inset: -6 }}
                animate={{ opacity: [0.5, 0.25, 0.5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/90 to-primary p-[2px] shadow-glow relative z-10">
                <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center">
                  <img
                    src="/icons/icon-192.png"
                    alt="Wise Quran"
                    className="w-14 h-14 object-contain"
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-center"
            >
              <div className="flex items-center justify-center gap-3 mb-1.5 w-36 mx-auto">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/30" />
                <div className="w-1 h-1 rounded-full bg-primary/50" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/30" />
              </div>
              <h1 className="text-2xl font-bold text-gradient leading-tight">
                Wise Quran
              </h1>
              <p className="text-lg font-arabic text-primary/70 mt-0.5">
                القرآن الكريم
              </p>
              <div className="flex items-center justify-center gap-3 mt-1.5 w-36 mx-auto">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/20" />
                <div className="w-1 h-1 rounded-full bg-primary/40" />
                <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/20" />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.45 }}
            className="rounded-2xl bg-card border border-border shadow-lg overflow-hidden"
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/12 border border-green-500/25 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-lg font-bold text-foreground mb-1.5">
                    {isRTL ? "تم إنشاء الحساب بنجاح" : "Account created!"}
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    {isRTL ? "يمكنك الآن تسجيل الدخول" : "You can now sign in to your account"}
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setTab("signin");
                      setSuccess(false);
                      setPassword("");
                    }}
                  >
                    <LogIn className="h-4 w-4 me-2" />
                    {isRTL ? "تسجيل الدخول" : "Sign In"}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-5"
                >
                  <div className="flex rounded-xl bg-muted p-1 mb-5">
                    <button
                      onClick={() => { setTab("signin"); setError(null); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        tab === "signin"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isRTL ? "تسجيل الدخول" : "Sign In"}
                    </button>
                    <button
                      onClick={() => { setTab("signup"); setError(null); }}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        tab === "signup"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {isRTL ? "إنشاء حساب" : "Create Account"}
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail
                        className={`absolute top-3.5 ${isRTL ? "right-3.5" : "left-3.5"} h-4 w-4 text-muted-foreground pointer-events-none`}
                      />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={isRTL ? "البريد الإلكتروني" : "Email address"}
                        className={`w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors ${
                          isRTL ? "pr-10 text-right" : "pl-10"
                        }`}
                        autoComplete="email"
                      />
                    </div>

                    <div className="relative">
                      <Lock
                        className={`absolute top-3.5 ${isRTL ? "right-3.5" : "left-3.5"} h-4 w-4 text-muted-foreground pointer-events-none`}
                      />
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={isRTL ? "كلمة المرور" : "Password"}
                        className={`w-full rounded-xl bg-muted border border-border px-4 py-3 text-sm outline-none focus:border-primary transition-colors ${
                          isRTL ? "pr-10 pl-10 text-right" : "pl-10 pr-10"
                        }`}
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

                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    <Button
                      type="submit"
                      className="w-full mt-1"
                      disabled={submitting}
                    >
                      {submitting ? (
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

                  <p className="text-xs text-center text-muted-foreground/70 mt-4">
                    {isRTL
                      ? "سيتم حفظ تقدمك في القراءة والحفظ عبر أجهزتك"
                      : "Your reading and memorization progress will sync across devices"}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
