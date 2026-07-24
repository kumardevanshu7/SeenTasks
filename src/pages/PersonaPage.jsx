import { useState } from "react";
import { motion } from "framer-motion";
import { Apple, Briefcase, Check, Dumbbell, Gamepad2, GraduationCap, Heart, Palette, Sparkles, Sunrise, Target, UserCircle, UserRound, Wallet } from "lucide-react";
import { PERSONA_TRAITS } from "../lib/persona";
import { useTaskStore } from "../store/useTaskStore";

const ICONS = { UserRound, UserCircle, Apple, Briefcase, Dumbbell, Gamepad2, Palette, GraduationCap, Wallet, Heart, Sunrise, Target };

export default function PersonaPage() {
  const persona = useTaskStore((s) => s.persona);
  const setPersona = useTaskStore((s) => s.setPersona);
  const [selected, setSelected] = useState(persona);
  const [saved, setSaved] = useState(false);

  function toggle(id) {
    setSaved(false);
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  function save() {
    setPersona(selected);
    setSaved(true);
  }

  return (
    <div className="page narrow-page">
      <section className="simple-hero">
        <p className="eyebrow">Tell the guide who you are</p>
        <h1>Your persona</h1>
        <p>Pick what matters to you. The priority guide uses this to judge every task — and it will gently flag anything that works against your goals as a Danger Zone task.</p>
      </section>

      <section className="content-card persona-card">
        <div className="card-heading"><span className="heading-icon"><Sparkles size={18} /></span><div><h2>What describes you?</h2><p>{selected.length} selected · tap to choose</p></div></div>
        <div className="persona-grid">
          {PERSONA_TRAITS.map((trait) => {
            const active = selected.includes(trait.id);
            const Icon = ICONS[trait.icon] || Sparkles;
            return (
              <motion.button
                type="button"
                key={trait.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => toggle(trait.id)}
                className={`persona-chip${active ? " persona-chip-active" : ""}`}
              >
                <span className="persona-icon"><Icon size={18} /></span>
                <span className="persona-label">{trait.label}</span>
                {active && <span className="persona-check"><Check size={13} /></span>}
              </motion.button>
            );
          })}
        </div>
        <div className="persona-footer">
          <button className="button button-primary" onClick={save}>{saved ? "Saved ✓" : "Save my persona"}</button>
          {saved && <span className="persona-saved-note">New tasks will now be judged against your goals.</span>}
        </div>
      </section>
    </div>
  );
}
