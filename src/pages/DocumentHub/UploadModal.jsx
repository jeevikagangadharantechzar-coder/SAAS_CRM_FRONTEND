import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';
import { useUploadExternalDocument } from '../../hooks/useDocumentHub';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const UploadModal = ({ onClose }) => {
  const [file, setFile] = useState(null);
  const [name, setName] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  const uploadMutation = useUploadExternalDocument();

  // Fetch users for assignment dropdown
  const { data: usersData } = useQuery({
    queryKey: ["users-dropdown"],
    queryFn: async () => {
      const response = await axios.get(`${getBaseUrl()}/api/users`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      // Adjust according to standard users response
      return response.data?.users || response.data || [];
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file || !name || !assignedTo) return;

    const formData = new FormData();
    formData.append("document", file);
    formData.append("name", name);
    formData.append("assignedTo", assignedTo);

    uploadMutation.mutate({ formData }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h2 className="font-semibold text-lg dark:text-white">Upload External Document</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Document Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Property_Report.pdf"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-transparent outline-none focus:border-blue-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Assign Reviewer</label>
            <select 
              required
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md bg-transparent outline-none focus:border-blue-500 dark:text-white"
            >
              <option value="" disabled>Select User</option>
              {Array.isArray(usersData) && usersData.map(user => (
                <option key={user._id} value={user._id}>
                  {user.firstName} {user.lastName} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">File</label>
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
              <UploadCloud className="text-slate-400 mb-2" size={32} />
              <input 
                type="file" 
                required
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
              Cancel
            </button>
            <button type="submit" disabled={uploadMutation.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default UploadModal;
