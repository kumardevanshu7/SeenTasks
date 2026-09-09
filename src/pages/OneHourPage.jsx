import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTaskStore } from "../store/useTaskStore";
import { is1HrWorkFlow } from "../lib/flowService";

export default function OneHourPage() {
  const navigate = useNavigate();
  const followFlows = useTaskStore((s) => s.followFlows) || [];
  const addFollowFlow = useTaskStore((s) => s.addFollowFlow);
  const creatingRef = useRef(false);

  useEffect(() => {
    let target = followFlows.find((f) => is1HrWorkFlow(f));
    if (!target && !creatingRef.current) {
      creatingRef.current = true;
      target = addFollowFlow({
        name: "1 Hr Work",
        color: "amber",
        repeat: "daily",
        anyOrder: true,
        is1HrWork: true,
      });
    }
    if (target?.id) {
      navigate(`/app/flows/${target.id}`, { replace: true });
    }
  }, [followFlows, addFollowFlow, navigate]);

  return <div className="route-fallback" aria-hidden="true" />;
}
