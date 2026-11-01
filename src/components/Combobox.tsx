import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ShieldCheck, Eye, Lock, Check, ChevronDown } from "lucide-react";

export type PolicyOption = "hybrid" | "audit" | "strict";

interface ComboboxProps {
  value: PolicyOption;
  onChange: (value: PolicyOption) => void;
  className?: string;
}

interface OptionConfig {
  id: PolicyOption;
  label: string;
  badge: string;
  badgeClass: string;
  desc: string;
  icon: typeof ShieldCheck;
}

const POLICY_OPTIONS: OptionConfig[] = [
  {
    id: "hybrid",
    label: "Mode Hybride (Human-in-the-Loop)",
    badge: "Recommandé",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    desc: "Tolérance 4s. Arbitrage réservé au surveillant humain sans interruption brutale.",
    icon: ShieldCheck,
  },
  {
    id: "audit",
    label: "Mode Pédagogique (Audit Trail)",
    badge: "Audit seul",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    desc: "Journalisation transparente sans blocage, pour examens blancs ou TP.",
    icon: Eye,
  },
  {
    id: "strict",
    label: "Mode Strict (Concours Certifié)",
    badge: "Strict",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    desc: "Clôture immédiate au 3ème strike avéré conformément au règlement du concours.",
    icon: Lock,
  },
];

export function PolicyCombobox({ value, onChange, className = "" }: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(() =>
    POLICY_OPTIONS.findIndex((opt) => opt.id === value)
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = POLICY_OPTIONS.find((opt) => opt.id === value) || POLICY_OPTIONS[0];
  const SelectedIcon = selectedOption.icon;

  // Fermer le menu lors d'un clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Synchroniser l'index surligné quand la valeur change ou à l'ouverture
  useEffect(() => {
    const idx = POLICY_OPTIONS.findIndex((opt) => opt.id === value);
    if (idx !== -1) setHighlightedIndex(idx);
  }, [value, isOpen]);

  const handleSelect = (id: PolicyOption) => {
    onChange(id);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % POLICY_OPTIONS.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + POLICY_OPTIONS.length) % POLICY_OPTIONS.length);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (POLICY_OPTIONS[highlightedIndex]) {
          handleSelect(POLICY_OPTIONS[highlightedIndex].id);
        }
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={`relative inline-block text-left w-full sm:w-auto ${className}`}
    >
      {/* Bouton Déclencheur Combobox */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Politique actuelle : ${selectedOption.label}. Cliquez pour modifier.`}
        className="group w-full sm:w-auto min-h-[42px] inline-flex items-center justify-between gap-2.5 rounded-xl border border-zinc-700/80 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-100 hover:border-emerald-500/50 hover:bg-zinc-800/90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-sm"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-800 text-emerald-400 group-hover:text-emerald-300 shrink-0">
            <SelectedIcon size={14} />
          </div>
          <span className="font-semibold text-zinc-200 truncate">
            {selectedOption.label.split(" (")[0]}
          </span>
          <span
            className={`hidden min-[420px]:inline-flex rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold border ${selectedOption.badgeClass}`}
          >
            {selectedOption.badge}
          </span>
        </div>

        <ChevronDown
          size={15}
          className={`text-zinc-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-emerald-400" : "group-hover:text-zinc-200"
          }`}
        />
      </button>

      {/* Menu Déroulant Élégant (Popover) */}
      {isOpen && (
        <div
          role="listbox"
          tabIndex={-1}
          aria-label="Options de politique d'examen"
          className="absolute right-0 left-0 sm:left-auto sm:w-80 mt-2 z-50 rounded-2xl border border-zinc-800 bg-zinc-950/98 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-zinc-800/80 animate-in fade-in zoom-in-95 duration-150 space-y-1"
        >
          <div className="px-3 py-1.5 border-b border-zinc-800/80 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
            Politique de Surveillance
          </div>

          {POLICY_OPTIONS.map((option, idx) => {
            const isSelected = option.id === value;
            const isHighlighted = idx === highlightedIndex;
            const Icon = option.icon;

            return (
              <div
                key={option.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.id)}
                onMouseEnter={() => setHighlightedIndex(idx)}
                className={`group flex items-start justify-between gap-3 rounded-xl p-2.5 cursor-pointer transition-all min-h-[48px] select-none ${
                  isSelected
                    ? "bg-zinc-800/90 text-white"
                    : isHighlighted
                    ? "bg-zinc-900 text-zinc-200"
                    : "text-zinc-300 hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg border shrink-0 ${
                      isSelected
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                        : "bg-zinc-800 border-zinc-700/60 text-zinc-400 group-hover:text-zinc-200"
                    }`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-100">
                        {option.label}
                      </span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] font-mono font-semibold border ${option.badgeClass}`}
                      >
                        {option.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug line-clamp-2">
                      {option.desc}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 mt-1">
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-zinc-950 shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
