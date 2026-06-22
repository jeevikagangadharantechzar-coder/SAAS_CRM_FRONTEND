import React from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./Myprofile_Sidebar";
import PasswordChange from "./Password_change";


/* ── My Profile ─────────────────────── */
const MyProfile = () => {
  return (
    <div className="flex gap-x-5 mt-6">
      {/* Sidebar */}
      <div className="w-1/4 p-4 bg-white rounded-lg shadow-md">
        <Sidebar />
      </div>

      {/* Profile Content */}
      <div className="flex-1 bg-white rounded-lg shadow-md p-6">
        <Routes>
         
          <Route path="/passwordchange" element={<PasswordChange />} />
          
        </Routes>
      </div>
    </div>
  );
};

export default MyProfile;
