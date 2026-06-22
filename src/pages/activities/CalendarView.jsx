import React, { useState, useEffect } from "react";
import { Search, Eye } from "lucide-react";
import AddActivityModal from "./ModalCalendar";
import CalendarComponent from "./CalendarComponent";
import axios from "axios";
import { TourProvider, useTour } from "@reactour/tour";

const CalendarView = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allActivities, setAllActivities] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activityToEdit, setActivityToEdit] = useState(null);

  const [selectedCategory, setSelectedCategory] = useState("Any");
  const [selectedAssigned, setSelectedAssigned] = useState("Any");

  const user = JSON.parse(localStorage.getItem("user")); // already exists

  useEffect(() => {
    fetchCalendar();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedAssigned, allActivities]);

  const fetchCalendar = async () => {
    try {
      const token = localStorage.getItem("token"); // make sure JWT token is stored here
      const res = await axios.get(`${API_URL}/activity`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllActivities(res.data);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const handleAddActivity = (newActivity) => {
    setAllActivities((prev) => [...prev, newActivity]);
  };

  const handleEditActivity = (updatedActivity) => {
    setAllActivities((prev) =>
      prev.map((act) =>
        act._id === updatedActivity._id ? updatedActivity : act
      )
    );
    setActivityToEdit(null);
  };

  // Dynamic filters
  const uniqueCategories = [
    "Any",
    ...new Set(allActivities.map((a) => a.activityCategory).filter(Boolean)),
  ];
  const uniqueAssigned = [
    "Any",
    ...new Set(
      allActivities
        .map((a) =>
          a.assignedTo
            ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}`
            : null
        )
        .filter(Boolean)
    ),
  ];

  const applyFilters = () => {
    let filtered = [...allActivities];

    if (selectedCategory !== "Any") {
      filtered = filtered.filter(
        (a) => a.activityCategory === selectedCategory
      );
    }

    if (selectedAssigned !== "Any") {
      filtered = filtered.filter(
        (a) =>
          a.assignedTo &&
          `${a.assignedTo.firstName} ${a.assignedTo.lastName}` ===
            selectedAssigned
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => a.title?.toLowerCase().includes(q));
    }

    setActivities(filtered);
  };

  const tourSteps = [
    {
      selector: ".tour-calendar-title",
      content:
        "This is your Calendar View where you can see all your scheduled activities and events.",
    },
    {
      selector: ".tour-add-activity",
      content: "Click this button to add a new activity to your calendar.",
    },
    {
      selector: ".tour-category-filter",
      content: "Use this dropdown to filter activities by category.",
    },
    {
      selector: ".tour-assigned-filter",
      content: "Filter activities by assigned person using this dropdown.",
    },
    {
      selector: ".tour-search",
      content: "Search for specific activities by title using this search bar.",
    },
    {
      selector: ".tour-calendar-display",
      content:
        "This is your main calendar display where all filtered activities will be shown.",
    },
    {
      selector: ".tour-finish",
      content:
        "You've completed the tour! Click here anytime to review the features again.",
    },
  ];

  return (
    <TourProvider
      steps={tourSteps}
      afterOpen={() => (document.body.style.overflow = "hidden")}
      beforeClose={() => (document.body.style.overflow = "unset")}
      styles={{
        popover: (base) => ({ ...base, backgroundColor: "#fff", color: "#1f1f1f" }),
        maskArea: (base) => ({ ...base, rx: 8 }),
        badge: (base) => ({ ...base, display: "none" }),
        close: (base) => ({ ...base, right: "auto", left: 8, top: 8 }),
      }}
    >
      <div className="p-6">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-600 tour-calendar-title">
            Calendar View
          </h1>
          <div className="flex flex-wrap gap-3 items-center">
            {user?.role.name === "Admin" && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded shadow tour-add-activity"
              >
                Add activity
              </button>
            )}
            <TourComponent />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Category filter */}
            <select
              className="border p-2 rounded-md bg-white px-2 tour-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Assigned filter */}
            <select
              className="border rounded-md bg-white p-2 tour-assigned-filter"
              value={selectedAssigned}
              onChange={(e) => setSelectedAssigned(e.target.value)}
            >
              {uniqueAssigned.map((user) => (
                <option key={user} value={user}>
                  {user}
                </option>
              ))}
            </select>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64 ml-0 sm:ml-28 tour-search">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by title"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 py-2 w-56 border border-gray-200 bg-white rounded-4xl focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* Add / Edit Activity Modal */}
        {isModalOpen && (
          <AddActivityModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            activityToEdit={activityToEdit}
            onactivityAdded={handleAddActivity}
            onEdit={handleEditActivity}
          />
        )}

        {/* Calendar Display */}
        <div className="tour-calendar-display">
          <CalendarComponent activities={activities} />
        </div>
      </div>
    </TourProvider>
  );
};

const TourComponent = () => {
  const { setIsOpen, setCurrentStep } = useTour();

  const startTour = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  return (
    <button
      onClick={startTour}
      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
    >
      <Eye className="w-4 h-4" /> Take Tour
    </button>
  );
};

export default CalendarView;
