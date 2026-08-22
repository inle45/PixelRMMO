import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getDailyBounties, isBountyClaimed, claimBounty, canCompleteBounty, resolveRequirements, type BountyTemplate } from "../../data/bounties";
import TownPanel from "./TownPanel";
import ecuIcon from "../../assets/icons/ecu.png";
import guardIcon from "../../assets/town/animations/guard-0.png";

interface GuardStationProps {
  onClose?: () => void;
}

/**
 * The Quartier de la Garde's daily contract board.
 *
 * Every bounty is a *turn-in*: you hand over materials looted in the Crypte as proof of the deed,
 * and the button only lights up once your bag actually holds them. That's what makes a bounty
 * claimable for a reason — an earlier version was a free "Réclamer" button with nothing gating it,
 * which is indistinguishable from a cheat code. There's no kill tracker in this game, but the loot
 * table already is one: you can only own a Glande de Venin if you fought a tomb spider for it.
 */
export default function GuardStation({ onClose }: GuardStationProps) {
  const [version, setVersion] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);
  const bounties = useMemo(() => getDailyBounties(), []);

  function handleClaim(bounty: BountyTemplate) {
    if (!claimBounty(bounty)) return;
    setFlashId(bounty.id);
    setTimeout(() => setFlashId(null), 900);
    setVersion((v) => v + 1);
  }

  return (
    <TownPanel
      title="Quartier de la Garde"
      subtitle="Contrats du jour — rapportez les preuves, touchez la prime."
      icon={guardIcon}
      onClose={onClose}
    >
      <div className="mt-3 space-y-2">
        {bounties.map((bounty) => {
          // `version` is read here purely to re-trigger these localStorage reads after a claim.
          void version;
          const claimed = isBountyClaimed(bounty.id);
          const ready = !claimed && canCompleteBounty(bounty);
          const reqs = resolveRequirements(bounty);

          return (
            <div
              key={bounty.id}
              className={"rounded-xl border p-3 transition-colors " + (claimed ? "border-white/5 bg-white/[0.02] opacity-50" : "border-white/10 bg-white/[0.04]")}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-white">{bounty.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-white/55">{bounty.description}</p>

                  <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-white/35">À rapporter</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {reqs.map(({ req, material, owned }) =>
                      material ? (
                        <span
                          key={req.materialId}
                          title={material.name}
                          className={
                            "flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold " +
                            (owned >= req.qty ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300")
                          }
                        >
                          <img src={material.icon} alt="" className="h-3.5 w-3.5" style={{ imageRendering: "pixelated" }} />
                          <span className="max-w-[86px] truncate">{material.name}</span>
                          {Math.min(owned, req.qty)}/{req.qty}
                        </span>
                      ) : null
                    )}
                  </div>

                  <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-white/35">Récompense</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
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
                  disabled={!ready}
                  animate={flashId === bounty.id ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.4 }}
                  className={
                    "shrink-0 self-center rounded-lg px-3 py-2 text-[10px] font-bold transition-opacity " +
                    (ready ? "bg-gradient-to-r from-lantern to-lantern-glow text-black hover:opacity-90" : "cursor-not-allowed bg-white/10 text-white/35")
                  }
                >
                  {claimed ? "Terminé" : ready ? "Livrer" : "Incomplet"}
                </motion.button>
              </div>
            </div>
          );
        })}
      </div>
    </TownPanel>
  );
}
