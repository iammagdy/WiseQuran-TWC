import { Slider } from "@/components/ui/slider";

export type NatureSound = "none" | "rain" | "ocean" | "forest";

interface NatureSoundOption {
  id: NatureSound;
  labelAr: string;
  labelEn: string;
  icon: string;
  url: string;
}

// eslint-disable-next-line react-refresh/only-export-components -- data table colocated with picker UI; splitting would just create busywork
export const NATURE_SOUNDS: NatureSoundOption[] = [
  { id: "none", labelAr: "بدون صوت", labelEn: "None", icon: "🔇", url: "" },
  { id: "rain", labelAr: "مطر", labelEn: "Rain", icon: "🌧️", url: "https://assets.mixkit.co/active_storage/sfx/212/212-preview.mp3" },
  { id: "ocean", labelAr: "أمواج", labelEn: "Ocean", icon: "🌊", url: "https://assets.mixkit.co/active_storage/sfx/2516/2516-preview.mp3" },
  { id: "forest", labelAr: "غابة", labelEn: "Forest", icon: "🌲", url: "https://assets.mixkit.co/active_storage/sfx/1477/1477-preview.mp3" },
];

interface NatureSoundPickerProps {
  selected: NatureSound;
  volume: number;
  language: string;
  onSelect: (sound: NatureSound) => void;
  onVolumeChange: (volume: number) => void;
}

export function NatureSoundPicker({ selected, volume, language, onSelect, onVolumeChange }: NatureSoundPickerProps) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {NATURE_SOUNDS.map((sound) => (
          <button
            key={sound.id}
            onClick={() => onSelect(sound.id)}
            className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border transition-all flex-1 ${
              selected === sound.id
                ? "bg-amber-400/15 border-amber-400/40 text-amber-100"
                : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
            }`}
          >
            <span className="text-xl">{sound.icon}</span>
            <span className="text-xs font-medium">
              {language === "ar" ? sound.labelAr : sound.labelEn}
            </span>
          </button>
        ))}
      </div>

      {selected !== "none" && (
        <div className="px-1">
          <Slider
            value={[volume]}
            onValueChange={([v]) => onVolumeChange(v)}
            min={0}
            max={100}
            step={5}
            className="[&_[role=slider]]:bg-amber-300 [&_[role=slider]]:border-amber-400"
          />
        </div>
      )}
    </div>
  );
}
