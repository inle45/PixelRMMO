import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getDailyBounties, isBountyClaimed, claimBounty, type BountyTemplate } from "../../data/bounties";
import ecuIcon from "../../assets/icons/ecu.png";
import guardIcon from "../../assets/town/animations/guard-0.png";

interface GuardModalProps {
  onClose: () => void;
}

/** The Quartier de la Garde's daily bounty board — 3 flavor bounties, reshuffled once per calendar
 * day (getDailyBounties is seeded off the date), claimed outright rather than gated behind tracking
 * an actual kill count, the same "no real backend to enforce it" honesty the rest of the app keeps. */
export default function GuardModal({ onClose }: GuardModalProps) {
  // setClaimedFlash's own state update is what forces the re-render that picks up isBountyClaimed's
  // fresh localStorage read below — no separate version counter needed on top of it.
  const [claimedFlash, setClaimedFlash] = useState<string | null>(null);
  const bounties = useMemo(() => getDailyBounties(), []);

  function handleClaim(bounty: BountyTemplate) {
    const result = claimBounty(bounty);
    if (!result) return;
    setClaimedFlash(bounty.id);
    setTimeout(() => setClaimedFlash(null), 900);
  }

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 py-8 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#12111a]/95 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={guardIcon} alt="" className="h-8 w-8 object-contain" style={{ imageRendering: "pixelated" }} />
            <div>
              <h2 className="text-sm font-bold text-white">Quartier de la Garde</h2>
              <p className="text-[10px] text-white/45">Primes journalières — renouvelées chaque jour.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-sm text-white/80 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-3 space-y-2">
          {bounties.map((bounty) => {
            const claimed = isBountyClaimed(bounty.id);
            return (
              <div key={bounty.id} className={"rounded-xl border p-3 transition-colors " + (claimed ? "border-white/5 bg-white/[0.02] opacity-50" : "border-white/10 bg-white/[0.04]")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white">{bounty.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/55">{bounty.description}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="flex items-center gap-1 rounded-full bg-black/25 px-1.5 py-0.5 text-[9px] font-bold text-white/70">
                        <img src={ecuIcon} alt="" className="h-3 w-3" style={{ imageRendering: "pixelated" }} />
                        {bounty.ecus}
                      </span>
                      <span className="rounded-full bg-lantern/15 px-1.5 py-0.5 text-[9px] font-bold text-lantern-glow">+{bounty.xp} XP</span>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => handleClaim(bounty)}
                    disabled={claimed}
                    animate={claimedFlash === bounty.id ? { scale: [1, 1.15, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className={
                      "shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition-opacity " +
                      (claimed ? "cursor-not-allowed bg-white/10 text-white/35" : "bg-gradient-to-r from-lantern to-lantern-glow text-black hover:opacity-90")
                    }
                  >
                    {claimed ? "Réclamée" : "Réclamer"}
                  </motion.button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
