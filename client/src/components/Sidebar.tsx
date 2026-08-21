import { Link } from "wouter";
import { LayoutDashboard, UserPlus, Users, Building2, LogOut } from "lucide-react";
import logoImg from "@assets/ChatGPT_Image_Mar_10,_2026,_09_04_52_PM_1773156915193.png";

/** Keys that map each sidebar item to a dashboard section. */
export type SectionKey = "dashboard" | "addPatient" | "viewQueues" | "departments";

const navItems: { label: string; key: SectionKey; icon: React.ElementType }[] = [
  { label: "Dashboard",   key: "dashboard",   icon: LayoutDashboard },
  { label: "Add Patient", key: "addPatient",  icon: UserPlus },
  { label: "View Queues", key: "viewQueues",  icon: Users },
  { label: "Departments", key: "departments", icon: Building2 },
];

interface SidebarNavContentProps {
  /** Currently active section — controls which item is highlighted. */
  activeSection?: SectionKey;
  /** Called when a nav item is clicked, with the target section key. */
  onSectionClick?: (key: SectionKey) => void;
  /**
   * Generic fallback called after any nav action (kept for back-compat
   * with the onNavigate-only usage e.g. closing the drawer).
   * When onSectionClick is provided this is NOT needed — scrollToSection
   * in dashboard.tsx already closes the drawer.
   */
  onNavigate?: () => void;
}

/**
 * Reusable nav content rendered inside the Sheet drawer.
 * Nav items are <button> elements that trigger in-page scroll navigation.
 * Logout remains a <Link> (navigates to a different route).
 */
export function SidebarNavContent({
  activeSection = "dashboard",
  onSectionClick,
  onNavigate,
}: SidebarNavContentProps) {
  const handleNav = (key: SectionKey) => {
    if (onSectionClick) {
      onSectionClick(key);
    } else {
      // fallback: just close the drawer if no section handler provided
      onNavigate?.();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Branding */}
      <div className="p-6 flex items-center gap-3 border-b border-border/50">
        <img src={logoImg} alt="QueueCare Logo" className="h-10 object-contain" />
        <span className="text-xl font-bold text-foreground">QueueCare</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-4 py-6 space-y-2" aria-label="Dashboard sections">
        {navItems.map(({ label, key, icon: Icon }) => {
          const isActive = activeSection === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleNav(key)}
              aria-label={`Go to ${label} section`}
              aria-current={isActive ? "page" : undefined}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 group text-left
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
                ${isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"}
              `}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-primary transition-colors"
                }`}
              />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Logout — navigates to a different route, keeps Link */}
      <div className="p-4 border-t border-border/50">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Link>
      </div>
    </div>
  );
}
