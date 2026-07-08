import { Shield, Check } from "react-feather";
import { permissionGroups, THEME_STYLES } from "./permissionConfig";

export default function PermissionsGrid({
  permissions,
  onChange,
  showSelectAll = false,
  allSelected = false,
  onSelectAll,
}) {
  return (
    <div className="border rounded-lg p-5 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
          <Shield size={18} />
          Permissions Configuration
        </h3>
        {showSelectAll && (
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={onSelectAll}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span>Select All</span>
          </label>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {permissionGroups.map((group) => {
          const theme = THEME_STYLES[group.theme];
          return (
            <div key={group.title} className="space-y-3">
              <h4 className={`font-medium ${theme.header} border-b pb-1`}>{group.title}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.permissions.map((permission) => {
                  const IconComponent = permission.icon;
                  const isChecked = !!permissions[permission.key];
                  return (
                    <label
                      key={permission.key}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        isChecked ? `${theme.selectedBg} ${theme.selectedBorder}` : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded border shrink-0 ${
                          isChecked ? `${theme.chip} border-transparent text-white` : "bg-white border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onChange(permission.key)}
                          className="absolute opacity-0 h-0 w-0"
                        />
                        {isChecked && <Check size={14} />}
                      </div>
                      <IconComponent size={18} className={isChecked ? theme.icon : "text-gray-500"} />
                      <span className={`text-sm ${isChecked ? `${theme.text} font-medium` : "text-gray-700"}`}>
                        {permission.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
