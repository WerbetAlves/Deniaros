"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Bot,
  CalendarClock,
  ChartColumnBig,
  ChartNoAxesColumnIncreasing,
  GitFork,
  Globe,
  House,
  LifeBuoy,
  LogOut,
  Menu,
  PanelTop,
  ReceiptText,
  Settings,
  ShieldCheck,
  WalletCards,
  X,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { navigation, type NavigationItem } from "@/lib/navigation";
import type { UserProfile } from "@/lib/profile";

const sidebarCollapsedStorageKey = "deniaros-sidebar-collapsed";
const showWindowsOnlyNavigation = process.env.NEXT_PUBLIC_DENIAROS_WINDOWS_APP === "1";

export function Sidebar({
  showAdmin = false,
  profile,
  userEmail
}: {
  showAdmin?: boolean;
  profile?: UserProfile;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const profileName = profile?.displayName ?? userEmail?.split("@")[0] ?? "Usuário";
  const profileInitials = getProfileInitials(profileName);
  const visibleNavigation = navigation.filter((item) => {
    if (item.adminOnly && !showAdmin) {
      return false;
    }

    if (item.isWindowsOnly && !showWindowsOnlyNavigation) {
      return false;
    }

    return true;
  });
  const activeNavigationItem = visibleNavigation.find((item) => isActivePath(pathname, item.href));
  const mobileDockItems = getMobileDockItems(visibleNavigation, activeNavigationItem);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(sidebarCollapsedStorageKey);
    if (storedValue === "1") {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    const width = collapsed ? "88px" : "284px";
    document.documentElement.style.setProperty("--sidebar-width", width);
    window.localStorage.setItem(sidebarCollapsedStorageKey, collapsed ? "1" : "0");

    return () => {
      document.documentElement.style.removeProperty("--sidebar-width");
    };
  }, [collapsed]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 721px)");

    function closeMobileMenuOnDesktop() {
      if (mediaQuery.matches) {
        setMobileMenuOpen(false);
      }
    }

    closeMobileMenuOnDesktop();
    mediaQuery.addEventListener("change", closeMobileMenuOnDesktop);

    return () => {
      mediaQuery.removeEventListener("change", closeMobileMenuOnDesktop);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    document.body.classList.add("mobile-sidebar-lock");
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.classList.remove("mobile-sidebar-lock");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className="mobile-nav-dock" aria-label="Navegacao rapida">
        {mobileDockItems.map((item) => {
          const isActive = isActivePath(pathname, item.href);

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={`mobile-dock-link${isActive ? " active" : ""}`}
              href={item.href}
              key={item.id}
            >
              <span aria-hidden="true">
                <NavigationIcon icon={item.icon} />
              </span>
              <small>{item.shortLabel ?? item.label}</small>
            </Link>
          );
        })}
        <button
          aria-label="Abrir menu completo"
          aria-expanded={mobileMenuOpen}
          className={`mobile-dock-link mobile-dock-menu${mobileMenuOpen ? " active" : ""}`}
          onClick={() => setMobileMenuOpen((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">
            <Menu strokeWidth={2.4} />
          </span>
          <small>Menu</small>
        </button>
      </nav>

      <button
        aria-label="Fechar menu principal"
        className={`sidebar-mobile-backdrop${mobileMenuOpen ? " visible" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
        type="button"
      />

      <aside
        aria-label="Menu principal"
        className={`sidebar${collapsed ? " collapsed" : ""}${mobileMenuOpen ? " mobile-open" : ""}`}
      >
      <div className="brand">
        <div className="brand-mark brand-mark-image">
          <Image
            alt="Logo Deniaros"
            className="brand-logo-clean"
            height={50}
            priority
            src="/brand/logo-icone-isolado-limpo.png"
            width={50}
          />
        </div>
        <div className="brand-copy">
          <p>Controle com previsão</p>
          <h1>Deniaros</h1>
        </div>
        <button
          aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          className="sidebar-toggle"
          onClick={() => setCollapsed((current) => !current)}
          type="button"
        >
          {collapsed ? ">" : "<"}
        </button>
        <button
          aria-label="Fechar menu"
          className="sidebar-mobile-close"
          onClick={() => setMobileMenuOpen(false)}
          type="button"
        >
          <X aria-hidden="true" strokeWidth={2.4} />
        </button>
      </div>

      <div className="sidebar-mobile-context">
        <small>Voce esta em</small>
        <strong>{activeNavigationItem?.label ?? "Deniaros"}</strong>
        <span>{activeNavigationItem?.description ?? "Escolha uma area para continuar."}</span>
      </div>

      <nav className="sidebar-nav" aria-label="Principal">
        <span className="sidebar-mobile-section-label">Navegar</span>
        {visibleNavigation.map((item) => {
            const isActive = isActivePath(pathname, item.href);

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                key={item.id}
                className={`nav-item${isActive ? " active" : ""}`}
                href={item.href}
                title={`${item.label}: ${item.description}${item.isWindowsOnly ? " (Windows)" : ""}`}
              >
                <span className="nav-item-icon" aria-hidden="true">
                  <NavigationIcon icon={item.icon} />
                </span>
                <span className="nav-item-label">{item.label}</span>
                {item.isWindowsOnly ? <span className="nav-item-tag">Windows</span> : null}
              </Link>
            );
          })}
      </nav>

      <div className="sidebar-utility-group">
        <span className="sidebar-mobile-section-label">Sistema</span>
        <Link className="nav-item" href="/settings#idioma" title="Alterar idioma">
          <span className="nav-item-icon" aria-hidden="true">
            <Globe strokeWidth={2.15} />
          </span>
          <span className="nav-item-label">Idioma</span>
        </Link>
      </div>

      <div className="sidebar-meta">
        <div className="sidebar-profile-card">
          <Link className="sidebar-profile-main" href="/profile" title="Perfil do usuário">
            <span className="user-avatar user-avatar-sm">
              {profile?.avatarUrl ? <img alt={`Foto de ${profileName}`} src={profile.avatarUrl} /> : profileInitials}
            </span>
            <span>
              <small>Perfil ativo</small>
              <strong>{profileName}</strong>
            </span>
          </Link>
          <form action={signOut} className="sidebar-profile-logout-form">
            <button
              aria-label="Sair da conta"
              className="sidebar-profile-logout"
              title="Sair"
              type="submit"
            >
              <LogOut aria-hidden="true" strokeWidth={2.2} />
            </button>
          </form>
        </div>

        <section className="sidebar-card">
          <p className="section-label">Foco da semana</p>
          <strong>Agenda financeira viva</strong>
          <p>
            O MVP prova saldo atual, vencimentos e previsão curta no mesmo fluxo.
          </p>
        </section>

        <section className="sidebar-card">
          <p className="section-label">Plataformas</p>
          <strong>Web primeiro, base compartilhada</strong>
          <p>
            Esta estrutura já nasce pensada para virar a base da versão Windows
            e do app.
          </p>
        </section>
      </div>
      </aside>
    </>
  );
}

function getProfileInitials(displayName: string) {
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "D";
}

function getMobileDockItems(
  visibleNavigation: NavigationItem[],
  activeNavigationItem?: NavigationItem
) {
  const preferredIds = ["home", "bills", "assistant"];
  const items: NavigationItem[] = [];

  for (const id of preferredIds) {
    const item = visibleNavigation.find((navigationItem) => navigationItem.id === id);

    if (item) {
      items.push(item);
    }
  }

  if (activeNavigationItem && !items.some((item) => item.id === activeNavigationItem.id)) {
    items.splice(1, 0, activeNavigationItem);
  }

  return items.slice(0, 3);
}

function isActivePath(pathname: string, href: string) {
  if (href === "#") {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationIcon({ icon }: { icon: NavigationItem["icon"] }) {
  const iconMap: Record<NavigationItem["icon"], LucideIcon> = {
    admin: ShieldCheck,
    assistant: Bot,
    bills: ReceiptText,
    decisions: GitFork,
    home: House,
    investments: ChartNoAxesColumnIncreasing,
    planner: CalendarClock,
    reports: ChartColumnBig,
    settings: Settings,
    support: LifeBuoy,
    wallet: WalletCards,
    web: PanelTop
  };
  const Icon = iconMap[icon];

  return <Icon aria-hidden="true" strokeWidth={2.15} />;
}
