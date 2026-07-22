import {
  Home,
  Users,
  Tag,
  TrendingUp,
  TrendingDown,
  BarChart2,
  GitBranch,
  FileText,
  Edit,
  Clipboard,
  Target,
  CheckSquare,
  BarChart,
  Award,
  MessageSquare,
  MessageCircle,
  Send,
  Calendar,
  Shield,
} from "react-feather";

// One entry per sidebar nav item — kept in sync with sidebar.jsx's
// userPermissions.* checks so the Create/Edit Role modals can toggle every
// module the sidebar exposes.
export const permissionGroups = [
  {
    title: "Core Modules",
    theme: "blue",
    permissions: [
      { key: "dashboard", label: "Dashboard", icon: Home },
      { key: "leads", label: "Leads", icon: Users },
      { key: "schedule_view", label: "Calendar", icon: Calendar },
    ],
  },
  {
    title: "Deals",
    theme: "purple",
    permissions: [
      { key: "deals_all", label: "All Deals", icon: TrendingUp },
      { key: "deals_pipeline", label: "Pipeline View", icon: GitBranch },
    ],
  },
  {
    title: "Documents",
    theme: "amber",
    permissions: [
      { key: "invoices", label: "Invoices", icon: FileText },
      { key: "proposal", label: "Proposal", icon: Edit },
      { key: "documents", label: "Document Center", icon: FileText },
    ],
  },
  {
    title: "Tasks & Targets",
    theme: "teal",
    permissions: [
      { key: "task_management", label: "Task Management", icon: Clipboard },
      { key: "target_management", label: "Target Management", icon: Target },
      { key: "assigned_tasks", label: "My Tasks", icon: CheckSquare },
      { key: "my_targets", label: "My Targets", icon: Target },
    ],
  },
  {
    title: "Analysis",
    theme: "cyan",
    permissions: [
      { key: "deal_analysis", label: "Deal Analysis", icon: BarChart2 },
      { key: "won_analysis", label: "Won Analysis", icon: TrendingUp },
      { key: "loss_analysis", label: "Loss Analysis", icon: TrendingDown },
    ],
  },
  {
    title: "Analytics & Insights",
    theme: "indigo",
    permissions: [
      { key: "reports", label: "Team Analytics", icon: BarChart },
      { key: "streak_leaderboard", label: "Leaderboard", icon: Award },
    ],
  },
  {
    title: "Communication",
    theme: "pink",
    permissions: [
      { key: "email_chat", label: "Email & Chat", icon: MessageSquare },
      { key: "email_campaigns", label: "Email Campaigns", icon: Send },
      { key: "meetings", label: "Meetings", icon: Calendar },
      { key: "messages", label: "Messages", icon: MessageCircle },
    ],
  },
  {
    title: "Administration",
    theme: "rose",
    permissions: [
      { key: "users_roles", label: "Users & Roles", icon: Shield },
    ],
  },
];

// Default state for a brand-new role. Keys that the sidebar today shows to
// EVERY user unconditionally when unset (assigned_tasks, my_targets, the 3
// Analysis links, Messages) default to true so a freshly created role
// doesn't silently lose access to something that "always worked" — the admin
// can still explicitly uncheck them. Everything else starts unchecked.
const DEFAULT_TRUE_KEYS = new Set([
  "assigned_tasks",
  "my_targets",
  "deal_analysis",
  "won_analysis",
  "loss_analysis",
  "messages",
  "schedule_view",
  "documents",
]);

export const DEFAULT_PERMISSIONS = permissionGroups.reduce((acc, group) => {
  group.permissions.forEach(({ key }) => {
    acc[key] = DEFAULT_TRUE_KEYS.has(key);
  });
  return acc;
}, {});

export const THEME_STYLES = {
  blue:   { icon: "text-blue-600",   header: "text-blue-700",   selectedBg: "bg-blue-50",   selectedBorder: "border-blue-500",   chip: "bg-blue-500",   text: "text-blue-800" },
  purple: { icon: "text-purple-600", header: "text-purple-700", selectedBg: "bg-purple-50", selectedBorder: "border-purple-500", chip: "bg-purple-500", text: "text-purple-800" },
  amber:  { icon: "text-amber-600",  header: "text-amber-700",  selectedBg: "bg-amber-50",  selectedBorder: "border-amber-500",  chip: "bg-amber-500",  text: "text-amber-800" },
  teal:   { icon: "text-teal-600",   header: "text-teal-700",   selectedBg: "bg-teal-50",   selectedBorder: "border-teal-500",   chip: "bg-teal-500",   text: "text-teal-800" },
  cyan:   { icon: "text-cyan-600",   header: "text-cyan-700",   selectedBg: "bg-cyan-50",   selectedBorder: "border-cyan-500",   chip: "bg-cyan-500",   text: "text-cyan-800" },
  indigo: { icon: "text-indigo-600", header: "text-indigo-700", selectedBg: "bg-indigo-50", selectedBorder: "border-indigo-500", chip: "bg-indigo-500", text: "text-indigo-800" },
  pink:   { icon: "text-pink-600",   header: "text-pink-700",   selectedBg: "bg-pink-50",   selectedBorder: "border-pink-500",   chip: "bg-pink-500",   text: "text-pink-800" },
  rose:   { icon: "text-rose-600",   header: "text-rose-700",   selectedBg: "bg-rose-50",   selectedBorder: "border-rose-500",   chip: "bg-rose-500",   text: "text-rose-800" },
};
