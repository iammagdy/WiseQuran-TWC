import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface WeeklyChartProps {
  data: { dayName: string; ayahCount: number; date: string }[];
}

export function WeeklyChart({ data }: WeeklyChartProps) {
  const { t, language, isRTL } = useLanguage();
  const maxVal = Math.max(...data.map((d) => d.ayahCount), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl bg-card p-4 shadow-soft border border-border/50"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <h3 className="text-sm font-bold mb-4">{t("this_week")}</h3>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="dayName"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="rounded-lg bg-popover px-3 py-2 text-xs shadow-md border border-border">
                    <p className="font-bold">{language === "ar" ? toArabicNumerals(d.ayahCount) : d.ayahCount} {t("ayah")}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="ayahCount" radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell
                  key={i}
                  fill={
                    entry.ayahCount > 0
                      ? `hsl(var(--primary) / ${0.3 + (entry.ayahCount / maxVal) * 0.7})`
                      : "hsl(var(--muted))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
