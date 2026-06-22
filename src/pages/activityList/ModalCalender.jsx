import React, { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const ModalCalendar = ({
  isOpen,
  onClose,
  activityToEdit,
  onActivityAdded,
  onEdit,
}) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    activityCategory: "Call",
    title: "",
    description: "",
    deal: "",
    assignedTo: "",
    startDate: null,
    endDate: null,
    startTime: "",
    endTime: "",
    reminder: "",
  });

  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  // Fetch deals and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found. User not authenticated.");
          return;
        }

        //  Fetch all deals with token
        const dealsRes = await axios.get(`${API_URL}/deals/getAll`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDeals(dealsRes.data);

        //  Fetch all users with token
        const usersRes = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const filteredSales = (usersRes.data.users || []).filter(
          (user) => user.role?.name?.toLowerCase() === "sales"
        );
        setUsers(filteredSales);
      } catch (err) {
        console.error("Error fetching deals/users", err);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, API_URL]);

  // Fill data if editing
  useEffect(() => {
    if (activityToEdit) {
      setFormData({
        activityCategory: activityToEdit.activityCategory || "Call",
        title: activityToEdit.title || "",
        description: activityToEdit.description || "",
        deal: activityToEdit.deal?._id || "",
        assignedTo: activityToEdit.assignedTo?._id || "",
        startDate: activityToEdit.startDate
          ? new Date(activityToEdit.startDate)
          : null,
        endDate: activityToEdit.endDate
          ? new Date(activityToEdit.endDate)
          : null,
        startTime: activityToEdit.startTime || "",
        endTime: activityToEdit.endTime || "",
        reminder: activityToEdit.reminder || "",
      });
    } else {
      // Reset form when adding new activity
      setFormData({
        activityCategory: "Call",
        title: "",
        description: "",
        deal: "",
        assignedTo: "",
        startDate: null,
        endDate: null,
        startTime: "",
        endTime: "",
        reminder: "",
      });
    }
  }, [activityToEdit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (name, date) =>
    setFormData((prev) => ({ ...prev, [name]: date }));

  const handleTimeChange = (name, time) =>
    setFormData((prev) => ({ ...prev, [name]: time }));

  // Time picker generation
  const generateTimeOptions = () => {
    let times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 10) {
        times.push(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
        );
      }
    }
    return times;
  };
  const timeOptions = generateTimeOptions();

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (
      !formData.title ||
      !formData.deal ||
      !formData.startDate ||
      !formData.endDate ||
      !formData.startTime ||
      !formData.endTime
    ) {
      toast.error("Please fill all required fields!");
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Authentication token not found. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      // Prepare payload
      const payload = {
        ...formData,
        assignedTo: formData.assignedTo || undefined,
        reminder: formData.reminder
          ? new Date(
              formData.startDate.getTime() - parseReminder(formData.reminder)
            )
          : undefined,
      };

      const url = activityToEdit
        ? `${API_URL}/activity/update/${activityToEdit._id}`
        : `${API_URL}/activity/add`;

      const method = activityToEdit ? axios.put : axios.post;

      const res = await method(url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (activityToEdit) {
        onEdit(res.data.data);
        toast.success("Activity updated successfully!");
      } else {
        onActivityAdded(res.data.data);
        toast.success("Activity added successfully!");
      }

      onClose();
    } catch (err) {
      console.error(err.response?.data || err);
      toast.error(
        err.response?.data?.message || "Error saving activity. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to convert reminder to milliseconds
  const parseReminder = (reminder) => {
    switch (reminder) {
      case "15min":
        return 15 * 60 * 1000;
      case "30min":
        return 30 * 60 * 1000;
      case "1hour":
        return 60 * 60 * 1000;
      case "1day":
        return 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  };

  // Close time pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (startTimeRef.current && !startTimeRef.current.contains(e.target))
        setShowStartTimePicker(false);
      if (endTimeRef.current && !endTimeRef.current.contains(e.target))
        setShowEndTimePicker(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl w-full p-6 bg-white rounded-xl shadow-xl border border-gray-200 overflow-y-auto max-h-[90vh]">
        <DialogHeader className="flex justify-between items-center mb-4">
          <DialogTitle className="text-xl font-semibold text-gray-800">
            {activityToEdit ? "Edit Activity" : "Add Activity"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Activity Category */}
          <div>
            <label className="block text-gray-600 mb-2 font-medium">
              Activity Category
            </label>
            <div className="flex flex-wrap gap-2">
              {["Call", "Meeting", "Email", "Task", "Deadline", "Others"].map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, activityCategory: type })
                    }
                    className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                      formData.activityCategory === type
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {type}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Title & Description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-gray-600 mb-2 font-medium">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                placeholder="Activity title"
                required
              />
            </div>

            <div>
              <label className="block text-gray-600 mb-2 font-medium">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 h-28 resize-none"
                placeholder="Description"
              />
            </div>
          </div>

          {/* Deal & Assigned To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-600 mb-2 font-medium">
                Deal *
              </label>
              <select
                name="deal"
                value={formData.deal}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                required
              >
                <option value="">Select Deal</option>
                {deals.map((deal) => (
                  <option key={deal._id} value={deal._id}>
                    {deal.dealName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-600 mb-2 font-medium">
                Assigned To
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                className="w-full p-3 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {["start", "end"].map((type) => (
              <div key={type}>
                <label className="block text-gray-600 mb-2 font-medium">
                  {type === "start" ? "Start" : "End"} Date & Time *
                </label>
                <div className="flex flex-col gap-2">
                  <DatePicker
                    selected={formData[`${type}Date`]}
                    onChange={(date) => handleDateChange(`${type}Date`, date)}
                    className="w-full p-3 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholderText={`${
                      type.charAt(0).toUpperCase() + type.slice(1)
                    } date`}
                    required
                  />
                  <div
                    className="relative w-full"
                    ref={type === "start" ? startTimeRef : endTimeRef}
                  >
                    <input
                      type="text"
                      readOnly
                      value={formData[`${type}Time`]}
                      onClick={() =>
                        type === "start"
                          ? setShowStartTimePicker(!showStartTimePicker)
                          : setShowEndTimePicker(!showEndTimePicker)
                      }
                      className="w-full p-3 border rounded-lg border-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
                      placeholder={`${
                        type.charAt(0).toUpperCase() + type.slice(1)
                      } time`}
                      required
                    />
                    {(type === "start"
                      ? showStartTimePicker
                      : showEndTimePicker) && (
                      <div className="absolute z-50 bg-white border border-gray-200 shadow-md max-h-40 overflow-y-auto w-full rounded-md mt-1 top-full left-0">
                        {timeOptions.map((time) => (
                          <div
                            key={time}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            onClick={() => {
                              handleTimeChange(`${type}Time`, time);
                              type === "start"
                                ? setShowStartTimePicker(false)
                                : setShowEndTimePicker(false);
                            }}
                          >
                            {time}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-gray-600 mb-2 font-medium">
              Reminder
            </label>
            <select
              name="reminder"
              value={formData.reminder}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">No reminder</option>
              <option value="15min">15 minutes before</option>
              <option value="30min">30 minutes before</option>
              <option value="1hour">1 hour before</option>
              <option value="1day">1 day before</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition w-full sm:w-auto disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full sm:w-auto disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCalendar;