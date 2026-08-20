import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/BrandMark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { BookmarkCheck, BriefcaseBusiness, Compass, LayoutDashboard, Lightbulb, LogOut, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { NotificationMenu } from "./NotificationMenu";
import { CommandNavigation } from "./CommandNavigation";

const navigation = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "/recommendations", label: "For you", icon: Sparkles },
  { path: "/insights", label: "Career guidance", icon: Lightbulb },
  { path: "/jobs", label: "Explore jobs", icon: Compass },
  { path: "/saved", label: "Saved roles", icon: BookmarkCheck },
  { path: "/applications", label: "Applications", icon: BriefcaseBusiness },
  { path: "/profile", label: "My profile", icon: UserRound },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  if (loading) return <DashboardLayoutSkeleton />;
  if (!user) return <div className="landing-grid grid min-h-screen place-items-center bg-[#f7faff] p-5"><div className="w-full max-w-md rounded-3xl border border-[#dbe6f1] bg-white p-8 text-center surface-shadow"><div className="mx-auto w-fit"><BrandMark /></div><h1 className="mt-9 font-display text-3xl font-semibold tracking-[-.05em] text-[#112b51]">Your career space is ready.</h1><p className="mt-4 text-sm leading-6 text-[#66778b]">Sign in to build your profile, explore relevant roles, and keep your applications in one place.</p><Button className="pressable mt-7 h-11 w-full rounded-xl bg-[#0d2c58] font-bold hover:bg-[#12386d]" onClick={() => startLogin()}>Sign in to continue</Button></div></div>;
  return <SidebarProvider><CandidateShell>{children}</CandidateShell></SidebarProvider>;
}

function CandidateShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const initials = (user?.name || user?.email || "U").slice(0, 1).toUpperCase();
  const active = navigation.find(item => item.path === location)?.label ?? "Job Sarthi";
  const visibleNavigation = user?.role === "admin" ? [...navigation, { path: "/admin/jobs", label: "Manage jobs", icon: ShieldCheck }] : navigation;
  return <><Sidebar collapsible="icon" className="border-r border-[#e5ebf2] bg-white"><SidebarHeader className="h-[72px] border-b border-[#edf1f5] px-4"><div className="flex h-full items-center"><BrandMark /></div></SidebarHeader><SidebarContent className="px-3 py-5"><p className="eyebrow mb-2 px-3 text-[#8a9aae] group-data-[collapsible=icon]:hidden">Workspace</p><SidebarMenu>{visibleNavigation.map(item => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={location === item.path} onClick={() => setLocation(item.path)} tooltip={item.label} className="h-10 rounded-lg font-semibold text-[#53687f] data-[active=true]:bg-[#eaf2fb] data-[active=true]:text-[#183f70]"><item.icon className="h-4 w-4" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarContent><SidebarFooter className="border-t border-[#edf1f5] p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl p-2 text-left outline-none transition-colors hover:bg-[#f5f8fb] focus-visible:ring-2 focus-visible:ring-[#4975a8]"><Avatar className="h-8 w-8"><AvatarFallback className="bg-[#e7f2ee] text-xs font-extrabold text-[#1f6f60]">{initials}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-bold text-[#25415e]">{user?.name || "Your profile"}</p><p className="truncate text-xs text-[#78899b]">{user?.email || "Signed in"}</p></div></button></DropdownMenuTrigger><DropdownMenuContent align="end" side="top" className="w-48"><DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu></SidebarFooter></Sidebar><SidebarInset className="bg-[#f8fafc]"><header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-[#e7edf3] bg-white/85 px-4 backdrop-blur sm:px-7"><SidebarTrigger className="rounded-lg text-[#56718d]" /><div><p className="text-[.67rem] font-bold uppercase tracking-[.12em] text-[#8a99aa]">Job Sarthi</p><h1 className="text-sm font-extrabold tracking-[-.025em] text-[#203d5d]">{active}</h1></div><CommandNavigation isAdmin={user?.role === "admin"} /><NotificationMenu /></header><main className="mx-auto w-full max-w-[1440px] p-4 sm:p-7">{children}</main></SidebarInset></>;
}
