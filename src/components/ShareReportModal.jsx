import { useEffect, useRef, useState } from "react";
import { Copy, Download, Check, X, Award } from "lucide-react";
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
  const feedback = report?.feedback || "Outstanding daily focus and consistency.";

  useEffect(() => {
    if (!open || !report) return;
    setGenerating(true);

    let cancelled = false;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas || cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // High-res Landscape Certificate: 1200 x 840
      const width = 1200;
      const height = 840;
      canvas.width = width;
      canvas.height = height;

      // 1. Crisp White/Ice Base Background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // 2. Blueprint Tech Grid
      ctx.save();
      ctx.strokeStyle = "rgba(219, 234, 254, 0.55)"; // subtle light blue grid
      ctx.lineWidth = 1;
      const step = 28;
      for (let x = 0; x <= width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();

      // Soft center radiant glow
      const radial = ctx.createRadialGradient(width / 2, height / 2, 80, width / 2, height / 2, 540);
      radial.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      radial.addColorStop(0.55, "rgba(248, 250, 252, 0.75)");
      radial.addColorStop(1, "rgba(224, 242, 254, 0.2)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, width, height);

      // 3. Modern Geometric Corner Accents (Matching Reference Image)
      // Top-Right Corner
      ctx.save();
      // Soft cyan backdrop curve
      ctx.fillStyle = "rgba(186, 230, 253, 0.75)";
      ctx.beginPath();
      ctx.moveTo(width - 340, 0);
      ctx.quadraticCurveTo(width - 170, 35, width - 90, 150);
      ctx.quadraticCurveTo(width - 25, 230, width, 250);
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fill();

      // Deep sapphire ribbon loop
      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(width - 230, 0);
      ctx.bezierCurveTo(width - 230, 160, width - 160, 220, width, 220);
      ctx.stroke();

      // Inner cyan accent stroke
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(width - 195, 0);
      ctx.bezierCurveTo(width - 195, 140, width - 140, 190, width, 190);
      ctx.stroke();
      ctx.restore();

      // Bottom-Left Corner (Mirrored)
      ctx.save();
      // Soft cyan backdrop curve
      ctx.fillStyle = "rgba(186, 230, 253, 0.75)";
      ctx.beginPath();
      ctx.moveTo(0, height - 250);
      ctx.quadraticCurveTo(25, height - 230, 90, height - 150);
      ctx.quadraticCurveTo(170, height - 35, 340, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Deep sapphire ribbon loop
      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(0, height - 220);
      ctx.bezierCurveTo(160, height - 220, 220, height - 160, 220, height);
      ctx.stroke();

      // Inner cyan accent stroke
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(0, height - 190);
      ctx.bezierCurveTo(140, height - 190, 190, height - 140, 190, height);
      ctx.stroke();
      ctx.restore();

      // 4. Precision Certificate Border Frames
      ctx.save();
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2;
      ctx.strokeRect(38, 38, width - 76, height - 76);

      ctx.strokeStyle = "rgba(59, 130, 246, 0.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(46, 46, width - 92, height - 92);

      // Corner Crosshair Plus Nodes
      const drawCornerNode = (cx, cy) => {
        ctx.strokeStyle = "#1e3a8a";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 7, cy);
        ctx.lineTo(cx + 7, cy);
        ctx.moveTo(cx, cy - 7);
        ctx.lineTo(cx, cy + 7);
        ctx.stroke();
      };
      drawCornerNode(46, 46);
      drawCornerNode(width - 46, 46);
      drawCornerNode(46, height - 46);
      drawCornerNode(width - 46, height - 46);
      ctx.restore();

      // 5. Brand Header: Arigato Labs x SeenTasks Collab
      ctx.textAlign = "center";
      ctx.fillStyle = "#1e3a8a";
      ctx.font = "800 13px 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "5px";
      ctx.fillText("✦   A R I G A T O   L A B S   ✕   S E E N T A S K S   ✦", width / 2, 88);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      // Subtle gradient divider line below brand
      const brandLineGrad = ctx.createLinearGradient(width / 2 - 180, 0, width / 2 + 180, 0);
      brandLineGrad.addColorStop(0, "rgba(30, 58, 138, 0)");
      brandLineGrad.addColorStop(0.5, "rgba(37, 99, 235, 0.5)");
      brandLineGrad.addColorStop(1, "rgba(30, 58, 138, 0)");
      ctx.strokeStyle = brandLineGrad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 180, 106);
      ctx.lineTo(width / 2 + 180, 106);
      ctx.stroke();

      // 6. Main Certificate Typography
      ctx.font = "900 52px 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = "#0f172a";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
      ctx.fillText("CERTIFICATE", width / 2, 172);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      ctx.font = "800 15px 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = "#2563eb";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "7px";
      ctx.fillText("OF DAILY ACHIEVEMENT & CONSISTENCY", width / 2, 206);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      ctx.font = "600 12px 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = "#64748b";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
      ctx.fillText("THIS CERTIFICATE IS PROUDLY PRESENTED FOR", width / 2, 240);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      // 7. Flow Name / Target in Display Cursive Script (Dynamic scaling for any name length)
      let flowFontSize = 48;
      ctx.font = `600 ${flowFontSize}px 'Dancing Script', 'Caveat', 'Great Vibes', 'Brush Script MT', cursive`;
      while (ctx.measureText(flowName).width > 750 && flowFontSize > 26) {
        flowFontSize -= 2;
        ctx.font = `600 ${flowFontSize}px 'Dancing Script', 'Caveat', 'Great Vibes', 'Brush Script MT', cursive`;
      }
      ctx.fillStyle = "#1e3a8a";
      ctx.fillText(flowName, width / 2, 304);

      // Decorative under-stroke with center diamond node
      const nameMeasured = ctx.measureText(flowName).width;
      const nameTextWidth = Math.min(800, Math.max(260, nameMeasured + 60));
      ctx.strokeStyle = "#2563eb";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - nameTextWidth / 2, 320);
      ctx.lineTo(width / 2 + nameTextWidth / 2, 320);
      ctx.stroke();

      ctx.fillStyle = "#1d4ed8";
      ctx.beginPath();
      ctx.arc(width / 2, 320, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 8. Citation Description
      ctx.font = "500 16px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = "#334155";
      const totalSteps = report?.total || 0;
      const doneSteps = report?.done || 0;
      const citation = `For demonstrating unwavering discipline by completing ${doneSteps} of ${totalSteps} daily steps with ${score}% precision.`;
      ctx.fillText(citation, width / 2, 362);

      // Inspiring feedback quote
      const cleanFeedback = feedback.length > 95 ? `${feedback.slice(0, 92)}…` : feedback;
      ctx.font = "italic 400 15px 'Cormorant Garamond', Georgia, serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(`“${cleanFeedback}”`, width / 2, 390);

      // 9. Metric Stat Badges (Bento Style 3-Pill Row)
      const pillY = 425;
      const pillH = 46;
      const pillW = 224;
      const pillGap = 24;
      const totalPillsWidth = 3 * pillW + 2 * pillGap;
      const startPillX = (width - totalPillsWidth) / 2;

      // Pill 1: Grade
      const p1X = startPillX;
      ctx.fillStyle = "#eff6ff";
      ctx.beginPath();
      ctx.roundRect(p1X, pillY, pillW, pillH, 23);
      ctx.fill();
      ctx.strokeStyle = "#bfdbfe";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "800 15px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = grade.startsWith("A") ? "#166534" : grade.startsWith("B") ? "#1e40af" : "#b45309";
      ctx.fillText(`★  GRADE ${grade}`, p1X + pillW / 2, pillY + 28);

      // Pill 2: Score & Steps
      const p2X = startPillX + pillW + pillGap;
      ctx.fillStyle = "#f0fdf4";
      ctx.beginPath();
      ctx.roundRect(p2X, pillY, pillW, pillH, 23);
      ctx.fill();
      ctx.strokeStyle = "#bbf7d0";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "700 14px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = "#15803d";
      ctx.fillText(`${score}% · ${doneSteps} of ${totalSteps} Steps`, p2X + pillW / 2, pillY + 28);

      // Pill 3: Streak
      const p3X = startPillX + (pillW + pillGap) * 2;
      ctx.fillStyle = "#fffbeb";
      ctx.beginPath();
      ctx.roundRect(p3X, pillY, pillW, pillH, 23);
      ctx.fill();
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = "700 14px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = "#b45309";
      ctx.fillText(`🔥 ${streak > 0 ? `${streak} Day Streak` : "Daily Focus Achieved"}`, p3X + pillW / 2, pillY + 28);

      // Category breakdown row (if available)
      const categories = Array.isArray(report?.categories) && report.categories.length > 0
        ? report.categories
        : [];
      if (categories.length > 0) {
        const displayed = categories.slice(0, 4);
        const catPillW = Math.min(180, Math.floor(640 / displayed.length));
        const catStartX = width / 2 - (displayed.length * catPillW) / 2;

        displayed.forEach((c, i) => {
          const cx = catStartX + i * catPillW + 6;
          ctx.fillStyle = "rgba(241, 245, 249, 0.9)";
          ctx.beginPath();
          ctx.roundRect(cx, 498, catPillW - 12, 30, 15);
          ctx.fill();
          ctx.strokeStyle = "#e2e8f0";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.textAlign = "center";
          ctx.font = "600 12px 'Plus Jakarta Sans', sans-serif";
          ctx.fillStyle = "#1e293b";
          ctx.fillText(`${c.name}: ${c.done}/${c.total}`, cx + (catPillW - 12) / 2, 517);
        });
      }

      // 10. Formal 3-Part Bottom Layout (Date, Official Seal, Cursive Signature)
      // Left Column: DATE Block
      ctx.textAlign = "center";
      const dateCenterX = 240;
      ctx.font = "700 11px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = "#94a3b8";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
      ctx.fillText("DATE", dateCenterX, 668);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      ctx.font = "700 16px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(dateStr.toUpperCase(), dateCenterX, 695);

      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(dateCenterX - 85, 712);
      ctx.lineTo(dateCenterX + 85, 712);
      ctx.stroke();

      ctx.font = "600 10px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#64748b";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "1.5px";
      ctx.fillText("OFFICIAL DAILY RECORD", dateCenterX, 729);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      // Center Column: Luxury Official Seal
      const sealX = width / 2;
      const sealY = 688;

      // Ribbon tails
      ctx.fillStyle = "#1e3a8a";
      ctx.beginPath();
      ctx.moveTo(sealX - 20, sealY + 34);
      ctx.lineTo(sealX - 30, sealY + 68);
      ctx.lineTo(sealX - 12, sealY + 58);
      ctx.lineTo(sealX, sealY + 72);
      ctx.lineTo(sealX + 12, sealY + 58);
      ctx.lineTo(sealX + 30, sealY + 68);
      ctx.lineTo(sealX + 20, sealY + 34);
      ctx.closePath();
      ctx.fill();

      // Outer gold / blue double circular stamp
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(sealX, sealY, 44, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#1d4ed8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sealX, sealY, 44, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(sealX, sealY, 39, 0, Math.PI * 2);
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.font = "900 8.5px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#1e3a8a";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
      ctx.fillText("★ VERIFIED ★", sealX, sealY - 14);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      ctx.font = "800 12px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.fillText("SEENTASKS", sealX, sealY);

      ctx.font = "700 8.5px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("CONSISTENCY", sealX, sealY + 14);

      ctx.font = "700 8.5px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("2026", sealX, sealY + 25);

      // Right Column: Cursive Handwritten Signature Block
      const sigCenterX = width - 240;

      // Beautiful Cursive Handwritten Signature: "Arigato Devan"
      ctx.textAlign = "center";
      ctx.font = "600 42px 'Dancing Script', 'Caveat', 'Great Vibes', 'Brush Script MT', cursive";
      ctx.fillStyle = "#0f172a";
      ctx.fillText("Arigato Devan", sigCenterX, 662);

      // Elegant fountain pen flourish curve
      ctx.strokeStyle = "#1e3a8a";
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(sigCenterX - 95, 668);
      ctx.bezierCurveTo(sigCenterX - 30, 678, sigCenterX + 35, 656, sigCenterX + 95, 668);
      ctx.stroke();

      // Signature line
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sigCenterX - 110, 712);
      ctx.lineTo(sigCenterX + 110, 712);
      ctx.stroke();

      // Printed Full Name
      ctx.font = "800 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = "#0f172a";
      if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
      ctx.fillText("KUMAR DEVANSHU", sigCenterX, 729);
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";

      // Official Title: Founder & CEO, Arigato Labs
      ctx.font = "600 12px 'Plus Jakarta Sans', 'Inter', sans-serif";
      ctx.fillStyle = "#2563eb";
      ctx.fillText("Founder & CEO, Arigato Labs", sigCenterX, 746);

      // 11. Bottom Official Watermark & ID
      ctx.font = "500 11px 'Plus Jakarta Sans', sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText("seentasks.com  ·  Arigato Labs Verified Certificate  ·  High-Resolution Certified Export", width / 2, 804);

      setGenerating(false);
    };

    // Ensure web fonts are ready before drawing to canvas
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        render();
      }).catch(() => {
        render();
      });
    } else {
      render();
    }

    return () => {
      cancelled = true;
    };
  }, [open, report, flow, dateStr, flowName, grade, score, streak, feedback]);

  async function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `seentasks-certificate-${flow?.name?.toLowerCase().replace(/\s+/g, "-") || "report"}-${report?.dateKey || "today"}.png`;
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
        aria-label="Certificate of Achievement"
      >
        <div className="share-modal-head">
          <div className="share-modal-title">
            <Award size={20} className="share-modal-award-icon" />
            <span>Certificate of Achievement</span>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <p className="share-modal-copy">
          Official Arigato Labs ✕ SeenTasks Certified Daily Consistency Card.
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
            <span>Download High-Res PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
