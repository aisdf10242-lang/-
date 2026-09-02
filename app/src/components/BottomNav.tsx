import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "대시보드", icon: "📊" },
  { to: "/settings", label: "설정", icon: "⚙️" },
];

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 z-10 border-t border-slate-800 bg-[var(--color-bg)]/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
                isActive ? "text-emerald-400" : "text-slate-500"
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
