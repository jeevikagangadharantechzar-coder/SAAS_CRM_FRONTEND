import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const DraftsPage = () => {

  const API_URL = import.meta.env.VITE_API_URL;

  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isUpdating, setIsUpdating] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrafts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token"); // Get token
        const response = await axios.get(`${API_URL}/proposal/drafts`, {
          headers: { Authorization: `Bearer ${token}` } // Add token
        });
        setDrafts(response.data);
        setError("");
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load drafts.");
        toast.error("Failed to load drafts.");
      }
      setLoading(false);
    };
    fetchDrafts();
  }, []);

  // Status change to sent
  const handleSendDraft = async (id) => {
    setIsUpdating((prev) => ({ ...prev, [id]: true }));
    try {
      const token = localStorage.getItem("token"); // Get token
      await axios.put(
        `${API_URL}/proposal/updatestatus/${id}`,
        { status: "sent" },
        { headers: { Authorization: `Bearer ${token}` } } // Add token
      );
      
      setDrafts(prev => prev.filter(d => d._id !== id));
      toast.success("Draft sent successfully!");
    } catch (err) {
      console.error("Send error:", err);
      toast.error("Failed to send draft.");
    }
    setIsUpdating((prev) => ({ ...prev, [id]: false }));
  };

  // Go to edit draft
  const handleEdit = (proposalId) => {
    const selectedDraft = drafts.find((d) => d._id === proposalId);
    navigate("/proposal/sendproposal", {
      state: { proposal: selectedDraft, isEditing: true },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 md:px-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-black">
          Draft Proposals
        </h1>
        <div className="flex gap-3 items-center">
          <Link to="/proposal">
            <button className="bg-blue-600 hover:bg-blue-700 transition px-4 py-2 text-white font-semibold rounded-lg shadow-lg">
              Back to Proposals
            </button>
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white ">
        <table className="min-w-full text-sm text-gray-700">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase tracking-wide text-sm">
                Title
              </th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase tracking-wide text-sm">
                Deal Title
              </th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase tracking-wide text-sm">
                Email
              </th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase tracking-wide text-sm">
                Created At
              </th>
              <th className="px-6 py-3 text-left font-semibold text-black uppercase tracking-wide text-sm">
                Actions
              </th>
             </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-6 text-black animate-pulse">
                  Loading drafts...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="5" className="text-center py-6 text-red-500">
                  {error}
                </td>
              </tr>
            ) : drafts.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-400">
                  No draft proposals found
                </td>
              </tr>
            ) : (
              drafts.map((draft, idx) => (
                <tr
                  key={draft._id}
                  className={`
                    ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} 
                    hover:bg-indigo-50 transition
                  `}
                >
                  <td className="px-6 py-4 font-medium">{draft.title}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {draft.dealTitle}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{draft.email}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {draft.createdAt
                      ? new Date(draft.createdAt).toLocaleDateString()
                      : "--"}
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(draft._id)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleSendDraft(draft._id)}
                      disabled={isUpdating[draft._id]}
                      className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                    >
                      {isUpdating[draft._id] ? "Sending..." : "Send"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default DraftsPage;