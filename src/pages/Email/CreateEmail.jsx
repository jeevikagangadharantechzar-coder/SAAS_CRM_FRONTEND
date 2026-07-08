import React, { useState, useEffect } from 'react';
import { Send, FileText, Clock, Mail, Paperclip } from 'lucide-react';
import axios from 'axios';
import {useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from "react-toastify";

const CreateEmail = () => {
  
  const API_URL = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  console.log("Edit mode:", isEditMode, "ID:", id);

  const selectedContactsFromNav = location.state?.selectedContacts || [];
  const [attachments, setAttachments] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [removedAttachments, setRemovedAttachments] = useState([]); 
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const [emailData, setEmailData] = useState({
    subject: '',
    content: '',
    selectedContacts: selectedContactsFromNav
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [loadedEmail, setLoadedEmail] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [emailTemplateId, setEmailTemplateId] = useState("");

  // ==========  Blocked file types ==========
  const BLOCKED_EXTENSIONS = ['.js', '.exe', '.bat', '.sh', '.cmd', '.vbs', '.ps1', '.jar', '.wsf', '.scr'];

  const isFileAllowed = (file) => {
    const fileName = file.name.toLowerCase();
    return !BLOCKED_EXTENSIONS.some(ext => fileName.endsWith(ext));
  };

  const getBlockedFilesList = (files) => {
    return files.filter(file => !isFileAllowed(file));
  };

  const validateAttachments = (files) => {
    const blockedFiles = files.filter(file => !isFileAllowed(file));
    
    if (blockedFiles.length > 0) {
      const blockedNames = blockedFiles.map(f => f.name).join(', ');
      toast.error(
        `Security Error: The following files cannot be attached because they are blocked by Gmail: ${blockedNames}. ` +
        `Please remove them or convert to .txt or .json format.`,
        { autoClose: 8000 }
      );
      return false;
    }
    return true;
  };
  // =============================================

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${API_URL}/email-templates`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.data.success) {
          setTemplates(res.data.templates);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };

    fetchTemplates();
  }, []);

  useEffect(() => {
    if (isEditMode) {
      fetchSingleEmail();
    }
  }, [id]);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);

    if (templateId === "custom") {
      setEmailData({
        ...emailData,
        subject: "",
        content: "",
      });
      return;
    }

    const selected = templates.find((t) => t._id === templateId);

    if (selected) {
      setEmailData({
        ...emailData,
        subject: selected.subject,
        content: selected.content,
      });
    }
  };
  
  const fetchSingleEmail = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/email/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        const email = response.data.data;

        setEmailData({
          subject: email.subject,
          content: email.content,
          selectedContacts: email.recipients.map((r) => ({
            name: r,
            email: r,
            type: "contact",
          })),
        });

        setEmailTemplateId(email.templateTitle || "");

        // Handle existing attachments if any
        if (email.attachments && email.attachments.length > 0) {
          setExistingAttachments(email.attachments);
        }

        const localDate = new Date(email.scheduledFor);
        setScheduledDate(
          `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, "0")}-${String(
            localDate.getDate()
          ).padStart(2, "0")}`
        );
        setScheduledTime(
          `${String(localDate.getHours()).padStart(2, "0")}:${String(localDate.getMinutes()).padStart(2, "0")}`
        );
      }
    } catch (error) {
      console.error("Error fetching email:", error);
    }
  };

  // Handle template matching after templates and email data are loaded
  useEffect(() => {
    if (!isEditMode) return;
    if (templates.length === 0 || !emailTemplateId) return;

    // FIX: Change t._title to t.title
    const matchedTemplate = templates.find((t) => t.title === emailTemplateId);
    if (matchedTemplate) {
      setSelectedTemplate(matchedTemplate._id);
      // Don't override content if it's already set from the email
      setEmailData((prev) => ({
        ...prev,
        subject: prev.subject || matchedTemplate.subject,
        content: prev.content || matchedTemplate.content,
      }));
    } else {
      // If no template matches, set to custom/empty
      setSelectedTemplate("");
    }
  }, [templates, emailTemplateId, isEditMode]);

  // ========== NEW: File input change handler with validation ==========
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    // Check for blocked files
    const blockedFiles = getBlockedFilesList(selectedFiles);
    
    if (blockedFiles.length > 0) {
      const blockedNames = blockedFiles.map(f => f.name).join(', ');
      toast.error(
        `Cannot add: ${blockedNames}. These file types are blocked by Gmail for security reasons.`,
        { autoClose: 6000 }
      );
    }
    
    // Only add allowed files
    const allowedFiles = selectedFiles.filter(file => isFileAllowed(file));
    
    if (allowedFiles.length > 0) {
      setAttachments((prev) => [...prev, ...allowedFiles]);
      
      if (allowedFiles.length < selectedFiles.length) {
        toast.info(`Added ${allowedFiles.length} allowed file(s). Blocked files were ignored.`);
      }
    }
  };
  // ================================================================

  const handleSendEmail = async () => {
    try {
      setIsSending(true);

      if (!emailData.subject.trim()) {
        toast.warn("Please enter email subject");
        setIsSending(false);
        return;
      }

      if (!emailData.content.trim()) {
        toast.warn("Please enter email content");
        setIsSending(false);
        return;
      }

      if (emailData.selectedContacts.length === 0) {
        toast.warn("No recipients selected");
        setIsSending(false);
        return;
      }

      const recipients = emailData.selectedContacts
        .map((contact) => contact.email)
        .filter((email) => email && email.includes("@"));

      if (recipients.length === 0) {
        toast.warn("No valid email addresses found");
        setIsSending(false);
        return;
      }

      // ==========  Validate attachments before sending ==========
      if (!validateAttachments(attachments)) {
        setIsSending(false);
        return;
      }
      // =============================================================

      console.log("Sending email to:", recipients);

      const token = localStorage.getItem("token");

      const formData = new FormData();

      formData.append("subject", emailData.subject);
      formData.append("content", emailData.content);
      const selected = templates.find(t => t._id === selectedTemplate);

      formData.append(
        "templateTitle",
        selected ? selected.title : null
      );

      recipients.forEach((email) => {
        formData.append("recipients", email);
      });

      // append NEW attachments only
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await axios.post(
        `${API_URL}/email/send-bulk`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success(
          `Email sent successfully to ${recipients.length} contacts!`
        );

        setAttachments([]);
        setExistingAttachments([]);

        setTimeout(() => navigate(-1), 1000);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error(
        error.response?.data?.message || "Failed to send email"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleEmail = async () => {
    if (!scheduledDate || !scheduledTime) {
      toast.warn("Please select date and time");
      return;
    }

    const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
    const now = new Date();

    if (selectedDateTime <= now) {
      toast.warn("Please select a future date & time");
      return;
    }

    try {
      setIsSending(true);

      const recipients = emailData.selectedContacts
        .map((contact) => contact.email)
        .filter((email) => email && email.includes("@"));

      const token = localStorage.getItem("token");

      // ========== NEW: Validate attachments before scheduling ==========
      if (!validateAttachments(attachments)) {
        setIsSending(false);
        return;
      }
      // =================================================================

      const formData = new FormData();
      formData.append("subject", emailData.subject);
      formData.append("content", emailData.content);
      formData.append("scheduledFor", selectedDateTime.toISOString());
      const selected = templates.find(t => t._id === selectedTemplate);

      formData.append(
        "templateTitle",
        selected ? selected.title : null
      );

      recipients.forEach((email) => {
        formData.append("recipients", email);
      });

      // append NEW attachments only
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await axios.post(
        `${API_URL}/email/send-bulk`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Email scheduled successfully!");
        setShowSchedulePicker(false);
        setScheduledDate("");
        setScheduledTime("");
        setAttachments([]);
        setExistingAttachments([]);
        setTimeout(() => navigate(-1), 1500);
      }
    } catch (error) {
      toast.error("Failed to schedule email");
    } finally {
      setIsSending(false);
    }
  };

  // UPDATED: Handle update with attachment removal tracking
  const handleUpdateEmail = async () => {
    try {
      setIsSending(true);

      const token = localStorage.getItem("token");

      const recipients = emailData.selectedContacts
        .map((contact) => contact.email)
        .filter((email) => email && email.includes("@"));

      const selectedDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
      const selected = templates.find(t => t._id === selectedTemplate);
      
      // ========== NEW: Validate new attachments before updating ==========
      if (!validateAttachments(attachments)) {
        setIsSending(false);
        return;
      }
      // ====================================================================

      const formData = new FormData();
      formData.append("subject", emailData.subject);
      formData.append("content", emailData.content);
      formData.append("templateTitle",selected ? selected.title : null);
      formData.append("scheduledFor", selectedDateTime.toISOString());
      
      recipients.forEach((email) => {
        formData.append("recipients", email);
      });

      // Append NEW attachments
      attachments.forEach((file) => {
        formData.append("newAttachments", file);
      });

      // Send remaining existing attachments (ones not removed)
      if (existingAttachments.length > 0) {
        formData.append("existingAttachments", JSON.stringify(existingAttachments));
      }

      //  Send removed attachments so backend can delete them
      if (removedAttachments.length > 0) {
        formData.append("removedAttachments", JSON.stringify(removedAttachments));
      }

      const response = await axios.put(
        `${API_URL}/email/update/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data.success) {
        toast.success("Scheduled email updated successfully!");
        setAttachments([]);
        setExistingAttachments([]);
        setRemovedAttachments([]); // Clear removed attachments
        setTimeout(() => navigate("/scheduled-emails"), 1500);
      }

    } catch (error) {
      console.error("Update error:", error);
      toast.error("Failed to update email");
    } finally {
      setIsSending(false);
    }
  };

  //  Handle removing existing attachments and track them for deletion
  const handleRemoveExistingAttachment = (indexToRemove) => {
    const removedAttachment = existingAttachments[indexToRemove];
    
    // Add to removed attachments list
    setRemovedAttachments(prev => [...prev, removedAttachment]);
    
    // Remove from existing attachments
    setExistingAttachments(prev => 
      prev.filter((_, index) => index !== indexToRemove)
    );
  };

  // Reset removed attachments when component unmounts or when navigating away
  useEffect(() => {
    return () => {
      setRemovedAttachments([]);
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div className="w-full bg-white flex flex-col h-full">
        {/* Modal Header */}
        <div className="border-b border-gray-200 p-4 sm:p-6 bg-white flex-shrink-0">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Compose Email</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">
                Sending to {emailData.selectedContacts.length} contacts
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
          {/* Select Template */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template
            </label>

            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose a template</option>
              {templates.map((template) => (
                <option key={template._id} value={template._id}>
                  {template.title}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject *
            </label>
            <input
              type="text"
              value={emailData.subject}
              onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
              placeholder="Enter email subject"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          {/* Email Content */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Content *
            </label>
            <textarea
              value={emailData.content}
              onChange={(e) => setEmailData({...emailData, content: e.target.value})}
              placeholder="Write your email here..."
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>
          
          {/* Attachments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>

            {/* Display existing attachments */}
            {existingAttachments.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Existing Attachments:</p>
                <div className="space-y-2">
                  {existingAttachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Paperclip size={16} className="text-blue-500 flex-shrink-0" />
                        <span className="text-sm truncate">
                          {attachment.filename || attachment.originalName || `Attachment ${index + 1}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingAttachment(index)}
                        className="text-red-500 text-sm hover:text-red-700 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label
              htmlFor="file-upload"
              className="flex flex-col justify-center w-full min-h-32 border-2 border-dashed border-orange-300 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition p-6"
            >
              <input
                id="file-upload"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}  //  Now using the new handler
              />

              {/* If no files */}
              {attachments.length === 0 && existingAttachments.length === 0 && (
                <div className="flex flex-col items-center text-center">
                  <span className="text-orange-600 font-medium">
                    Click to upload or drag & drop
                  </span>
                  <span className="text-sm text-gray-500 mt-2">
                    PDF, DOCX, JPG, PNG (Max 5MB)
                  </span>
                  
                </div>
              )}

              {/* If new files selected */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">New Attachments:</p>
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center gap-2 bg-white border rounded-lg px-3 py-2"
                    >
                      <span className="text-sm truncate min-w-0 flex-1">{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setAttachments((prev) =>
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                        className="text-red-500 text-sm flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}

                  <div className="text-xs text-gray-400 pt-2">
                    Click to add more files
                  </div>
                </div>
              )}
            </label>
          </div>

          {/* Schedule Time Picker */}
          {showSchedulePicker && (
            <div className="mb-6 border border-blue-200 bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select date
              </label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg w-48 mb-4"
              />
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select time 
              </label>

              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg w-48"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowSchedulePicker(false);
                    setScheduledTime('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                  onClick={handleScheduleEmail}
                  disabled={isEditMode}
                  className={`px-4 py-2 rounded-lg text-white ${
                    isEditMode
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Confirm Schedule
                </button>
              </div>
            </div>
          )}

          {/* Selected Recipients */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Recipients ({emailData.selectedContacts.length})
              </label>
              {emailData.selectedContacts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    toast(
                      ({ closeToast }) => (
                        <div>
                          <p className="mb-3 font-medium">Clear all recipients?</p>
                          <div className="flex gap-3">
                            <button
                              onClick={() => {
                                setEmailData((prev) => ({
                                  ...prev,
                                  selectedContacts: [],
                                }));
                                closeToast();
                              }}
                              className="px-3 py-1 bg-red-500 text-white rounded"
                            >
                              Yes
                            </button>
                            <button
                              onClick={closeToast}
                              className="px-3 py-1 border rounded"
                            >
                              No
                            </button>
                          </div>
                        </div>
                      ),
                      { autoClose: false }
                    );
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              )}
            </div>
            
            {emailData.selectedContacts.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No recipients selected</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {emailData.selectedContacts.map((contact, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 rounded ${
                      contact.type === 'deal' 
                        ? 'bg-purple-50 border border-purple-100' 
                        : 'bg-blue-50 border border-blue-100'
                    }`}>
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${
                          contact.type === 'deal' 
                            ? 'bg-purple-100 text-purple-600' 
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {contact.name?.charAt(0) || 'C'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-sm break-words">{contact.name}</div>
                          <div className="text-xs text-gray-500 break-words">{contact.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const updated = emailData.selectedContacts.filter((_, i) => i !== index);
                          setEmailData({...emailData, selectedContacts: updated});
                        }}
                        className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0 p-2"
                        title="Remove recipient"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-gray-200 p-3 sm:p-6 bg-gray-50 flex-shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <div className="w-full sm:w-auto order-2 sm:order-1">
              <button
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
            <div className="flex w-full sm:w-auto gap-3 order-1 sm:order-2">
              <button
                type='button'
                onClick={() => setShowSchedulePicker(true)}
                className="flex-1 sm:w-auto px-2 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center gap-2"
              >
                <Clock size={18} />
                Schedule
              </button>

              <button
                onClick={isEditMode ? handleUpdateEmail : handleSendEmail}
                disabled={isSending || emailData.selectedContacts.length === 0 || !emailData.subject || !emailData.content}
                className={`flex-1 sm:w-auto px-2 sm:px-6 py-2 rounded-lg flex items-center justify-center gap-2 ${
                  isSending || emailData.selectedContacts.length === 0 || !emailData.subject || !emailData.content
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <Send size={18} />
                {isSending 
                  ? (isEditMode ? "Updating..." : "Sending...") 
                  : (isEditMode ? "Update" : "Send")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEmail