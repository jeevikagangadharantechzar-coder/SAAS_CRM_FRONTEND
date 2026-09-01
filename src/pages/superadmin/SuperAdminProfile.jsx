import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { superApi } from "../../services/api";
import { updateSuperAdminProfile } from "../../store/authSlice";
import { toast } from "react-toastify";
import { User, KeyRound, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";

const SuperAdminProfile = () => {
  const dispatch = useDispatch();
  const storedProfile = useSelector((state) => state.auth.superAdmin);

  const [name, setName] = useState(storedProfile?.name || "");
  const [email, setEmail] = useState(storedProfile?.email || "");
  const [roleName, setRoleName] = useState(storedProfile?.role?.name || "—");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await superApi.get("/profile");
        const admin = res.data?.admin;
        if (admin) {
          setName(admin.name);
          setEmail(admin.email);
          setRoleName(admin.role?.name || "—");
          dispatch(updateSuperAdminProfile(admin));
        }
      } catch (err) {
        toast.error(err.response?.data?.error || "Failed to load profile.");
      }
    };
    fetchProfile();
  }, [dispatch]);

  const BASE_URL = import.meta.env.VITE_SI_URI || "http://localhost:5000";
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await superApi.put("/profile", { name, email });
      toast.success(res.data?.message || "Profile updated successfully.");
      if (res.data?.admin) dispatch(updateSuperAdminProfile(res.data.admin));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await superApi.put("/profile/password", { currentPassword, newPassword });
      toast.success(res.data?.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-slate-900">SuperAdmin Profile</h2>
        <p className="text-base text-slate-600">Manage administrative credentials and security options.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Left Column */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#f2fbff] text-[#008ecc] flex items-center justify-center font-black text-3xl shadow-lg border-2 border-[#008ecc]/20 mb-4">
                {name ? name.charAt(0).toUpperCase() : "SA"}
              </div>
              <h3 className="text-slate-700">{name || "—"}</h3>
              <p className="text-base text-slate-600 uppercase tracking-widest mt-1">Super Admin</p>

              <div className="w-full border-t border-slate-100 my-4" />

              <div className="text-left w-full space-y-3">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-medium text-slate-700">{email || "—"}</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Access Role</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase">
                    {roleName}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Right Column */}
        <div className="md:col-span-2 space-y-6">
          {/* Profile details form */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center space-x-2 text-slate-800">
                <User size={18} className="text-[#008ecc]" />
                <span>Account Information</span>
              </CardTitle>
              <CardDescription>Update your name and email address.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2.5 bg-[#008ecc] hover:bg-[#007bb0] text-white rounded-xl font-bold cursor-pointer text-sm shadow disabled:opacity-50"
                  >
                    {profileSaving ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Change Password form */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center space-x-2 text-slate-800">
                <KeyRound size={18} className="text-[#008ecc]" />
                <span>Change Password</span>
              </CardTitle>
              <CardDescription>Update your own login password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#008ecc]"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="px-5 py-2.5 bg-[#008ecc] hover:bg-[#007bb0] text-white rounded-xl font-bold cursor-pointer text-sm shadow disabled:opacity-50"
                  >
                    {pwSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default SuperAdminProfile;
