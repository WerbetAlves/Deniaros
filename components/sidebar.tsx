"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { navigation, type NavigationItem } from "@/lib/navigation";
import type { UserProfile } from "@/lib/profile";

const sidebarCollapsedStorageKey = "deniaros-sidebar-collapsed";

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
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || showAdmin);
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
          aria-expanded={mobileMenuOpen}
          className={`mobile-dock-link mobile-dock-menu${mobileMenuOpen ? " active" : ""}`}
          onClick={() => setMobileMenuOpen((current) => !current)}
          type="button"
        >
          <span aria-hidden="true">
            <MenuIcon />
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
          <CloseIcon />
        </button>
      </div>

      <div className="sidebar-mobile-context">
        <small>Voce esta em</small>
        <strong>{activeNavigationItem?.label ?? "Deniaros"}</strong>
        <span>{activeNavigationItem?.description ?? "Escolha uma area para continuar."}</span>
      </div>

      <nav className="sidebar-nav" aria-label="Principal">
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
        <Link className="nav-item" href="/settings#idioma" title="Alterar idioma">
          <span className="nav-item-icon" aria-hidden="true">
            <GlobeIcon />
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
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M13 5h6v14h-6" />
                <path d="M10 8 5 12l5 4" />
                <path d="M5 12h11" />
              </svg>
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
  switch (icon) {
    case "home":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M3 11.5 12 4l9 7.5" />
          <path d="M6.5 9.5V20h11V9.5" />
        </svg>
      );
    case "wallet":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M4 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4z" />
          <path d="M4 7V6a2 2 0 0 1 2-2h11" />
          <circle cx="17" cy="12" r="1.2" />
        </svg>
      );
    case "bills":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M7 4h10v16H7z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </svg>
      );
    case "investments":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M5 18V9M12 18V6M19 18v-4" />
          <path d="M4 18h16" />
        </svg>
      );
    case "planner":
      return (
        <svg viewBox="0 0 24 24">
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M7 11h10M7 15h6" />
        </svg>
      );
    case "reports":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M5 19V5h14v14z" />
          <path d="M8 15v-3M12 15V9M16 15v-5" />
        </svg>
      );
    case "assistant":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M5 6.5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-5l-4 3v-3H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z" />
          <path d="M8 11h.01M12 11h.01M16 11h.01" />
        </svg>
      );
    case "decisions":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M12 4v16M12 9l6-5M12 15l-6 5" />
          <circle cx="12" cy="4" r="1.6" />
          <circle cx="18" cy="4" r="1.6" />
          <circle cx="6" cy="20" r="1.6" />
        </svg>
      );
    case "web":
      return (
        <svg viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 9h18M9 19V9" />
        </svg>
      );
    case "support":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M4 6h16v10H9l-5 4z" />
          <path d="M8 10h8M8 13h6" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" />
          <path d="M19 12a7 7 0 0 0-.1-1l2.1-1.6-2-3.4-2.5 1a7 7 0 0 0-1.7-1L14.4 3h-4.8l-.4 2.9a7 7 0 0 0-1.7 1l-2.5-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2.1 1.6 2 3.4 2.5-1a7 7 0 0 0 1.7 1l.4 2.9h4.8l.4-2.9a7 7 0 0 0 1.7-1l2.5 1 2-3.4-2.1-1.6c.1-.3.1-.7.1-1z" />
        </svg>
      );
    case "admin":
      return (
        <svg viewBox="0 0 24 24">
          <path d="M4 19V8l8-4 8 4v11z" />
          <path d="M8 19v-6h8v6M8 9h8" />
          <path d="M10 15h4" />
        </svg>
      );
    default:
      return null;
  }
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4c2.2 2.4 3.3 5 3.3 8s-1.1 5.6-3.3 8M12 4c-2.2 2.4-3.3 5-3.3 8s1.1 5.6 3.3 8" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M7 7l10 10M17 7 7 17" />
    </svg>
  );
}
