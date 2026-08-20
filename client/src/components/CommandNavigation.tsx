import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { BookmarkCheck, BriefcaseBusiness, Compass, FileText, LayoutDashboard, Lightbulb, Search, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";

const destinations = [
  ["Dashboard", "/dashboard", LayoutDashboard], ["Recommendations", "/recommendations", Sparkles], ["Explore jobs", "/jobs", Compass], ["Saved roles", "/saved", BookmarkCheck], ["Applications", "/applications", BriefcaseBusiness], ["Career guidance", "/insights", Lightbulb], ["My profile", "/profile", UserRound], ["Onboarding", "/onboarding", FileText],
] as const;

export function CommandNavigation({ isAdmin }: { isAdmin?: boolean }) {
  const [, setLocation] = useLocation(); const [open, setOpen] = useState(false);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(value => !value); } }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, []);
  const items = isAdmin ? [...destinations, ["Manage jobs", "/admin/jobs", ShieldCheck] as const] : destinations;
  return <><Button variant="outline" className="hidden h-9 gap-2 rounded-xl border-[#dbe5ee] px-3 text-xs font-bold text-[#5c748d] md:flex" onClick={() => setOpen(true)}><Search className="h-3.5 w-3.5" />Search workspace <kbd className="rounded border border-[#dbe5ee] bg-[#f8fafc] px-1.5 py-0.5 text-[10px]">⌘K</kbd></Button><CommandDialog open={open} onOpenChange={setOpen}><CommandInput placeholder="Navigate Job Sarthi…" /><CommandList><CommandEmpty>No destination found.</CommandEmpty><CommandGroup heading="Workspace">{items.map(([label, href, Icon]) => <CommandItem key={href} value={label} onSelect={() => { setLocation(href); setOpen(false); }}><Icon className="mr-2 h-4 w-4" />{label}</CommandItem>)}</CommandGroup></CommandList></CommandDialog></>;
}
