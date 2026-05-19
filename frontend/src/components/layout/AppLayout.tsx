import { Outlet, Link, useLocation } from "react-router-dom"
import { WalletCards, Tags, Settings, LayoutDashboard, ReceiptText, Target, Shield } from "lucide-react"
import { useAuth } from "../../context/AuthContext";

export function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Cuentas", path: "/accounts", icon: WalletCards },
    { name: "Categorías", path: "/categories", icon: Tags },
    { name: "Deudas", path: "/debts", icon: ReceiptText },
    { name: "Metas", path: "/savings-goals", icon: Target },
    { name: "Ajustes", path: "/settings", icon: Settings },
  ];

  if (user?.role === "admin") {
    navItems.push({ name: "Admin", path: "/admin", icon: Shield });
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--color-outline-variant)] bg-[var(--color-surface-container-lowest)]/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="font-semibold text-lg text-[var(--color-on-surface)] flex items-center gap-6">
            <Link to="/" className="hover:text-[var(--color-primary)]">Expense Tracker</Link>
            
            <nav className="hidden md:flex items-center gap-4 text-sm font-normal">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                    location.pathname === item.path 
                      ? "bg-[var(--color-secondary-container)] text-[var(--color-on-secondary-container)] font-medium" 
                      : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
          <div className="text-sm text-[var(--color-on-surface-variant)]">
            v0.3
          </div>
        </div>
        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-[var(--color-outline-variant)] flex overflow-x-auto">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path}
              className={`flex-1 flex justify-center items-center gap-1.5 px-4 py-3 text-sm transition-colors whitespace-nowrap ${
                location.pathname === item.path 
                  ? "text-[var(--color-secondary)] border-b-2 border-[var(--color-secondary)] font-medium" 
                  : "text-[var(--color-on-surface-variant)]"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </Link>
          ))}
        </div>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
