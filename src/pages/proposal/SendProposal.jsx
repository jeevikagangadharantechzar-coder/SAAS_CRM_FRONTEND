import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SuperEditor from "./SuperEditor";

const SendProposal = () => {

  const API_URL = import.meta.env.VITE_API_URL;

  const location = useLocation();
  const navigate = useNavigate();

  const proposalData = location.state?.proposal || null;
  const isEditing = location.state?.isEditing || false;

  const [title, setTitle] = useState("");
  const [dealTitle, setDealTitle] = useState("");
  const [emails, setEmails] = useState("");
  const [ccEmail, setCcEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [deals, setDeals] = useState([]);
  const [selectedDealId, setSelectedDealId] = useState("");
  const [attachments, setAttachments] = useState([]);

  // Remove file from attachments
  const removeFile = (index) => {
    const filesArray = Array.from(attachments);
    filesArray.splice(index, 1);
    setAttachments(filesArray);
  };

  // Fetch deals from backend
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          `${API_URL}/deals/getAll`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const dealsArray = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.deals)
          ? response.data.deals
          : [];

        // populate email from leadId if not present
        const populatedDeals = dealsArray.map((deal) => ({
          ...deal,
          email:
            deal.email ||
            (deal.leadId && deal.leadId.email ? deal.leadId.email : ""),
        }));
        console.log("hello", populatedDeals);

        setDeals(populatedDeals);
      } catch (error) {
        console.error("Error fetching deals:", error);
        toast.error("Failed to fetch deals");
      }
    };

    fetchDeals();
  }, []);

  // Auto-fill proposal fields when editing
  useEffect(() => {
    if (proposalData && isEditing && deals.length > 0) {
      setTitle(proposalData.title || "");
      setEditorContent(proposalData.content || "");
      setCcEmail(proposalData.cc || "");

      if (proposalData.dealTitle) {
        const matchingDeal = deals.find(
          (d) => d.dealName === proposalData.dealTitle
        );
        if (matchingDeal) {
          setSelectedDealId(matchingDeal._id);
          setDealTitle(matchingDeal.dealName || "");
          setEmails(matchingDeal.email || "");
        }
      }

      if (proposalData.email) setEmails(proposalData.email);
    }
  }, [proposalData, deals, isEditing]);

  // Update email and dealTitle when selecting a deal
  useEffect(() => {
    if (selectedDealId && deals.length > 0) {
      const selectedDeal = deals.find((d) => d._id === selectedDealId);
      if (selectedDeal) {
        setDealTitle(selectedDeal.dealName || "");
        setEmails(selectedDeal.email || "");
      }
    }
  }, [selectedDealId, deals]);

/* ── Handle Deal Selection Function ─────────────────────── */
  const handleDealSelect = (dealId) => {
    setSelectedDealId(dealId);
  };

/* ── Handle File Change Function ─────────────────────── */
  const handleFileChange = (e) => {
    setAttachments(e.target.files);
  };

/* ── Handle Submit Function ─────────────────────── */
 const handleSubmit = async (submitType = "sent") => {
  const isDraftMode = submitType === "draft";
  
  if (isDraftMode) {
    setSavingDraft(true);
  } else {
    setLoading(true);
  }

  const emailArray = emails
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e);

  const formData = new FormData();
  formData.append("title", title);
  formData.append("dealTitle", dealTitle);
  formData.append("selectedDealId", selectedDealId);
  formData.append("cc", ccEmail);
  formData.append("content", editorContent || "No content provided");
  formData.append("emails", emailArray.join(","));
  formData.append("isDraft", isDraftMode);

  if (isEditing) formData.append("id", proposalData?._id);

  if (attachments.length > 0) {
    for (let i = 0; i < attachments.length; i++) {
      formData.append("attachments", attachments[i]);
    }
  }

  try {
    const token = localStorage.getItem("token");
    
    const response = await axios.post(
      `${API_URL}/proposal/mailsend`,
      formData,
      { 
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        } 
      }
    );
    
    // Only move deal to "Proposal Sent-Negotiation" stage when actually sending (not draft)
    if (!isDraftMode && selectedDealId) {
      await axios.patch(
        `${API_URL}/deals/update-deal/${selectedDealId}`,
        {
          stage: "Proposal Sent-Negotiation",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    }

    if (!isDraftMode) {
      toast.success(
        isEditing
          ? "Proposal updated and sent successfully!"
          : "Proposal sent successfully!"
      );
    } else {
      toast.success(
        isEditing
          ? "Draft updated successfully!"
          : "Draft saved successfully!"
      );
    }

    setTimeout(() => {
      if (!isDraftMode) {
        navigate("/proposal");
      } else {
        navigate("/proposal/drafts");
      }
    }, 2000);
  } catch (error) {
    console.error("Error submitting proposal:", error);
    
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
      
      if (error.response.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
      } else if (error.response.status === 400) {
        toast.error(error.response.data?.error || "Invalid proposal data");
      } else if (error.response.status === 404) {
        toast.error("API endpoint not found. Please check server configuration.");
      } else {
        toast.error(error.response.data?.error || `Failed to ${isDraftMode ? "save" : "send"} proposal.`);
      }
    } else if (error.request) {
      toast.error("Network error. Please check your connection.");
    } else {
      toast.error(error.message || "An error occurred");
    }
  } finally {
    if (isDraftMode) {
      setSavingDraft(false);
    } else {
      setLoading(false);
    }
  }
};

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold">
          {isEditing ? "Edit Proposal" : "Send Proposal"}
        </h1>
        <p className="text-xl">|</p>
        <Link to="/proposal">
          <p className="text-base text-blue-600 hover:underline">Back</p>
        </Link>
      </div>

      {/* Form */}
      <div className="bg-white p-8 mt-10 shadow-md rounded-lg">
        {/* Proposal Title */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
          <label className="font-medium">Proposal Title</label>
          <input
            className="w-full max-w-[700px] p-2 border border-gray-300 rounded-md focus:outline-blue-500"
            placeholder="Type your Proposal Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Deal Selection */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
          <label className="font-medium">Select Deal</label>
          <select
            className="w-full max-w-[700px] p-2 border border-gray-300 rounded-md focus:outline-blue-500"
            value={selectedDealId}
            onChange={(e) => handleDealSelect(e.target.value)}
          >
            <option value="">-- Select a Deal --</option>
            {deals.map((deal) => (
              <option key={deal._id} value={deal._id}>
                {deal.dealName || `Deal #${deal._id.substring(0, 8)}`}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Emails */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
          <label className="font-medium">Customer Emails</label>
          <input
            type="text"
            className="w-full max-w-[700px] p-2 border border-gray-300 rounded-md focus:outline-blue-500"
            placeholder="Enter multiple emails separated by commas"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
        </div>

        {/* CC Email */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-4">
          <label className="font-medium">CC Email</label>
          <input
            type="email"
            className="w-full max-w-[700px] p-2 border border-gray-300 rounded-md focus:outline-blue-500"
            placeholder="Enter CC email (optional)"
            value={ccEmail}
            onChange={(e) => setCcEmail(e.target.value)}
          />
        </div>

        {/* Editor */}
        <div className="mt-6">
          <label className="block text-gray-700 font-medium mb-2">
            Proposal Content
          </label>
          <div className="border border-gray-300 rounded-lg shadow-sm bg-white w-full">
            <SuperEditor
              style={{ height: "500px", width: "100%" }}
              value={editorContent}
              setValue={setEditorContent}
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="mt-6">
          <label className="block text-gray-700 font-medium mb-2">
            Attachments (optional)
          </label>
          <div
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-blue-500 transition-colors bg-gray-50"
            onClick={() => document.getElementById("fileInput").click()}
          >
            <svg
              className="w-12 h-12 text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16v4h10v-4m-5-5v9m-5-5l5-5 5 5"
              ></path>
            </svg>
            <p className="text-gray-500">
              <span className="text-blue-500">Browse</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Supports multiple files. Max size: 10MB
            </p>
            <input
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {attachments && attachments.length > 0 && (
            <ul className="mt-3 space-y-2">
              {Array.from(attachments).map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between bg-white p-2 rounded shadow-sm"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => removeFile(index)}
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex gap-3 items-center">
          <button
            className="bg-[#4466f2] text-white p-2 rounded-sm px-3"
            onClick={() => handleSubmit("sent")}
            disabled={loading || savingDraft}
          >
            {loading
              ? "Sending..."
              : isEditing
              ? "Update and Send"
              : "Send Proposal"}
          </button>

          <button
            className="bg-gray-500 text-white p-2 rounded-sm px-3"
            onClick={() => handleSubmit("draft")}
            disabled={loading || savingDraft}
          >
            {savingDraft ? "Saving..." : "Save as Draft"}
          </button>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default SendProposal;
