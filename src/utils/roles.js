// Mirrors the backend's SALES_LIKE_ROLES (middlewares/auth.middleware.js):
// roles that get the same UI access as Sales (create lead/deal, import, etc.).
// Access only — "sales team" features (location tracking, sales-user
// dropdowns, leaderboard) still check for the "sales" name alone.
export const SALES_LIKE_ROLES = ["sales", "finance", "accounts"];

export const isSalesLike = (roleName) =>
  SALES_LIKE_ROLES.includes(String(roleName || "").toLowerCase());

// True for Admin, or when the logged-in user's role has the given permission
// toggle on (e.g. "deals_view_all"). Mirrors the backend's hasRolePermission.
export const hasRolePermission = (key) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user?.role?.name?.toLowerCase() === "admin" || !!user?.role?.permissions?.[key];
  } catch {
    return false;
  }
};
