import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { User, KeyRound, CheckCircle2, ShieldAlert } from "lucide-react";

const SuperAdminProfile = () => {
  const [name, setName] = useState("Platform Administrator");
  const [email, setEmail] = useState("admin@platform.com");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [profileSaving, setProfileSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("success");

  const handleUpdateProfile = (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setTimeout(() => {
      setProfileSaving(false);
      setMsg("Profile details updated successfully.");
      setMsgType("success");
      setTimeout(() => setMsg(""), 3000);
    }, 800);
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg("New passwords do not match.");
      setMsgType("error");
      return;
    }
    
    setPwSaving(true);
    setTimeout(() => {
      setPwSaving(false);
      setMsg("Administrative security credentials updated.");
      setMsgType("success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setMsg(""), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">SuperAdmin Profile</h2>
        <p className="text-slate-500 text-sm">Manage administrative credentials and security options.</p>
      </div>

      {msg && (
        <div
          className={`p-4 border rounded-xl text-sm font-semibold flex items-center space-x-2 ${
            msgType === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msgType === "success" ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
          <span>{msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Left Column */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-[#f2fbff] text-[#008ecc] flex items-center justify-center font-black text-3xl shadow-lg border-2 border-[#008ecc]/20 mb-4">
                SA
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">{name}</h3>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Platform Owner</p>
              
              <div className="w-full border-t border-slate-100 my-4" />
              
              <div className="text-left w-full space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                  <span className="text-sm font-medium text-slate-700">{email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Access Role</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Full Access SuperAdmin
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
              <CardDescription>Update global administrative profile credentials.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    SuperAdmin Full Name
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
                    Administrator Email Address
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
                <span>Change Administrator Password</span>
              </CardTitle>
              <CardDescription>Modify account passwords for secure access.</CardDescription>
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
                    {pwSaving ? "Updating Security..." : "Reset Password"}
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
