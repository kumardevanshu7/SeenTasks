import { useEffect, useRef, useState } from "react";
import { Copy, Download, Sparkles, Check, X, Share2 } from "lucide-react";
import { formatFriendly } from "../lib/date";

export default function ShareReportModal({ open, onClose, flow, report }) {
  const canvasRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const dateStr = report?.dateKey ? formatFriendly(report.dateKey) : "Today";
  const flowName = flow?.name || "Everyday Routine";
  const grade = report?.grade || (report?.score >= 90 ? "A+" : report?.score >= 80 ? "A" : report?.score >= 70 ? "B" : "C");
  const score = report?.score ?? Math.round(((report?.done || 0) / Math.max(report?.total || 1, 1)) * 100);
  const streak = flow?.streak || (report?.done > 0 && report?.done === report?.total ? 1 : 0);
  const feedback = report?.feedback || "Great focus and consistency today.";

  useEffect(() => {
    if (!open || !report) return;
    setGenerating(true);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // High-DPI 2x scale
    const width = 800;
    const height = 1040;
    canvas.width = width;
    canvas.height = height;

    // 1. Background (Warm Cream Linen)
    ctx.fillStyle = "#faf7f2";
    ctx.fillRect(0, 0, width, height);

    // Subtle gradient glow
    const grad = ctx.createRadialGradient(400, 300, 50, 400, 500, 600);
    grad.addColorStop(0, "rgba(238, 230, 216, 0.6)");
    grad.addColorStop(1, "rgba(250, 247, 242, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Outer double border
    ctx.strokeStyle = "#e5ded4";
    ctx.lineWidth = 3;
    ctx.strokeRect(28, 28, width - 56, height - 56);
    ctx.strokeStyle = "rgba(197, 185, 170, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    // 2. Brand Header
    ctx.textAlign = "center";
    ctx.font = "600 15px sans-serif";
    ctx.fillStyle = "#8a7e72";
    ctx.letterSpacing = "4px";
    ctx.fillText("✦  S E E N T A S K S  ✦", 400, 85);
    ctx.letterSpacing = "0px";

    ctx.font = "400 16px sans-serif";
    ctx.fillStyle = "#6b5e52";
    ctx.fillText(`Daily Reflection & Report · ${dateStr}`, 400, 115);

    // Thin separator line
    ctx.strokeStyle = "#e8e1d7";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(120, 140);
    ctx.lineTo(680, 140);
    ctx.stroke();

    // 3. Flow Title
    ctx.font = "italic 600 36px 'Cormorant Garamond', Georgia, serif";
    ctx.fillStyle = "#2c241e";
    ctx.fillText(flowName, 400, 195);

    // 4. Grade Badge Card (Large Centerpiece)
    const badgeY = 240;
    const badgeW = 340;
    const badgeH = 200;
    const badgeX = (width - badgeW) / 2;

    // Card shadow & background
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 20);
    ctx.fill();
    ctx.strokeStyle = "#e8dfd3";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Grade Text
    ctx.font = "bold 84px 'Cormorant Garamond', Georgia, serif";
    ctx.fillStyle = grade.startsWith("A") ? "#2d6a4f" : grade.startsWith("B") ? "#2b6cb0" : "#d97706";
    ctx.fillText(grade, 400, badgeY + 105);

    // Score & Completion count
    ctx.font = "600 18px sans-serif";
    ctx.fillStyle = "#5c5046";
    ctx.fillText(`${score}% Score · ${report.done || 0} of ${report.total || 0} Steps Done`, 400, badgeY + 145);

    // Streak pill if streak > 0
    if (streak > 0) {
      ctx.fillStyle = "#fef3c7";
      ctx.beginPath();
      ctx.roundRect(310, badgeY + 160, 180, 26, 13);
      ctx.fill();
      ctx.font = "bold 12px sans-serif";
      ctx.fillStyle = "#b45309";
      ctx.fillText(`🔥 ${streak} DAY STREAK`, 400, badgeY + 178);
    }

    // 5. Category Breakdown / Steps list
    const listY = 485;
    ctx.textAlign = "left";
    ctx.font = "600 14px sans-serif";
    ctx.fillStyle = "#8a7e72";
    ctx.letterSpacing = "2px";
    ctx.fillText("CATEGORY BREAKDOWN", 100, listY);
    ctx.letterSpacing = "0px";

    const categories = Array.isArray(report.categories) && report.categories.length > 0
      ? report.categories
      : [{ name: "Daily Flow Steps", done: report.done || 0, total: report.total || 0 }];

    let curY = listY + 35;
    categories.slice(0, 5).forEach((cat) => {
      // Row box
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.beginPath();
      ctx.roundRect(100, curY - 24, 600, 48, 10);
      ctx.fill();
      ctx.strokeStyle = "#eee6da";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Check bullet
      ctx.fillStyle = cat.done === cat.total && cat.total > 0 ? "#2d6a4f" : "#d97706";
      ctx.beginPath();
      ctx.arc(130, curY, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 11px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("✓", 130, curY + 4);

      // Category name
      ctx.textAlign = "left";
      ctx.font = "600 16px sans-serif";
      ctx.fillStyle = "#2c241e";
      ctx.fillText(cat.name, 155, curY + 5);

      // Fraction
      ctx.textAlign = "right";
      ctx.font = "600 15px sans-serif";
      ctx.fillStyle = "#6b5e52";
      ctx.fillText(`${cat.done}/${cat.total} steps`, 675, curY + 5);

      curY += 58;
    });

    // 6. Reflection Quote / Feedback Box
    const quoteY = Math.max(curY + 20, 810);
    ctx.fillStyle = "#f4efe6";
    ctx.beginPath();
    ctx.roundRect(100, quoteY, 600, 110, 14);
    ctx.fill();
    ctx.strokeStyle = "#e3dacf";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "italic 400 17px 'Cormorant Garamond', Georgia, serif";
    ctx.fillStyle = "#4a3e35";
    ctx.fillText(`“${feedback}”`, 400, quoteY + 48);

    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "#948779";
    ctx.letterSpacing = "1.5px";
    ctx.fillText("HUMAN FOCUS · MOMENTUM OVER PERFECTION", 400, quoteY + 82);
    ctx.letterSpacing = "0px";

    // 7. Footer Watermark
    ctx.font = "500 13px sans-serif";
    ctx.fillStyle = "#a89c8f";
    ctx.fillText("seentasks.com  ·  Calm, Intentional Daily Focus", 400, 990);

    setGenerating(false);
  }, [open, report, flow, dateStr, flowName, grade, score, streak, feedback]);

  async function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `seentasks-${flow?.name?.toLowerCase().replace(/\s+/g, "-") || "report"}-${report?.dateKey || "today"}.png`;
    a.click();
  }

  async function handleCopy() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      });
    } catch {
      // Fallback: download if clipboard fails
      handleDownload();
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="share-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Share Report Card"
      >
        <div className="share-modal-head">
          <div className="share-modal-title">
            <Share2 size={18} />
            <span>Share Daily Report Card</span>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="share-modal-copy">
          Export an aesthetic high-resolution card to celebrate your daily consistency.
        </p>

        {/* Live Canvas Preview */}
        <div className="share-canvas-preview-wrap">
          <canvas ref={canvasRef} className="share-canvas-element" />
        </div>

        <div className="share-modal-actions">
          <button
            type="button"
            className={`button button-secondary share-copy-btn${copied ? " is-copied" : ""}`}
            onClick={handleCopy}
            disabled={generating}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? "Copied to Clipboard!" : "Copy Image"}</span>
          </button>

          <button
            type="button"
            className="button button-primary share-download-btn"
            onClick={handleDownload}
            disabled={generating}
          >
            <Download size={16} />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
