import React, { useState, useEffect } from 'react';
import { X, Download, MessageSquare, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useUpdateDocumentStatus, useAddActivity, useSoftDeleteDocument, useSoftDeleteSourceDocument, useMarkViewed } from '../../hooks/useDocumentHub';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';

const getBaseUrl = () => import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

import { api } from '../../services/api';

const DocumentDrawer = ({ doc, onClose }) => {
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role?.name === 'Admin';

  const [replyText, setReplyText] = useState("");
  
  const updateStatus = useUpdateDocumentStatus();
  const addActivity = useAddActivity();
  const softDelete = useSoftDeleteDocument();
  const softDeleteSource = useSoftDeleteSourceDocument();
  const markViewed = useMarkViewed();

  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    // If status is Assigned, automatically mark as Viewed when drawer opens
    if (doc?.status === 'Assigned') {
      markViewed.mutate({ id: doc.assignmentId || doc.id });
    }
  }, [doc?.id, doc?.status]);

  const isInvoice = doc.sourceType === "Invoice";
  const queryParams = `?sourceType=${doc.sourceType}&sourceId=${doc.sourceId}&documentId=${doc.documentId || doc.id}`;
  const fileUrl = isInvoice ? `${getBaseUrl()}${doc.path}` : `/document-hub/documents/secure-serve${queryParams}&action=preview`;
  const downloadUrl = isInvoice ? `${getBaseUrl()}${doc.path}` : `/document-hub/documents/secure-serve${queryParams}&action=download`;

  useEffect(() => {
    let active = true;
    const fetchBlob = async () => {
      setLoadingPreview(true);
      try {
        let res;
        if (isInvoice) {
          const token = localStorage.getItem("token");
          res = await fetch(fileUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
          res.data = await res.blob();
        } else {
          res = await api.get(fileUrl, { responseType: "blob" });
        }
        if (!active) return;
        
        const blob = res.data;
        
        const isText = doc.type.includes('text') || doc.type.includes('csv') || doc.type.includes('json') || doc.name.endsWith('.csv') || doc.name.endsWith('.txt');
        
        if (isText) {
          const text = await blob.text();
          if (active) setTextContent(text);
        } else {
          const blobUrl = URL.createObjectURL(new Blob([blob], { type: doc.type || blob.type || "application/octet-stream" }));
          if (active) setPreviewUrl(blobUrl);
        }
      } catch (err) {
        console.error("Preview fetch error", err);
      } finally {
        if (active) setLoadingPreview(false);
      }
    };
    fetchBlob();
    return () => {
      active = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [fileUrl]);

  const handleReply = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    addActivity.mutate(
      { id: doc.assignmentId || doc.id, text: replyText },
      { onSuccess: () => setReplyText("") }
    );
  };

  const handleDelete = () => {
    if(confirm("Are you sure you want to move this assignment to the Recycle Bin?")) {
      // If it has assignmentId, it's a normalized doc from Lead/Deal tab that HAS an assignment.
      // If it doesn't have assignmentId but has documentId, it's a raw DocumentAssignment from the API.
      const assignmentIdToUse = doc.assignmentId || (doc.documentId ? (doc.id || doc._id) : null);

      if (assignmentIdToUse) {
        softDelete.mutate(
          { id: assignmentIdToUse },
          { onSuccess: onClose }
        );
      } else {
        softDeleteSource.mutate(
          { id: doc.id || doc._id }, // Source document ID
          { onSuccess: onClose }
        );
      }
    }
  };

  const handleDownload = async () => {
    if (isInvoice) {
      window.open(downloadUrl, "_blank");
      return;
    }
    try {
      const res = await api.get(downloadUrl, { responseType: "blob" });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.setAttribute("download", doc.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download document.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-[600px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <h2 className="font-semibold text-lg text-slate-800 dark:text-white truncate pr-4">{doc.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Details */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
            <div>
              <p className="text-slate-500 mb-1">Source</p>
              <p className="font-medium dark:text-slate-200">{doc.sourceType}: {doc.sourceName}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1">Assigned Date</p>
              <p className="font-medium dark:text-slate-200">{dayjs(doc.uploadedAt).format('MMM D, YYYY h:mm A')}</p>
            </div>
            {doc.note && (
              <div className="col-span-2 bg-amber-50 border border-amber-200 p-3 rounded-md mt-2">
                <p className="text-amber-800 text-xs font-semibold uppercase mb-1">Admin Instructions</p>
                <p className="text-amber-900 text-sm">{doc.note}</p>
              </div>
            )}
            {!isInvoice && (
              <div>
                <p className="text-slate-500 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${
                    doc.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' :
                    doc.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {doc.status}
                  </span>
                  
                  {isAdmin && (doc.status !== 'Approved' && doc.status !== 'Rejected') && (
                    <div className="flex gap-1 ml-2">
                      <button 
                        onClick={() => updateStatus.mutate({ id: doc.assignmentId || doc.id, status: 'Approved' })}
                        title="Approve"
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => {
                          const reason = window.prompt("Please provide a reason for rejection:");
                          if (reason !== null) {
                            if (!reason.trim()) return alert("Rejection reason is required.");
                            updateStatus.mutate({ id: doc.assignmentId || doc.id, status: 'Rejected', note: reason });
                          }
                        }}
                        title="Reject"
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-2 h-[500px] flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 overflow-hidden relative group">
            {loadingPreview ? (
               <div className="text-slate-500 text-sm animate-pulse">Loading preview...</div>
            ) : textContent !== null ? (
               <pre className="w-full h-full rounded bg-white dark:bg-slate-900 p-4 overflow-auto text-xs whitespace-pre-wrap dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-mono text-left block" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowX: 'auto', overflowY: 'auto' }}>
                 {textContent}
               </pre>
            ) : previewUrl ? (
               doc.type.includes('image') || doc.type.includes('svg') ? (
                  <img src={previewUrl} alt={doc.name} className="max-h-full max-w-full object-contain rounded" />
               ) : doc.type.includes('pdf') || isInvoice ? (
                  <iframe src={previewUrl} className="w-full h-full rounded bg-white" title={doc.name} />
               ) : (
                  <div className="text-center">
                    <p className="text-slate-500 mb-4">No preview available for this file type.</p>
                    <button onClick={handleDownload} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition">
                      <Download size={16} /> Download to View
                    </button>
                  </div>
               )
            ) : (
               <div className="text-center">
                 <p className="text-slate-500 mb-4">Failed to load preview.</p>
               </div>
            )}
            
            {/* Absolute download button overlay so they can still download easily */}
            {!loadingPreview && (
              <button onClick={handleDownload} className="absolute top-4 right-4 p-2 bg-slate-900/50 hover:bg-slate-900/70 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <Download size={18} />
              </button>
            )}
          </div>

          {/* Activity & Replies */}
          {!isInvoice && (
            <div>
              <h3 className="text-lg font-semibold mb-4 dark:text-white flex items-center gap-2">
                <MessageSquare size={18} /> Activity & Replies
              </h3>
              
              <div className="space-y-4 mb-6 border-l-2 border-slate-200 dark:border-slate-700 ml-3 pl-4">
                {(!doc.activity || doc.activity.length === 0) ? (
                  <p className="text-slate-500 text-sm italic">No activity yet.</p>
                ) : (
                  doc.activity.map((act, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[25px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white dark:ring-slate-900" />
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700 text-sm">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {act.action} by {act.role}
                          </span>
                          <span className="text-xs text-slate-400">{dayjs(act.createdAt).format('MMM D, h:mm A')}</span>
                        </div>
                        {act.note && (
                          <p className="text-slate-600 dark:text-slate-400 mt-1">{act.note}</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleReply} className="flex gap-2">
                <input 
                  type="text" 
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply..." 
                  className="flex-1 px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:border-blue-500"
                />
                <button type="submit" disabled={!replyText.trim() || addActivity.isPending} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                  Reply
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between bg-slate-50 dark:bg-slate-900">
          {!isInvoice ? (
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-sm font-medium"
            >
              <Trash2 size={16} /> Delete
            </button>
          ) : <div/>}
          
          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-colors text-sm font-medium"
          >
            <Download size={16} /> Download
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentDrawer;
