import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";
import AddActivityModal from "./ModalCalender";
import ListActivity from "./ListActivity";
import axios from "axios";

const CalendarView = () => {

 const API_URL = import.meta.env.VITE_API_URL;


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activities, setActivities] = useState([]);
  const [activityToEdit, setActivityToEdit] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");

  useEffect(() => {
    fetchCalendar();
  }, []);

  const fetchCalendar = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return toast.error("User not logged in");

    const res = await axios.get(`${API_URL}/activity`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setActivities(res.data);
  } catch (error) {
    console.error("Error fetching activities:", error);
    toast.error("Failed to fetch activities");
  }
};

  const handleAddActivity = (newActivity) => {
    setActivities([...activities, newActivity]);
  };

  const handleEditActivity = (updatedActivityFromBackend) => {
    setActivities(
      activities.map((act) =>
        act._id === updatedActivityFromBackend._id
          ? updatedActivityFromBackend
          : act
      )
    );
    setActivityToEdit(null);
  };

  // Get unique categories and assigned users for dynamic filters
  const uniqueCategories = [
    ...new Set(activities.map((a) => a.activityCategory).filter(Boolean)),
  ];
  const uniqueAssignedUsers = [
    ...new Set(
      activities
        .map((a) =>
          a.assignedTo
            ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}`
            : null
        )
        .filter(Boolean)
    ),
  ];

  // Filter activities based on search and selected filters
  const filteredActivities = activities.filter((activity) => {
    const matchesSearch = activity.title
      ?.toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "" || activity.activityCategory === categoryFilter;
    const matchesAssigned =
      assignedFilter === "" ||
      (activity.assignedTo &&
        `${activity.assignedTo.firstName} ${activity.assignedTo.lastName}` ===
          assignedFilter);

    return matchesSearch && matchesCategory && matchesAssigned;
  });
const user = JSON.parse(localStorage.getItem("user")); // already exists

  return (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-600">Calendar View</h1>
        {user?.role.name === "Admin" && (
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded shadow"
          onClick={() => setIsModalOpen(true)}
        >
          Add activity
        </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <select
            className="border rounded-md bg-white p-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            className="border rounded-md bg-white p-2"
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
          >
            <option value="">All Assigned Users</option>
            {uniqueAssignedUsers.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 ml-0 sm:ml-28">
          <Search
            className="absolute left-3 top-2.5 text-gray-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by title"
            className="pl-10 py-2 w-56 border border-gray-200 bg-white rounded-4xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isModalOpen && (
        <AddActivityModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          activityToEdit={activityToEdit}
          onActivityAdded={handleAddActivity}
          onEdit={handleEditActivity}
        />
      )}

      <ListActivity
        activities={filteredActivities}
        setActivities={setActivities}
      />
    </div>
  );
};

export default CalendarView;
