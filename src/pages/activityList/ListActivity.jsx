import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import ModalCalendar from "./ModalCalender";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";

const formatDateTime = (dateStr, timeStr) => {
  if (!dateStr) return "-";

  let date = new Date(dateStr);

  // If timeStr exists, set hours and minutes
  if (timeStr) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    date.setHours(hours);
    date.setMinutes(minutes);
  }

  return date.toLocaleString("en-US", {
    // <-- en-US for AM/PM
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true, // <-- 12-hour format with AM/PM
  });
};

const ListActivity = ({ activities, setActivities, fetchActivities }) => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState(null);
  const [activityToDelete, setActivityToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const menuRefs = useRef({});
  const buttonRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isScrollbar =
        event.target === document.body ||
        event.target.classList.contains("overflow-x-auto");

      if (
        openMenuIndex !== null &&
        !isScrollbar &&
        menuRefs.current[openMenuIndex] &&
        !menuRefs.current[openMenuIndex].contains(event.target) &&
        buttonRefs.current[openMenuIndex] &&
        !buttonRefs.current[openMenuIndex].contains(event.target)
      ) {
        setOpenMenuIndex(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuIndex]);

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? "hidden" : "auto";
  }, [isModalOpen]);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/activity/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state immediately
      setActivities((prev) => prev.filter((act) => act._id !== id));

      // Also refetch from server to ensure consistency
      if (fetchActivities) {
        fetchActivities();
      }

      toast.success("Activity deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete activity");
    } finally {
      setIsDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  };

  const confirmDelete = (activity) => {
    setActivityToDelete(activity);
    setIsDeleteDialogOpen(true);
  };

  const handleEditActivity = (updatedActivity) => {
    setActivities((prev) =>
      prev.map((activity) =>
        activity._id === updatedActivity._id ? updatedActivity : activity
      )
    );

    // Also refetch from server to ensure consistency
    if (fetchActivities) {
      fetchActivities();
    }
  };

  const handleActivityAdded = (newActivity) => {
    setActivities((prev) => [newActivity, ...prev]);

    // Also refetch from server to ensure consistency
    if (fetchActivities) {
      fetchActivities();
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = activities.slice(indexOfFirst, indexOfLast);

  return (
    <>
      <div className="mt-6 shadow rounded-lg bg-white overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-700 text-sm">
            <tr>
              <th className="p-3">Activity</th>
              <th className="p-3">Title</th>
              <th className="p-3">Assign to</th>
              <th className="p-3">Starting schedule</th>
              <th className="p-3">Ending schedule</th>
              <th className="p-3">Reminder</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {currentItems.length > 0 ? (
              currentItems.map((activity, index) => (
                <tr
                  key={activity._id}
                  className="border-t hover:bg-gray-50 relative"
                >
                  <td className="p-3">{activity.activityCategory}</td>
                  <td className="p-3 cursor-pointer">{activity.title}</td>
                  <td className="p-3">
                    {activity.assignedTo
                      ? `${activity.assignedTo.firstName} ${activity.assignedTo.lastName}`
                      : "-"}
                  </td>

                  <td className="p-3">
                    {formatDateTime(activity.startDate, activity.startTime)}
                  </td>
                  <td className="p-3">
                    {formatDateTime(activity.endDate, activity.endTime)}
                  </td>
                  <td className="p-3">
                    {activity.reminder
                      ? formatDateTime(activity.reminder)
                      : "-"}
                  </td>

                  <td className="p-3 text-right relative">
                    <button
                      ref={(el) => (buttonRefs.current[index] = el)}
                      onClick={() =>
                        setOpenMenuIndex(openMenuIndex === index ? null : index)
                      }
                      className="text-gray-500 mr-8 text-xl hover:text-blue-700"
                    >
                      ⋮
                    </button>
                    {openMenuIndex === index && (
                      <div
                        ref={(el) => (menuRefs.current[index] = el)}
                        className="absolute right-0 mt-2 w-24 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                      >
                        <button
                          className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                          onClick={() => {
                            setActivityToEdit(activity);
                            setIsModalOpen(true);
                            setOpenMenuIndex(null);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
                          onClick={() => {
                            confirmDelete(activity);
                            setOpenMenuIndex(null);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-4 text-center text-gray-500">
                  No activities found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {activities.length > 0 && (
          <div className="flex justify-between items-center p-4 bg-gray-50 text-sm text-gray-600">
            <div className="flex items-center space-x-2">
              <select
                className="border rounded p-1"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                {[5, 10, 20, 50].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
              <span>Items per page</span>
            </div>

            <div className="flex items-center space-x-2">
              <span>Go to page</span>
              <input
                type="number"
                value={currentPage}
                onChange={(e) => {
                  const page = Math.min(
                    Math.max(1, Number(e.target.value)),
                    totalPages
                  );
                  setCurrentPage(page);
                }}
                className="w-12 border rounded px-2 py-1"
                min="1"
                max={totalPages}
              />

              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 text-xl disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                &larr;
              </button>

              {[...Array(totalPages).keys()].map((num) => (
                <button
                  key={num + 1}
                  onClick={() => setCurrentPage(num + 1)}
                  className={`px-2 py-1 rounded-full ${
                    currentPage === num + 1
                      ? "bg-blue-500 text-white"
                      : "text-blue-500 hover:bg-blue-100"
                  }`}
                >
                  {num + 1}
                </button>
              ))}

              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
                className="px-2 text-xl disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      <ModalCalendar
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActivityToEdit(null);
        }}
        activityToEdit={activityToEdit}
        onActivityAdded={handleActivityAdded}
        onEdit={handleEditActivity}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the activity "
              {activityToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2 mt-4">
            <button
              onClick={() => setIsDeleteDialogOpen(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(activityToDelete?._id)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ListActivity;
