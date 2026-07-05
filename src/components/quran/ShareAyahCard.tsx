import { useRef, useCallback } from "react";
import { Share2, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ShareAyahCardProps {
  ayahText: string;
  surahName: string;
  ayahNumber: number;
  surahNumber: number;
}

export function ShareAyahCard({ ayahText, surahName, ayahNumber, surahNumber }: ShareAyahCardProps) {
  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#1a3a2a");
    gradient.addColorStop(1, "#0f2018");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Ornamental border
    ctx.strokeStyle = "rgba(200, 170, 100, 0.3)";
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, width - 80, height - 80);
    ctx.strokeRect(55, 55, width - 110, height - 110);

    // Corner decorations
    const cornerSize = 30;
    ctx.strokeStyle = "rgba(200, 170, 100, 0.5)";
    ctx.lineWidth = 2;
    [[60, 60, 1, 1], [width - 60, 60, -1, 1], [60, height - 60, 1, -1], [width - 60, height - 60, -1, -1]].forEach(([x, y, dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x as number, (y as number) + (dy as number) * cornerSize);
      ctx.lineTo(x as number, y as number);
      ctx.lineTo((x as number) + (dx as number) * cornerSize, y as number);
      ctx.stroke();
    });

    // Ayah text
    ctx.fillStyle = "#e8dcc8";
    ctx.textAlign = "center";
    ctx.direction = "rtl";
    
    // Word wrap
    const maxWidth = width - 160;
    ctx.font = "bold 42px 'Amiri', serif";
    const words = ayahText.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    const lineHeight = 72;
    const totalTextHeight = lines.length * lineHeight;
    const startY = (height - totalTextHeight) / 2 + 20;

    lines.forEach((line, i) => {
      ctx.fillText(line, width / 2, startY + i * lineHeight);
    });

    // Surah info
    ctx.font = "24px 'Amiri', serif";
    ctx.fillStyle = "rgba(200, 170, 100, 0.8)";
    ctx.fillText(`﴿ سورة ${surahName} — آية ${ayahNumber} ﴾`, width / 2, height - 100);

    // App branding
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "rgba(200, 170, 100, 0.4)";
    ctx.fillText("Wise Quran — quran.thewise.cloud", width / 2, height - 60);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, [ayahText, surahName, ayahNumber]);

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) {
      toast({ title: "تعذر إنشاء الصورة" });
      return;
    }

    const file = new File([blob], `ayah-${surahNumber}-${ayahNumber}.png`, { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `سورة ${surahName} — آية ${ayahNumber}` });
      } catch {
        // User cancelled
      }
    } else {
      // Fallback: download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ayah-${surahNumber}-${ayahNumber}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "تم تحميل الصورة" });
    }
  };

  return (
    <button
      onClick={handleShare}
      className="rounded-xl p-2 transition-colors hover:bg-muted text-muted-foreground opacity-30 group-hover:opacity-100"
      title="مشاركة الآية"
    >
      <Share2 className="h-4 w-4" />
    </button>
  );
}
