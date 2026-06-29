import { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "react-toastify";


import {
  Home,
  Users,
  Tag,
  List,
  Calendar,
  Shield,
  Edit,
  FileText,
  Check,
  X,
  UserPlus,
  MessageSquare,
  MessageCircle,
  BarChart
} from "react-feather";

export default function EditRoleModal({ role, onClose, onRoleUpdated }) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [roleData, setRoleData] = useState({
    name: "",
    permissions: {
      dashboard: false,
      leads: false,
      deals_all: false,
      deals_pipeline: false,
      invoices: false,
      proposal: false,
      activities: false,
      activities_calendar: false,
      activities_list: false,
      users_roles: false,
      email_chat: false,
      reports: false,
    }
  });

  useEffect(() => {
    if (role) {
      setRoleData({
        name: role.name || "",
        permissions: role.permissions || {
          dashboard: false,
          leads: false,
          deals_all: false,
          deals_pipeline: false,
          invoices: false,
          proposal: false,
          activities: false,
          activities_calendar: false,
          activities_list: false,
          users_roles: false,
          email_chat: false,
          reports: false,
        }
      });
    }
  }, [role]);

/* ── Handle Permission Change Function ─────────────────────── */
  const handlePermissionChange = (permission) => {
    setRoleData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/roles/update-role/${role._id}`,
        roleData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Role updated successfully!");
      if (onRoleUpdated) onRoleUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to update role");
    }
  };

  // Permission groups for better organization (same as CreateRoleModal)
  const permissionGroups = [
    {
      title: "Core Modules",
      permissions: [
        { key: "dashboard", label: "Dashboard", icon: Home },
        { key: "leads", label: "Leads", icon: Users },
        { key: "deals_all", label: "Deals", icon: Tag },
        { key: "deals_pipeline", label: "Pipeline View", icon: List },
        { key: "reports", label: "Reports", icon: BarChart },
      ]
    },
    {
      title: "Documents",
      permissions: [
        { key: "invoices", label: "Invoices", icon: FileText },
        { key: "proposal", label: "Proposal", icon: Edit },
      ]
    },
    {
      title: "Communication",
      permissions: [
        { key: "email_chat", label: "Email & Chat", icon: MessageSquare },
      ]
    },
    {
      title: "Administration",
      permissions: [
        { key: "users_roles", label: "Users & Roles", icon: Shield },
      ]
    },
    {
      title: "Tasks & Targets",
      permissions: [
        { key: "assigned_tasks", label: "My Assigned Tasks", icon: List },
        { key: "my_targets", label: "My Targets", icon: BarChart },
      ]
    }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <UserPlus size={20} />
            Edit Role
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            Update role permissions for accessing different parts of the system
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 p-1">
          <div className="space-y-2">
            <label htmlFor="editRoleName" className="block text-sm font-medium text-gray-700">
              Role Name
            </label>
            <input
              id="editRoleName"
              type="text"
              name="name"
              placeholder="e.g., Sales Manager, Marketing Specialist"
              value={roleData.name}
              onChange={(e) => setRoleData({...roleData, name: e.target.value})}
              className="p-3 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              required
            />
          </div>
          
          <div className="border rounded-lg p-5 bg-gray-50">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 flex items-center gap-2">
              <Shield size={18} />
              Permissions Configuration
            </h3>
            
            <div className="grid grid-cols-1 gap-6">
              {permissionGroups.map((group, groupIndex) => (
                <div key={groupIndex} className="space-y-3">
                  <h4 className="font-medium text-gray-700 border-b pb-1">{group.title}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.permissions.map((permission) => {
                      const IconComponent = permission.icon;
                      return (
                        <label 
                          key={permission.key}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                            roleData.permissions[permission.key] 
                              ? "bg-green-50 border-green-500" 
                              : "bg-white border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <div className={`flex items-center justify-center w-6 h-6 rounded border ${
                            roleData.permissions[permission.key] 
                              ? "bg-green-500 border-green-500 text-white" 
                              : "bg-white border-gray-300"
                          }`}>
                            <input
                              type="checkbox"
                              checked={roleData.permissions[permission.key]}
                              onChange={() => handlePermissionChange(permission.key)}
                              className="absolute opacity-0 h-0 w-0"
                            />
                            {roleData.permissions[permission.key] && <Check size={14} />}
                          </div>
                          <IconComponent size={18} className={roleData.permissions[permission.key] ? "text-green-600" : "text-gray-600"} />
                          <span className={roleData.permissions[permission.key] ? "text-green-800 font-medium" : "text-gray-700"}>
                            {permission.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              <X size={16} />
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-md font-medium"
            >
              <Check size={16} />
              Update Role
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
