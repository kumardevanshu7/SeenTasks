import { motion } from "framer-motion";
import { History } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore";

export default function RecallButton() {
  const recallIncomplete = useTaskStore((s) => s.recallIncomplete);
  const pastCount = useTaskStore((s) => s.getPastIncompleteCount());

  if (pastCount === 0) return null;

  return (
    <motion.button onClick={recallIncomplete} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.97 }} className="button button-secondary recall-button">
      <History size={16} /> Recall {pastCount} unfinished
    </motion.button>
  );
}
