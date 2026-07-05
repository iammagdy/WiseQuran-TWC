import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { searchCities, type City } from "@/data/cities";

interface CitySearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectCity: (city: City) => void;
  onUseGPS: () => void;
}

export default function CitySearchModal({ open, onClose, onSelectCity, onUseGPS }: CitySearchModalProps) {
  const { isRTL } = useLanguage();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const results = searchCities(query);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSelect = (city: City) => {
    onSelectCity(city);
    onClose();
  };

  const handleGPS = () => {
    onUseGPS();
    onClose();
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
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card border-t border-border shadow-2xl max-h-[80vh] flex flex-col"
            dir={isRTL ? "rtl" : "ltr"}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 shrink-0" />

            <div className="px-5 pt-2 pb-3 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">
                  {isRTL ? "اختر مدينة" : "Choose a City"}
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 bg-muted hover:bg-muted/80 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="relative mb-3">
                <Search className={`absolute top-3 ${isRTL ? "right-3" : "left-3"} h-4 w-4 text-muted-foreground`} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={isRTL ? "ابحث عن مدينة..." : "Search for a city..."}
                  className={`w-full rounded-xl bg-muted border border-border px-4 py-2.5 text-sm outline-none focus:border-primary transition-colors ${isRTL ? "pr-10 text-right" : "pl-10"}`}
                />
              </div>

              <button
                onClick={handleGPS}
                className="w-full flex items-center gap-3 rounded-xl bg-primary/8 border border-primary/15 px-4 py-3 hover:bg-primary/12 transition-colors"
              >
                <Navigation className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary">
                  {isRTL ? "استخدام موقعي الحالي (GPS)" : "Use my current location (GPS)"}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-1">
              {query.trim() && results.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">
                  {isRTL ? "لم يتم العثور على مدينة" : "No city found"}
                </p>
              )}
              {results.map((city) => (
                <button
                  key={`${city.name}-${city.country}`}
                  onClick={() => handleSelect(city)}
                  className="w-full flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-muted transition-colors text-left"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className={isRTL ? "text-right" : "text-left"}>
                    <p className="text-sm font-medium text-foreground">
                      {isRTL ? city.nameAr : city.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? city.countryAr : city.country}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
