
import { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Check, X, UserPlus } from "react-feather";
import { DEFAULT_PERMISSIONS } from "./permissionConfig";
import PermissionsGrid from "./PermissionsGrid";

export default function CreateRoleModal({ onRoleCreated }) {
  const API_URL = import.meta.env.VITE_API_URL;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [roleData, setRoleData] = useState({
    name: "",
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  // Check if all permissions are true
  const allPermissionsSelected = Object.values(roleData.permissions).every(Boolean);

  const handlePermissionChange = (permission) => {
    setRoleData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

/* ── Handle Select All Permissions Function ─────────────────────── */
  const handleSelectAll = () => {
    const newValue = !allPermissionsSelected;
    const updatedPermissions = {};
    Object.keys(roleData.permissions).forEach(key => {
      updatedPermissions[key] = newValue;
    });
    setRoleData(prev => ({
      ...prev,
      permissions: updatedPermissions
    }));
  };

/* ── Handle Cancel Function ─────────────────────── */
  const handleCancel = () => {
    setRoleData({
      name: "",
      permissions: { ...DEFAULT_PERMISSIONS },
    });
    setIsDialogOpen(false);
  };

/* ── Handle Submit Function ─────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${API_URL}/roles`,
        roleData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Role created successfully!");
      if (onRoleCreated) onRoleCreated();
      handleCancel();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to create role");
    }
  };

  return (
    <div>
      <ToastContainer />
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md">
            <UserPlus size={18} />
            <span>Create Role</span>
          </button>
        </DialogTrigger>

        <DialogContent className="max-w-2xl sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <UserPlus size={20} />
              Create New Role
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              Define a new role and set permissions for accessing different parts of the system
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 p-1">
            <div className="space-y-2">
              <label htmlFor="roleName" className="block text-sm font-medium text-gray-700">
                Role Name
              </label>
              <input
                id="roleName"
                type="text"
                name="name"
                value={roleData.name}
                onChange={(e) => setRoleData({...roleData, name: e.target.value})}
                placeholder="e.g., Sales, Admin"
                autoComplete="off"
                className="p-3 border border-gray-300 rounded-md w-full focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <PermissionsGrid
              permissions={roleData.permissions}
              onChange={handlePermissionChange}
              showSelectAll
              allSelected={allPermissionsSelected}
              onSelectAll={handleSelectAll}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleCancel}
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
                Create Role
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
