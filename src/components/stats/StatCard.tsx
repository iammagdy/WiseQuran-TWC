import { motion } from "framer-motion";
import { Video as LucideIcon } from "lucide-react";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StatCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  delay?: number;
  accent?: boolean;
}

export function StatCard({ icon: Icon, value, label, delay = 0, accent = false }: StatCardProps) {
  const { language } = useLanguage();
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl p-4 shadow-soft border border-border/50 ${
        accent ? "bg-primary/10" : "bg-card"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-5 w-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{language === "ar" ? toArabicNumerals(value) : value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </motion.div>
  );
}
