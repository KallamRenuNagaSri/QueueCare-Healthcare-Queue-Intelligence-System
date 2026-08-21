import { Search, User, Menu } from "lucide-react";
import logoImg from "@assets/ChatGPT_Image_Mar_10,_2026,_09_04_52_PM_1773156915193.png";

interface HeaderProps {
  /** Called when the hamburger button is clicked */
  onMenuClick: () => void;
  /** Whether the nav drawer is currently open — controls aria-label */
  navOpen: boolean;
}

export function Header({ onMenuClick, navOpen }: HeaderProps) {
  const email = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;
  const displayName = email || "Staff";

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-20 flex items-center justify-between px-4 md:px-8">

      {/* Left: hamburger + logo + app name */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label={navOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={navOpen}
          aria-controls="nav-drawer"
          className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="QueueCare Logo" className="h-8 object-contain" />
          <span className="text-lg font-bold text-foreground hidden sm:inline">QueueCare</span>
        </div>
      </div>

      {/* Centre: search bar */}
      <div className="flex items-center bg-secondary rounded-full px-4 py-2 w-64 md:w-96 border border-border/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all mx-4">
        <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          placeholder="Search patients, ID, or departments..."
          className="bg-transparent border-none outline-none w-full ml-3 text-sm placeholder:text-muted-foreground"
        />
      </div>

      {/* Right: user profile */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-4 border-l border-border/50 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">Admin Desk</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:shadow-md transition-all">
            <User className="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>
    </header>
  );
}
