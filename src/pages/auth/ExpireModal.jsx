import React, { useState } from "react";
import axios from "axios";
import { exportRowsToExcel, exportRowsToCSV } from "../../utils/excelImportExport";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ExpireModal = ({ expiredNotice, setExpiredNotice, tenantSlug, navigate }) => {
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [exportingType, setExportingType] = useState(null); // 'leads', 'deals', 'invoices'
  const [error, setError] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  if (!expiredNotice) return null;

  const handleVerify = async () => {
    if (!email || !password) {
      setError("Please enter email and password to verify.");
      return;
    }
    setError("");
    setIsVerifying(true);
    try {
      await axios.post(`${API_URL}/users/verify-export-credentials`, {
        email,
        password,
        tenantSlug
      });
      setIsVerified(true);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid email or password.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleExport = async (dataType, format) => {
    if (!email || !password) {
      setError("Please enter email and password to export data.");
      return;
    }
    setError("");
    setExportingType(dataType);

    try {
      const response = await axios.post(`${API_URL}/users/export-expired`, {
        email,
        password,
        tenantSlug,
        dataType
      });

      const data = response.data.data;
      if (!data || data.length === 0) {
        setError(`No ${dataType} found to export.`);
        setExportingType(null);
        return;
      }

      // Structured columns based on the app's standard exports
      let exportColumns = [];
      let exportData = data;

      if (dataType === 'leads') {
        exportColumns = [
          { key: "leadName", label: "Lead Name" },
          { key: "companyName", label: "Company Name" },
          { key: "phoneNumber", label: "Phone Number" },
          { key: "email", label: "Email" },
          { key: "address", label: "Address", wrap: true },
          { key: "country", label: "Country" },
          { key: "clientType", label: "Client Type (B2B/B2C)" },
          { key: "industry", label: "Industry" },
          { key: "source", label: "Source" },
          { key: "requirement", label: "Requirement", wrap: true },
          { key: "status", label: "Status" },
          { key: "assignTo", label: "Assign To (Email)" },
          { key: "followUpDate", label: "Follow-up Date", type: "date" },
          { key: "notes", label: "Notes", wrap: true },
          { key: "createdAt", label: "Created At", type: "date" },
        ];
        
        exportData = data.map(lead => ({
          ...lead,
          assignTo: lead.assignTo?.email || "",
        }));

      } else if (dataType === 'deals') {
        exportColumns = [
          { key: "dealName", label: "Deal Name" },
          { key: "companyName", label: "Company Name" },
          { key: "phoneNumber", label: "Phone Number" },
          { key: "dealTitle", label: "Deal Title" },
          { key: "assignedTo", label: "Assigned To (Email)" },
          { key: "value", label: "Value" },
          { key: "currency", label: "Currency" },
          { key: "clientType", label: "Client Type (B2B/B2C)" },
          { key: "discountGiven", label: "Discount Given (%)", type: "number" },
          { key: "stage", label: "Stage" },
          { key: "email", label: "Email" },
          { key: "source", label: "Source" },
          { key: "companySize", label: "Company Size" },
          { key: "industry", label: "Industry" },
          { key: "requirement", label: "Requirement", wrap: true },
          { key: "address", label: "Address", wrap: true },
          { key: "country", label: "Country" },
          { key: "notes", label: "Notes", wrap: true },
          { key: "followUpDate", label: "Follow Up Date", type: "date" },
          { key: "followUpComment", label: "Follow Up Comment", wrap: true },
          { key: "createdAt", label: "Created At", type: "date" },
        ];

        exportData = data.map(deal => ({
          ...deal,
          assignedTo: deal.assignedTo?.email || "",
        }));

      } else if (dataType === 'invoices') {
        exportColumns = [
          { key: "invoicenumber", label: "Invoice #" },
          { key: "deal", label: "Deal" },
          { key: "status", label: "Status" },
          { key: "amount", label: "Amount", type: "number" },
          { key: "currency", label: "Currency" },
          { key: "paid", label: "Paid", type: "number" },
          { key: "balance", label: "Balance Due", type: "number" },
          { key: "assignedTo", label: "Assigned To" },
          { key: "dueDate", label: "Due Date", type: "date" },
        ];

        exportData = data.map(inv => {
          const total = Number(inv.total) || 0;
          const isPaidFamily = ["paid", "partially_paid"].includes(inv.status);
          const paid = isPaidFamily ? Number(inv.amountPaid) || 0 : 0;
          const balance = Math.max(total - paid, 0);

          return {
            invoicenumber: inv.invoicenumber || "-",
            deal: inv.items?.[0]?.deal?.dealName || "N/A",
            status: inv.status === "partially_paid" ? "Partially Paid" : inv.status,
            amount: total,
            currency: inv.currency || "-",
            paid,
            balance,
            assignedTo: inv.assignTo ? `${inv.assignTo.firstName} ${inv.assignTo.lastName}`.trim() : "N/A",
            dueDate: inv.dueDate || "",
          };
        });
      }
      
      const filename = `${tenantSlug}_${dataType}_export`;

      if (format === "excel") {
        await exportRowsToExcel(exportData, exportColumns, `${filename}.xlsx`);
      } else {
        exportRowsToCSV(exportData, exportColumns, `${filename}.csv`);
      }
      
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to export data. Please check your credentials.");
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center max-h-[90vh] overflow-y-auto">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
        </div>
        <h3 className="text-slate-700 mb-2 font-bold text-xl">
          {expiredNotice.trialExpired ? "Your Free Trial Has Ended" : "Subscription Expired"}
        </h3>
        {expiredNotice.expiryDate && (
          <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold mb-3">
            {expiredNotice.trialExpired ? "Trial ended on" : "Expired on"} {expiredNotice.expiryDate}
          </span>
        )}
        <p className="text-gray-600 mb-6 text-sm">{expiredNotice.message}</p>
        
        <div className="flex flex-col gap-3 mb-6">
          {tenantSlug && (
            <button
              type="button"
              onClick={() => {
                setExpiredNotice(null);
                navigate(`/${tenantSlug}/upgrade`);
              }}
              className="w-full text-white py-3 rounded-lg font-medium hover:opacity-90 transition"
              style={{ backgroundColor: "#008ECC" }}
            >
              Upgrade Plan Now
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpiredNotice(null)}
            className="w-full py-3 rounded-lg font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 transition"
          >
            Close
          </button>
        </div>

        <hr className="border-gray-200 mb-6" />

        <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-4">
            If you want to export your data, enter email id and password:
          </p>
          
          {error && <p className="text-red-500 text-xs font-medium mb-3">{error}</p>}
          
          {!isVerified ? (
            <>
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full py-2 text-white rounded-lg font-medium transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#008ECC" }}
              >
                {isVerifying ? "Verifying..." : "Verify Credentials"}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-4 text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <span className="font-semibold text-sm">Verified Successfully</span>
              </div>
              <div className="space-y-3">
                {['leads', 'deals', 'invoices'].map(type => (
                  <div key={type} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                    <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                    <div className="flex gap-2">
                      <button 
                        disabled={exportingType === type}
                        onClick={() => handleExport(type, 'csv')}
                        className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 flex items-center gap-1 rounded text-gray-700 font-medium transition disabled:opacity-50"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        CSV
                      </button>
                      <button 
                        disabled={exportingType === type}
                        onClick={() => handleExport(type, 'excel')}
                        className="text-xs px-2 py-1 bg-green-50 hover:bg-green-100 flex items-center gap-1 text-green-700 rounded font-medium transition disabled:opacity-50"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        Excel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {exportingType && (
                <p className="text-xs text-center text-blue-600 mt-3 animate-pulse font-medium">
                  Exporting {exportingType}...
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpireModal;
