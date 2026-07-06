import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import "./App.css";
import { applyTenantBranding } from "./utils/applyTenantBranding";

import Login from "./pages/auth/login";
import Layout from "./navbar/Layout";
import PrivateRoute from "./pages/auth/PrivateRoute";

// SuperAdmin Files
import SuperAdminRoute from "./pages/auth/SuperAdminRoute";
import SuperAdminLogin from "./pages/auth/SuperAdminLogin";
import SuperAdminLayout from "./pages/superadmin/SuperAdminLayout";
import SuperAdminDashboard from "./pages/superadmin/SuperAdminDashboard";
import SuperAdminTenants from "./pages/superadmin/SuperAdminTenants";
import CreateTenant from "./pages/superadmin/CreateTenant";
import SuperAdminSettings from "./pages/superadmin/SuperAdminSettings";
import SuperAdminProfile from "./pages/superadmin/SuperAdminProfile";
import SubscriptionPlans from "./pages/superadmin/SubscriptionPlans";
import CreatePlan from "./pages/superadmin/SubscriptionPlans/CreatePlan";
import EditPlan from "./pages/superadmin/SubscriptionPlans/EditPlan";
import PlanDetail from "./pages/superadmin/SubscriptionPlans/PlanDetail";
import UpgradePlan from "./pages/superadmin/SubscriptionPlans/UpgradePlan";
import ViewPlans from "./pages/superadmin/SubscriptionPlans/ViewPlans";
import UpgradeRequests from "./pages/superadmin/UpgradeRequests";
import TenantDetail from "./pages/superadmin/TenantDetail";

// Providers
import { NotificationProvider } from "./context/NotificationContext";
import { SocketProvider } from "./context/SocketContext";
import { TargetSocketProvider } from "./context/TargetSocketContext";

// Pages
import AdminDashboard from "./AdminDashboard/dashboard";
import Leads from "./pages/Leads/Leads";
import RejectedLeads from "./pages/Leads/RejectedLeads";
import CreateLeads from "./pages/Leads/CreateLeads";
import { AllDeals } from "./pages/Deals/allDeals";
import RejectedDeals from "./pages/Deals/RejectedDeals";
import CreateDeal from "./pages/Deals/CreateDeal";
import Pipeline_view from "./pages/Pipeline_View/Pipelien_view";
import Pipeline_modal_view from "./pages/Pipeline_View/Pipeline_modal_view";
import ProposalHead from "./pages/proposal/ProposalHead";
import SendProposal from "./pages/proposal/SendProposal";
import DraftsPage from "./pages/proposal/DraftsPage";
import InvoiceHead from "./pages/invoice/InvoiceHead";
import InvoiceView from "./pages/invoice/InvoiceView";
import CalendarView from "./pages/activities/CalendarView";
import Activity from "./pages/activityList/Activity";
import UserManagement from "./pages/useroles/UserManagement";
import ReportsPage from "./pages/reports/ReportsPage";
import EmailChat from "./pages/Email_chat/EmailChat";
import MassEmail from "./pages/Email/MassEmail";
import CreateEmail from "./pages/Email/CreateEmail";
import ScheduledEmails from "./pages/Email/ScheduledEmails";
import EmailHistory from "./pages/Email/EmailHistory";
import Settings from "./pages/settings/Settings";
import NotificationsPage from "./pages/notification/NotificationsPage";
import ViewLead from "./pages/Leads/ViewLead";
import ViewProposal from "./pages/proposal/ViewProposal";

import DealIntelligenceDashboard from "./pages/Dealmetrics/pipeline";
import LostDealAnalytics from "./pages/LostDealModal/Lostdealreason";
import CLVDashboard from "./pages/Clv/CLVDashboard";
import ClientCLVDetails from "./pages/Clv/ClientCLVDetails";
import AllStreakLeaderboard from "./pages/streak/AllStreakLeaderboard";

import { Meetings } from "./pages/meetings/Meetings";
import GoogleIntegration from "./pages/settings/GoogleIntegration";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import WebsiteContactForm from "./pages/website/WebsiteContactForm";
import TaskManagement from "./pages/tasks/TaskManagement";
import AssignedTasks from "./pages/tasks/AssignedTasks";
import TargetManagement from "./pages/targets/TargetManagement";
import MyTargets from "./pages/targets/MyTargets";
import ResetPassword from "./pages/password/ResetPassword";
import Integrations from "./pages/integrations/Integrations";
import FacebookCallback from "./pages/integrations/FacebookCallback";
import LinkedInCallback from "./pages/integrations/LinkedInCallback";
import MessagesPage from "./pages/Messages/MessagesPage";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const { token, slug } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token && slug) {
      applyTenantBranding();
    }
  }, [token, slug]);

  useEffect(() => {
    // 1. Browser Close Session Tracker (using BroadcastChannel and sessionStorage)
    const sessionActive = sessionStorage.getItem("sessionActive");
    if (!sessionActive) {
      const channel = new BroadcastChannel("crm_tab_keepalive");
      let responded = false;

      const handleMessage = (e) => {
        if (e.data.type === "PONG") {
          responded = true;
          sessionStorage.setItem("sessionActive", "true");
        }
      };
      channel.addEventListener("message", handleMessage);

      // Ping other tabs
      channel.postMessage({ type: "PING" });

      // If no response in 300ms, this is a fresh browser session with no other tabs open
      setTimeout(() => {
        if (!responded) {
          // No other tabs are open and sessionStorage is fresh -> clear old localStorage session
          localStorage.removeItem("token");
          localStorage.removeItem("tenantSlug");
          localStorage.removeItem("user");
          localStorage.removeItem("lastActivity");
        }
        channel.removeEventListener("message", handleMessage);
        channel.close();
      }, 300);
    }

    // Set up responder for other new tabs
    const responderChannel = new BroadcastChannel("crm_tab_keepalive");
    const handlePing = (e) => {
      if (e.data.type === "PING" && localStorage.getItem("token")) {
        responderChannel.postMessage({ type: "PONG" });
      }
    };
    responderChannel.addEventListener("message", handlePing);

    // 2. Inactivity Auto-Logout (30 Minutes)
    let lastUpdate = 0;
    const updateActivity = () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const now = Date.now();
      if (now - lastUpdate > 5000) {
        localStorage.setItem("lastActivity", now.toString());
        lastUpdate = now;
      }
    };

    // Add activity listeners
    const activityEvents = ["mousedown", "keydown", "scroll", "click", "touchstart"];
    activityEvents.forEach(event => window.addEventListener(event, updateActivity));

    // Initialize lastActivity if logged in
    if (localStorage.getItem("token") && !localStorage.getItem("lastActivity")) {
      localStorage.setItem("lastActivity", Date.now().toString());
    }

    // Check inactivity every 10 seconds
    const interval = setInterval(() => {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const lastActivity = parseInt(localStorage.getItem("lastActivity") || "0");
      if (lastActivity > 0 && Date.now() - lastActivity > 30 * 60 * 1000) {
        // Logout user
        localStorage.removeItem("token");
        localStorage.removeItem("tenantSlug");
        localStorage.removeItem("user");
        localStorage.removeItem("lastActivity");
        sessionStorage.removeItem("sessionActive");

        const pathSegments = window.location.pathname.split("/");
        const slug = pathSegments[1];
        if (slug && slug !== "login" && !window.location.pathname.startsWith("/superadmin")) {
          window.location.href = `/${slug}/login?inactive=true`;
        } else {
          window.location.href = "/";
        }
      }
    }, 10000);

    // 3. Storage Change sync listener (logs out other tabs instantly if logged out)
    const handleStorageChange = () => {
      if (!localStorage.getItem("token") && !window.location.pathname.startsWith("/superadmin")) {
        sessionStorage.removeItem("sessionActive");
        const pathSegments = window.location.pathname.split("/");
        const slug = pathSegments[1];
        if (slug && slug !== "login") {
          window.location.href = `/${slug}/login`;
        } else {
          window.location.href = "/";
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      responderChannel.removeEventListener("message", handlePing);
      responderChannel.close();
      activityEvents.forEach(event => window.removeEventListener(event, updateActivity));
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <SocketProvider userId={user?._id}>
      <TargetSocketProvider userId={user?._id}>
      <NotificationProvider>
        <BrowserRouter>
          <div className="min-h-screen">
            <Routes>
              {/* PUBLIC */}
              <Route path="/" element={<SuperAdminLogin />} />
              <Route path="/login" element={<SuperAdminLogin />} />
              <Route path="/:tenantSlug/login" element={<Login />} />
              <Route path="/:tenantSlug/upgrade" element={<UpgradePlan />} />
              <Route path="/:tenantSlug/plans" element={<ViewPlans />} />
              <Route path="/contact" element={<WebsiteContactForm />} />
              <Route path="/:tenantSlug/contact" element={<WebsiteContactForm />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />
              <Route path="/:tenantSlug/reset-password/:token" element={<ResetPassword />} />
              <Route path="/integrations/facebook/callback" element={<FacebookCallback />} />
              <Route path="/integrations/linkedin/callback" element={<LinkedInCallback />} />

              {/* SUPERADMIN PORTAL */}
              <Route path="/superadmin/login" element={<Navigate to="/" replace />} />
              <Route path="/superadmin" element={<SuperAdminRoute />}>
                <Route element={<SuperAdminLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SuperAdminDashboard />} />
                  <Route path="tenants" element={<SuperAdminTenants />} />
                  <Route path="tenants/:id" element={<TenantDetail />} />
                  <Route path="tenants/create" element={<CreateTenant />} />
                  <Route path="upgrade-requests" element={<UpgradeRequests />} />
                  <Route path="subscription-plans" element={<SubscriptionPlans />} />
                  <Route path="subscription-plans/create" element={<CreatePlan />} />
                  <Route path="subscription-plans/:id/edit" element={<EditPlan />} />
                  <Route path="subscription-plans/:id" element={<PlanDetail />} />
                  <Route path="settings" element={<SuperAdminSettings />} />
                  <Route path="profile" element={<SuperAdminProfile />} />
                </Route>
              </Route>

              {/* TENANT PORTAL (MULTI-TENANT ROUTING) */}
              <Route path="/:tenantSlug" element={<PrivateRoute />}>
                <Route element={<Layout isModalOpen={isModalOpen} />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  
                  {/* COMMON ROUTES */}
                  <Route element={<PrivateRoute planFeature="analytics" />}>
                    <Route path="DealAnalysis" element={<DealIntelligenceDashboard />} />
                    <Route path="LossAnalysis" element={<LostDealAnalytics />} />
                    <Route path="cltv/dashboard" element={<CLVDashboard />} />
                    <Route path="cltv/client/:companyName" element={<ClientCLVDetails />} />
                  </Route>
                  <Route path="leaderboard" element={<AllStreakLeaderboard />} />
                  <Route path="dashboard/notifications" element={<NotificationsPage />} />

                  {/* campaigns */}
                  <Route path="mass-email" element={<MassEmail />} />
                  <Route path="create-email" element={<CreateEmail />} />
                  <Route path="create-email/:id" element={<CreateEmail />} />
                  <Route path="scheduled-emails" element={<ScheduledEmails />} />
                  <Route path="email-history" element={<EmailHistory />} />

                  {/* PERMISSION CHECKED ROUTES */}
                  <Route element={<PrivateRoute permission="dashboard" />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                  </Route>

                  <Route element={<PrivateRoute permission="leads" planFeature="leads" />}>
                    <Route path="leads" element={<Leads />} />
                    <Route path="leads/view/:id" element={<ViewLead />} />
                    <Route path="leads/rejected" element={<RejectedLeads />} />
                  </Route>

                  <Route element={<PrivateRoute permission="create_lead" planFeature="leads" />}>
                    <Route path="createleads" element={<CreateLeads />} />
                  </Route>

                  <Route element={<PrivateRoute permission="deals_all" planFeature="deals_all" />}>
                    <Route path="deals" element={<AllDeals />} />
                    <Route path="deals/rejected" element={<RejectedDeals />} />
                  </Route>

                  <Route element={<PrivateRoute permission="create_deal" planFeature="deals_all" />}>
                    <Route path="createDeal" element={<CreateDeal />} />
                    <Route path="createDeal/:id" element={<CreateDeal />} />
                  </Route>

                  <Route element={<PrivateRoute permission="deals_pipeline" planFeature="deals_pipeline" />}>
                    <Route path="Pipelineview" element={<Pipeline_view />} />
                    <Route path="Pipelineview/:dealId?" element={<Pipeline_modal_view />} />
                  </Route>

                  <Route element={<PrivateRoute permission="proposal" planFeature="proposal" />}>
                    <Route path="proposal" element={<ProposalHead />} />
                    <Route path="proposal/sendproposal" element={<SendProposal />} />
                    <Route path="proposal/drafts" element={<DraftsPage />} />
                    <Route path="proposal/view/:id" element={<ViewProposal />} />
                  </Route>

                  <Route element={<PrivateRoute permission="invoices" planFeature="invoices" />}>
                    <Route path="invoices" element={<InvoiceHead />} />
                    <Route path="invoices/:id" element={<InvoiceView />} />
                  </Route>

                  <Route element={<PrivateRoute permission="activities_calendar" />}>
                    <Route path="calendar" element={<CalendarView />} />
                  </Route>

                  <Route element={<PrivateRoute permission="activities_list" />}>
                    <Route path="list" element={<Activity />} />
                  </Route>

                  <Route element={<PrivateRoute permission="users_roles" planFeature="users_roles" />}>
                    <Route path="user&roles" element={<UserManagement />} />
                  </Route>

                  <Route element={<PrivateRoute permission="reports" />}>
                    <Route path="team-analytics" element={<ReportsPage />} />
                  </Route>

                  <Route element={<PrivateRoute permission="email_chat" />}>
                    <Route path="emailchat" element={<EmailChat />} />
                  </Route>

                  <Route element={<PrivateRoute permission="settings" />}>
                    <Route path="settings" element={<Settings />} />
                  </Route>

                  {/* MESSAGES */}
                  <Route element={<PrivateRoute planFeature="messages" />}>
                    <Route path="messages" element={<MessagesPage />} />
                  </Route>
                  {/* TASKS & TARGETS */}
                  <Route path="task-management" element={<TaskManagement />} />
                  <Route path="assigned-tasks" element={<AssignedTasks />} />
                  <Route path="target-management" element={<TargetManagement />} />
                  <Route path="my-targets" element={<MyTargets />} />
                  {/* MEETINGS */}
                  <Route element={<PrivateRoute planFeature="meetings" />}>
                    <Route path="meetings" element={<Meetings />} />
                  </Route>

                  {/* GOOGLE INTEGRATION SETTINGS */}
                  <Route element={<PrivateRoute planFeature="google_meet_sync" />}>
                    <Route path="settings/google-integration" element={<GoogleIntegration />} />
                  </Route>

                  {/* INTEGRATIONS */}
                  <Route path="integrations" element={<Integrations />} />
                  <Route path="integrations/facebook/callback" element={<FacebookCallback />} />
                  <Route path="integrations/linkedin/callback" element={<LinkedInCallback />} />
                </Route>
              </Route>

              {/* LEGACY REDIRECT HANDLER (FALLBACKS TO PRESERVE EXISTING ABSOLUTE LINKS) */}
              <Route element={<PrivateRoute />}>
                <Route path="/dashboard" element={<div />} />
                <Route path="/leads" element={<div />} />
                <Route path="/leads/view/:id" element={<div />} />
                <Route path="/createleads" element={<div />} />
                <Route path="/deals" element={<div />} />
                <Route path="/createDeal" element={<div />} />
                <Route path="/createDeal/:id" element={<div />} />
                <Route path="/Pipelineview" element={<div />} />
                <Route path="/Pipelineview/:dealId?" element={<div />} />
                <Route path="/proposal" element={<div />} />
                <Route path="/proposal/sendproposal" element={<div />} />
                <Route path="/proposal/drafts" element={<div />} />
                <Route path="/proposal/view/:id" element={<div />} />
                <Route path="/invoices" element={<div />} />
                <Route path="/invoices/:id" element={<div />} />
                <Route path="/calendar" element={<div />} />
                <Route path="/list" element={<div />} />
                <Route path="/user&roles" element={<div />} />
                <Route path="/team-analytics" element={<div />} />
                <Route path="/emailchat" element={<div />} />
                <Route path="/settings" element={<div />} />
                <Route path="/DealAnalysis" element={<div />} />
                <Route path="/LossAnalysis" element={<div />} />
                <Route path="/cltv/dashboard" element={<div />} />
                <Route path="/cltv/client/:companyName" element={<div />} />
                <Route path="/leaderboard" element={<div />} />
                <Route path="/dashboard/notifications" element={<div />} />
                <Route path="/task-management" element={<div />} />
                <Route path="/assigned-tasks" element={<div />} />
                <Route path="/target-management" element={<div />} />
                <Route path="/my-targets" element={<div />} />
                <Route path="/mass-email" element={<div />} />
                <Route path="/create-email" element={<div />} />
                <Route path="/create-email/:id" element={<div />} />
                <Route path="/scheduled-emails" element={<div />} />
                <Route path="/email-history" element={<div />} />
                <Route path="/meetings" element={<div />} />
              </Route>
            </Routes>
            <ToastContainer />
          </div>
        </BrowserRouter>
      </NotificationProvider>
      </TargetSocketProvider>
    </SocketProvider>
  );
}

export default App;