import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { FaArrowLeft, FaArrowRight, FaCalendarAlt, FaTimes } from "react-icons/fa";
import ModalCalendar from "./ModalCalendar";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const localizer = momentLocalizer(moment);

const CalendarComponent = ({ activities }) => {
 
  const API_URL = import.meta.env.VITE_API_URL;


  const [view, setView] = useState("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState("Call");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const [organizations, setOrganizations] = useState([]);
  const [persons, setPersons] = useState([]);
  const [deals, setDeals] = useState([]);
  const [allActivities, setActivities] = useState([]);
  
  const [formData, setFormData] = useState({
    activityCategory: "Call",
    title: "",
    description: "",
    activityType: "",
    activityModel: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    collaborators: [],
    reminder: "",
  });



  const resetForm = () => {
    setFormData({
      activityCategory: "Call",
      title: "",
      description: "",
      activityType: "",
      activityModel: "",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      collaborators: [],
      reminder: "",
    });
  };

  const fetchCalendar = async () => {
    try {
      const res = await axios.get(`${API_URL}/activity`);
      setActivities(res.data);
    } catch (error) {
      console.error("Error fetching activities:", error);
    }
  };

  const handleAddDetailsClick = () => {
    setShowModal(false);
    setShowDetailsModal(true);
  };

  const getRandomColor = () => {
    const colors = [
      "#E3F2FD",
      "#E8F5E9",
      "#FFF3E0",
      "#FBE9E7",
      "#EDE7F6",
      "#E0F2F1",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const formattedEvents = activities.map((activity) => {
    let start = moment.utc(activity.startDate).local();
    let end = moment.utc(activity.endDate).local();

    if (activity.startTime) {
      const [hours, minutes] = activity.startTime.split(":").map(Number);
      start.set({ hour: hours, minute: minutes });
    }

    if (activity.endTime) {
      const [hours, minutes] = activity.endTime.split(":").map(Number);
      end.set({ hour: hours, minute: minutes });
      
    }

    return {
      title: `${start.format("hh:mm A")} - ${activity.title}`,
      start: start.toDate(),
      end: end.toDate(),
      color: getRandomColor(),
    };
  });


  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color,
        color: "#2D3748",
        borderRadius: "6px",
        padding: "6px",
        fontWeight: 500,
        fontSize: "13px",
        borderLeft: `4px solid ${event.color.replace(")", ", 0.8)").replace("rgb", "rgba")}`,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      },
    };
  };

  const handleSelectSlot = (slotInfo) => {
    setSelectedDate(slotInfo.start);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDate(null);
  };

  // Format date for display
  const formatDate = (date) => {
    return moment(date).format("MMMM D, YYYY");
  };

  return (
    <div className="mt-6 flex justify-center">
      <div className="shadow-lg border border-gray-100 p-6 bg-white w-full max-w-screen-xl rounded-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <FaCalendarAlt className="mr-3 text-blue-500" />
            Calendar
          </h2>
          
          
        </div>   

        <Calendar
          selectable
          localizer={localizer}
          events={formattedEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ 
            height: 700, 
            backgroundColor: "white",
            borderRadius: "12px",
          }}
          view={view}
          date={currentDate}
          views={["month", "week", "day"]}
          onView={(newView) => setView(newView)}
          onNavigate={(date) => setCurrentDate(date)}
          eventPropGetter={eventStyleGetter}
          onSelectSlot={handleSelectSlot}
        />
      </div>
 {/* ModalCalendar */}
      {showDetailsModal && (
        <ModalCalendar
          isOpen={true}
          onClose={() => setShowDetailsModal(false)}
          activityToEdit={null}
          onactivityAdded={(newActivity) => {
            fetchCalendar();
            setShowDetailsModal(false);
          }}
          onEdit={(updatedActivity) => {
            fetchCalendar();
            setShowDetailsModal(false);
          }}
        />
      )}
    </div>
  );
};

export default CalendarComponent;