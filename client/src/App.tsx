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
import SavedJobs from "@/pages/SavedJobs";
import AdminJobs from "@/pages/AdminJobs";
import ApplicationDetail from "@/pages/ApplicationDetail";
import Notifications from "@/pages/Notifications";
import AdminJobReview from "@/pages/AdminJobReview";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Security from "@/pages/Security";
import { Route, Switch } from "wouter";

const protectedPage = (Page: React.ComponentType) => () => <DashboardLayout><Page /></DashboardLayout>;
const SecureDashboard = protectedPage(Dashboard);
const SecureOnboarding = protectedPage(Onboarding);
const SecureProfile = protectedPage(Profile);
const SecureSecurity = protectedPage(Security);
const SecureJobs = protectedPage(Jobs);
const SecureJobDetail = protectedPage(JobDetail);
const SecureRecommendations = protectedPage(Recommendations);
const SecureApplications = protectedPage(Applications);
const SecureApplicationDetail = protectedPage(ApplicationDetail);
const SecureNotifications = protectedPage(Notifications);
const SecureAdminJobReview = protectedPage(AdminJobReview);
const SecureCareerInsights = protectedPage(CareerInsights);
const SecureSavedJobs = protectedPage(SavedJobs);
const SecureAdminJobs = protectedPage(AdminJobs);

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/login" component={Login} />
    <Route path="/register" component={Register} />
    <Route path="/forgot-password" component={ForgotPassword} />
    <Route path="/reset-password" component={ResetPassword} />
    <Route path="/dashboard" component={SecureDashboard} />
    <Route path="/onboarding" component={SecureOnboarding} />
    <Route path="/profile" component={SecureProfile} />
    <Route path="/security" component={SecureSecurity} />
    <Route path="/recommendations" component={SecureRecommendations} />
    <Route path="/insights" component={SecureCareerInsights} />
    <Route path="/saved" component={SecureSavedJobs} />
    <Route path="/notifications" component={SecureNotifications} />
    <Route path="/applications/:id" component={SecureApplicationDetail} />
    <Route path="/applications" component={SecureApplications} />
    <Route path="/admin/jobs/review" component={SecureAdminJobReview} />
    <Route path="/admin/jobs" component={SecureAdminJobs} />
    <Route path="/jobs/:id" component={SecureJobDetail} />
    <Route path="/jobs" component={SecureJobs} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
