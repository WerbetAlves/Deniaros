"use client";

import { useState, type ReactNode } from "react";

type HomeSecondaryTab = {
  id: string;
  label: string;
  title: string;
  children: ReactNode;
};

export function HomeSecondaryTabs({
  tabs,
  title = "Análises secundárias"
}: {
  tabs: HomeSecondaryTab[];
  title?: string;
}) {
  const [activeTabId, setActiveTabId] = useState(tabs[0]?.id ?? "");
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) {
    return null;
  }

  return (
    <section className="col-span-full rounded-lg border border-[#1D4D3A]/15 bg-[#FAF9F6] p-4 shadow-sm md:p-5">
      <header className="mb-4 flex flex-col gap-3 border-b border-stone-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</p>
          <h3 className="mt-1 font-serif text-2xl font-extrabold leading-none text-slate-900">
            {activeTab.title}
          </h3>
        </div>

        <div className="flex flex-wrap gap-2 rounded-md border border-stone-200 bg-stone-50 p-1">
          {tabs.map((tab) => {
            const active = tab.id === activeTab.id;

            return (
              <button
                aria-pressed={active}
                className={
                  active
                    ? "rounded-md bg-[#1D4D3A] px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-stone-50 shadow-sm"
                    : "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500 transition-colors duration-200 hover:bg-stone-100 hover:text-[#1D4D3A]"
                }
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="[&_.panel]:border-0 [&_.panel]:bg-transparent [&_.panel]:p-0 [&_.panel]:shadow-none [&_.panel]:before:hidden [&_.supporting-copy]:text-sm">
        {activeTab.children}
      </div>
    </section>
  );
}
