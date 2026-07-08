import { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "react-toastify";
import { Check, X, UserPlus } from "react-feather";
import { DEFAULT_PERMISSIONS } from "./permissionConfig";
import PermissionsGrid from "./PermissionsGrid";

export default function EditRoleModal({ role, onClose, onRoleUpdated }) {
  const API_URL = import.meta.env.VITE_API_URL;

  const [roleData, setRoleData] = useState({
    name: "",
    permissions: { ...DEFAULT_PERMISSIONS },
  });

  useEffect(() => {
    if (role) {
      setRoleData({
        name: role.name || "",
        permissions: { ...DEFAULT_PERMISSIONS, ...(role.permissions || {}) },
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg">
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

          <PermissionsGrid
            permissions={roleData.permissions}
            onChange={handlePermissionChange}
          />

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
