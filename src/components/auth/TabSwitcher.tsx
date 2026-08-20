export type AuthTab = "login" | "register";

interface TabSwitcherProps {
  active: AuthTab;
  onChange: (tab: AuthTab) => void;
}

const TABS: { id: AuthTab; label: string }[] = [
  { id: "login", label: "Connexion" },
  { id: "register", label: "Inscription" },
];

export default function TabSwitcher({ active, onChange }: TabSwitcherProps) {
  const activeIndex = TABS.findIndex((t) => t.id === active);

  return (
    <div
      role="tablist"
      aria-label="Authentification"
      className="relative grid grid-cols-2 rounded-xl border border-white/10 bg-white/5 p-1"
    >
      <span
        className="absolute inset-y-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-lantern to-mercenary shadow-[0_2px_12px_rgba(255,179,71,0.4)] transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${activeIndex * 100}%)`, left: 4 }}
      />
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          type="button"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={
            "relative z-10 rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200 " +
            (active === tab.id ? "text-[#1a1004]" : "text-white/60 hover:text-white/85")
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
