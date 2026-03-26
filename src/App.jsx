import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Home from './pages/Home';
import Pricing from './pages/Pricing';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Campaigns from './pages/Campaigns';
import SocialHub from './pages/SocialHub';
import MediaStudio from './pages/MediaStudio';
import AdCreator from './pages/AdCreator';
import ScriptWriter from './pages/ScriptWriter';
import WebsiteScanner from './pages/WebsiteScanner';
import FunnelBuilder from './pages/FunnelBuilder';
import LeadCapturePage from './pages/LeadCapturePage';
import FollowUp from './pages/FollowUp';
import MediaLibrary from './pages/MediaLibrary';
import WebProjects from './pages/WebProjects';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import PostPaymentOnboarding from './pages/PostPaymentOnboarding';
import AdminDashboard from './pages/AdminDashboard';
import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login';


const PUBLIC_ROUTES = new Set(["/', '/Home", "/login", "/Pricing", "/PromoSignup", "/PostPaymentOnboarding", "/LeadCapturePage"]);

function ProtectedRoute({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("base44_access_token");
  if (!token) return <Navigate to="/Home" state={{ from: location.pathname }} replace />;
  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl gradient-magenta flex items-center justify-center shadow-lg shadow-magenta/20">
            <span className="text-white font-black">M</span>
          </div>
          <div className="w-8 h-8 border-2 border-white/10 border-t-magenta rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/onboarding" element={<PostPaymentOnboarding />} />

      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/social-hub" element={<SocialHub />} />
        <Route path="/media-studio" element={<MediaStudio />} />
        <Route path="/ad-creator" element={<AdCreator />} />
        <Route path="/script-writer" element={<ScriptWriter />} />
        <Route path="/website-scanner" element={<WebsiteScanner />} />
        <Route path="/funnel-builder" element={<FunnelBuilder />} />
        <Route path="/lead-capture" element={<LeadCapturePage />} />
        <Route path="/follow-up" element={<FollowUp />} />
        <Route path="/media-library" element={<MediaLibrary />} />
        <Route path="/web-projects" element={<WebProjects />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
});

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App