import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "@/components/DashboardLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Dashboard from "@/pages/Dashboard";
import Home from "@/pages/Home";
import Applications from "@/pages/Applications";
import CareerInsights from "@/pages/CareerInsights";
import JobDetail from "@/pages/JobDetail";
import Jobs from "@/pages/Jobs";
import NotFound from "@/pages/NotFound";
import Onboarding from "@/pages/Onboarding";
import Profile from "@/pages/Profile";
import Recommendations from "@/pages/Recommendations";
import { Route, Switch } from "wouter";

const SecureDashboard = () => <DashboardLayout><Dashboard /></DashboardLayout>;
const SecureOnboarding = () => <DashboardLayout><Onboarding /></DashboardLayout>;
const SecureProfile = () => <DashboardLayout><Profile /></DashboardLayout>;
const SecureJobs = () => <DashboardLayout><Jobs /></DashboardLayout>;
const SecureJobDetail = () => <DashboardLayout><JobDetail /></DashboardLayout>;
const SecureRecommendations = () => <DashboardLayout><Recommendations /></DashboardLayout>;
const SecureApplications = () => <DashboardLayout><Applications /></DashboardLayout>;
const SecureCareerInsights = () => <DashboardLayout><CareerInsights /></DashboardLayout>;

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/dashboard" component={SecureDashboard} /><Route path="/onboarding" component={SecureOnboarding} /><Route path="/profile" component={SecureProfile} /><Route path="/recommendations" component={SecureRecommendations} /><Route path="/insights" component={SecureCareerInsights} /><Route path="/applications" component={SecureApplications} /><Route path="/jobs/:id" component={SecureJobDetail} /><Route path="/jobs" component={SecureJobs} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
