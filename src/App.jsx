import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import "./App.css";

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

// Pages
import AdminDashboard from "./AdminDashboard/dashboard";
import Leads from "./pages/Leads/Leads";
import CreateLeads from "./pages/Leads/CreateLeads";
import { AllDeals } from "./pages/Deals/allDeals";
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

  useEffect(() => {
    const handleStorageChange = () => {
      if (!localStorage.getItem("token") && !window.location.pathname.startsWith("/superadmin")) {
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
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  return (
    <SocketProvider userId={user?._id}>
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
                  <Route path="DealAnalysis" element={<DealIntelligenceDashboard />} />
                  <Route path="LossAnalysis" element={<LostDealAnalytics />} />
                  <Route path="cltv/dashboard" element={<CLVDashboard />} />
                  <Route path="cltv/client/:companyName" element={<ClientCLVDetails />} />
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

                  <Route element={<PrivateRoute permission="leads" />}>
                    <Route path="leads" element={<Leads />} />
                    <Route path="leads/view/:id" element={<ViewLead />} />
                  </Route>

                  <Route element={<PrivateRoute permission="create_lead" />}>
                    <Route path="createleads" element={<CreateLeads />} />
                  </Route>

                  <Route element={<PrivateRoute permission="deals_all" />}>
                    <Route path="deals" element={<AllDeals />} />
                  </Route>

                  <Route element={<PrivateRoute permission="create_deal" />}>
                    <Route path="createDeal" element={<CreateDeal />} />
                    <Route path="createDeal/:id" element={<CreateDeal />} />
                  </Route>

                  <Route element={<PrivateRoute permission="deals_pipeline" />}>
                    <Route path="Pipelineview" element={<Pipeline_view />} />
                    <Route path="Pipelineview/:dealId?" element={<Pipeline_modal_view />} />
                  </Route>

                  <Route element={<PrivateRoute permission="proposal" />}>
                    <Route path="proposal" element={<ProposalHead />} />
                    <Route path="proposal/sendproposal" element={<SendProposal />} />
                    <Route path="proposal/drafts" element={<DraftsPage />} />
                    <Route path="proposal/view/:id" element={<ViewProposal />} />
                  </Route>

                  <Route element={<PrivateRoute permission="invoices" />}>
                    <Route path="invoices" element={<InvoiceHead />} />
                    <Route path="invoices/:id" element={<InvoiceView />} />
                  </Route>

                  <Route element={<PrivateRoute permission="activities_calendar" />}>
                    <Route path="calendar" element={<CalendarView />} />
                  </Route>

                  <Route element={<PrivateRoute permission="activities_list" />}>
                    <Route path="list" element={<Activity />} />
                  </Route>

                  <Route element={<PrivateRoute permission="users_roles" />}>
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
                  <Route path="messages" element={<MessagesPage />} />
                  {/* TASKS & TARGETS */}
                  <Route path="task-management" element={<TaskManagement />} />
                  <Route path="assigned-tasks" element={<AssignedTasks />} />
                  <Route path="target-management" element={<TargetManagement />} />
                  <Route path="my-targets" element={<MyTargets />} />
                  {/* MEETINGS */}
                  <Route path="meetings" element={<Meetings />} />

                  {/* GOOGLE INTEGRATION SETTINGS */}
                  <Route path="settings/google-integration" element={<GoogleIntegration />} />

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
    </SocketProvider>
  );
}

export default App;