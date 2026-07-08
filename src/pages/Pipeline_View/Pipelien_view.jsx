  import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
  import { DndProvider, useDrag, useDrop } from "react-dnd";
  import { HTML5Backend } from "react-dnd-html5-backend";
  import axios from "axios";
  import { toast, ToastContainer } from "react-toastify";
  import "react-toastify/dist/ReactToastify.css";
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "../../components/ui/dialog";
  import { useNavigate, useParams } from "react-router-dom";
  import { TourProvider, useTour } from "@reactour/tour";
  import { Eye } from "lucide-react";

  // Import the Lost Deal components
  import useLostDealModal from "../LostDealModal/LossDeal";
  import LostDealModal from "../LostDealModal/ModalLoss";

const STAGES = [
    {
      id: "Qualification",
      title: "Qualification",
      color: "text-blue-600",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-300",
    },
    {
      id: "Proposal Sent-Negotiation",
      title: "Proposal Sent-Negotiation",
      color: "text-amber-600",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-300",
    },
    {
      id: "Invoice Sent",
      title: "Invoice Sent",
      color: "text-cyan-600",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-300",
    },
    {
      id: "Closed Won",
      title: "Closed Won",
      color: "text-emerald-600",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-300",
    },
    {
      id: "Closed Lost",
      title: "Closed Lost",
      color: "text-rose-600",
      bgColor: "bg-gray-100",
      borderColor: "border-gray-300",
    },
  ];

  const ItemTypes = {
    DEAL: "DEAL",
  };

  const tourSteps = [
    {
      selector: ".search-input",
      content: "Use this search bar to quickly find deals by name, company, or assigned person.",
    },
    {
      selector: ".create-deal-btn",
      content: "Click here to create a new deal. This button is only visible to Admin users.",
    },
    {
      selector: ".pipeline-column:first-child",
      content: "This is the Qualification stage. New leads enter here.",
    },
    {
      selector: ".pipeline-column:nth-child(2)",
      content: "This is the Proposal Sent-Negotiation stage where you discuss with clients.",
    },
    {
      selector: ".pipeline-column:nth-child(3)",
      content: "This is the Invoice Sent stage where offers are shared.",
    },
    {
      selector: ".pipeline-column:nth-child(4)",
      content: "This is the Closed Won stage for successfully converted deals.",
    },
    {
      selector: ".pipeline-column:nth-child(5)",
      content: "This is the Closed Lost stage where deals didn't succeed.",
    },
    {
      selector: ".deal-card:first-child",
      content: "This is a deal card. You can drag and drop it between columns to change its stage.",
    },
    {
      selector: ".deal-menu:first-child",
      content: "Click here to view options for editing, viewing details, or deleting a deal.",
    },
    {
      selector: ".tour-finish",
      content: "You've completed the tour! Click here anytime to review the features again.",
    },
  ];

  const CURRENCY_SYMBOLS = {
    USD: "$", EUR: "€", INR: "₹", GBP: "£", JPY: "¥",
    AUD: "A$", CAD: "C$", CHF: "CHF", MYR: "RM", AED: "د.إ",
    SGD: "S$", ZAR: "R", SAR: "﷼",
  };

/* ── Format Currency Value Function ─────────────────────── */
  const formatCurrencyValue = (val) => {
    if (!val) return "-";


    const match = val.match(/^([\d,]+)\s*([A-Z]+)$/i);
    if (!match) return val;

    const number = match[1].replace(/,/g, "");
    const currency = match[2].toUpperCase();
    const formattedNumber = Number(number).toLocaleString("en-IN"); 
    return `${formattedNumber}${currency}`; 
  };

/* ── Format Date Function ─────────────────────── */
  function formatDate(dateString) {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  // ----- Main Pipeline Board -----
  function SalesPipelineBoardPure() {
    const API_URL = import.meta.env.VITE_API_URL;

    const [columns, setColumns] = useState({});
    const [leads, setLeads] = useState([]);
    const [query, setQuery] = useState("");
    const [selectedStages, setSelectedStages] = useState([]);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [dealToDelete, setDealToDelete] = useState(null);
    const [users, setUsers] = useState([]);
    const [userRole, setUserRole] = useState("");
    const [userId, setUserId] = useState("");

    // NEW: Store previous stage when moving to Lost
    const [previousStage, setPreviousStage] = useState(null);

    const { setIsOpen, setCurrentStep } = useTour();
    const navigate = useNavigate();
    const { tenantSlug } = useParams();
    const scrollRef = useRef(null);
  // Use the custom hook for Lost Deal Modal
  const {
      modalOpen: lostModalOpen,
      lossReason,
      lossNotes,
      validationError,
      LOSS_REASONS,
      setLossReason,
      setLossNotes,
      openModal: openLostDealModal,
      closeModal: closeLostDealModal,
      validateAndExecute: validateLostDealForm,  // <-- CHANGE TO THIS
      resetModal,
      isLoading: isModalLoading,
      setIsLoading: setModalLoading,
      dealName: lostDealName,
      dealId: lostDealId,
    } = useLostDealModal();

    // Start the tour
    const startTour = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };

    // Get user info from localStorage
    useEffect(() => {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (userData) {
        setUserRole(userData.role?.name || "");
        setUserId(userData._id || "");
      }
    }, []);

    // 🔹 Fetch Deals and Leads on mount
    useEffect(() => {
      if (userRole) {
        fetchData();
        fetchUsers();
      }
    }, [userRole]);

    // Fetch sales users for dropdown in edit modal
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const filteredSales = (res.data.users || []).filter(
          (user) =>
            user.role &&
            user.role.name &&
            user.role.name.toLowerCase() === "sales",
        );
        setUsers(filteredSales);
      } catch (err) {
        toast.error("Failed to fetch users");
        console.error(err);
      }
    };

   const fetchData = async () => {
  try {
    setIsLoading(true);
    const token = localStorage.getItem("token");

    // Fetch deals
    const dealsRes = await axios.get(`${API_URL}/deals/getAll`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Fetch leads - handle different response structures
    const leadsRes = await axios.get(`${API_URL}/leads/getAllLead`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // DEBUG: Log the response to see its structure
    console.log("Leads API Response:", leadsRes.data);

    // Extract leads array - handle different possible response structures
    let leadsArray = [];
    
    if (Array.isArray(leadsRes.data)) {
      // If response is directly an array
      leadsArray = leadsRes.data;
    } else if (leadsRes.data && Array.isArray(leadsRes.data.data)) {
      // If response has a data property that's an array
      leadsArray = leadsRes.data.data;
    } else if (leadsRes.data && Array.isArray(leadsRes.data.leads)) {
      // If response has a leads property that's an array
      leadsArray = leadsRes.data.leads;
    } else if (leadsRes.data && typeof leadsRes.data === 'object') {
      // If it's an object, try to find any array property
      const possibleArrays = Object.values(leadsRes.data).filter(Array.isArray);
      if (possibleArrays.length > 0) {
        leadsArray = possibleArrays[0];
      }
    }
    
    setLeads(leadsArray);
    console.log("Processed leads array:", leadsArray);

    // Group deals by stage
    const grouped = {};
    STAGES.forEach((s) => (grouped[s.id] = []));

    // Get deals array - handle similar structure issues
    let dealsArray = [];
    if (Array.isArray(dealsRes.data)) {
      dealsArray = dealsRes.data;
    } else if (dealsRes.data && Array.isArray(dealsRes.data.deals)) {
      dealsArray = dealsRes.data.deals;
    } else if (dealsRes.data && Array.isArray(dealsRes.data.data)) {
      dealsArray = dealsRes.data.data;
    }

    dealsArray.forEach((deal) => {
      if (!grouped[deal.stage]) grouped[deal.stage] = [];

      // Find associated lead data - safely check if leadsArray is array
      let associatedLead = null;
      if (Array.isArray(leadsArray)) {
        associatedLead = leadsArray.find(
          (lead) =>
            lead && (lead._id === deal.leadId || lead.companyName === deal.companyName),
        );
      }

      // Enhance deal with lead information
      const enhancedDeal = {
        ...deal,
        companyName:
          deal.companyName ||
          (associatedLead ? associatedLead.companyName : ""),
      };

      grouped[deal.stage].push(enhancedDeal);
    });

    setColumns(grouped);
  } catch (err) {
    console.error("Error fetching data:", err);
    toast.error("Failed to load pipeline data");
    // Fallback to empty columns if API fails
    const emptyColumns = {};
    STAGES.forEach((s) => (emptyColumns[s.id] = []));
    setColumns(emptyColumns);
  } finally {
    setIsLoading(false);
  }
};

    const allItems = useMemo(() => Object.values(columns).flat(), [columns]);

    async function addDeal(stageId) {
      const title = prompt("Deal title");
      if (!title) return;
      const valueStr = prompt("Value (₹)");
      const value = Number(valueStr || 0) || 0;
      const assignedTo = prompt("Assigned User ID");

      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `${API_URL}/deals/createManual`,
          {
            dealName: title,
            value,
            assignedTo,
            stage: stageId,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        fetchData();
        toast.success("Deal created successfully!");
      } catch (err) {
        console.error(err);
        toast.error("Failed to create deal. Please try again.");
      }
    }

    // Check if user can edit/delete a deal
    const canEditDeleteDeal = (deal) => {
      if (userRole === "Admin") return true;
      return deal.assignedTo && deal.assignedTo._id === userId;
    };

  // Function to mark deal as lost – UPDATED to accept previousStage
  const markDealAsLost = useCallback(async (dealId, reason, notes, prevStage) => {
    try {
      const token = localStorage.getItem("token");
      setModalLoading(true);

      console.log("Saving lost deal with:", { dealId, reason, notes, prevStage });

      const response = await axios.post(
        `${API_URL}/deals/lost-reason`,
        {
          dealId,
          reason,
          notes,
          // CRITICAL: send the previous stage
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("API Response:", response.data);

      if (response.data.success) {
        // Update local state
        setColumns((prevColumns) => {
          const newColumns = { ...prevColumns };
          
          // Find and remove deal from its current stage
          let movedDeal = null;
          Object.keys(newColumns).forEach(stage => {
            const index = newColumns[stage].findIndex(deal => deal._id === dealId);
            if (index !== -1) {
              movedDeal = { ...newColumns[stage][index] };
              newColumns[stage] = newColumns[stage].filter(deal => deal._id !== dealId);
            }
          });
          
          // Add deal to Closed Lost stage with loss info and stageLostAt
          if (movedDeal) {
            newColumns["Closed Lost"] = [
              ...(newColumns["Closed Lost"] || []),
              {
                ...movedDeal,
                stage: "Closed Lost",
                lossReason: reason,
                lossNotes: notes,
                stageLostAt: prevStage // store in local state as well
              }
            ];
          }
          
          return newColumns;
        });

        toast.success(response.data.message || "Deal marked as Closed Lost successfully");
        closeLostDealModal();
        setPreviousStage(null); // reset after success
      } else {
        toast.error(response.data.message || "Failed to mark deal as lost");
      }
    } catch (error) {
      console.error("Error marking deal as lost:", error);
      
      if (error.response) {
        console.error("Response data:", error.response.data);
        console.error("Response status:", error.response.status);
        
        if (error.response.status === 404) {
          toast.error("API endpoint not found. Please check backend routes.");
        } else {
          toast.error(error.response.data?.message || `Server error: ${error.response.status}`);
        }
      } else if (error.request) {
        toast.error("No response from server. Please check your connection.");
      } else {
        toast.error("Error: " + error.message);
      }
    } finally {
      setModalLoading(false);
    }
  }, [API_URL, closeLostDealModal, setModalLoading]);

  // NEW FUNCTION: Open lost deal modal with action
  const openLostDealModalWithAction = useCallback((deal) => {
    // Create the action that will be executed when form is validated
    const action = async (lossData) => {
      console.log("Executing lost deal action with data:", lossData);
      await markDealAsLost(
        lossData.dealId, 
        lossData.reason, 
        lossData.notes, 
        previousStage
      );
    };
    
    // Call the hook's openModal with the deal and action
    openLostDealModal(deal, action);
  }, [markDealAsLost, previousStage, openLostDealModal]);

  // Updated moveDeal function - now uses openLostDealModalWithAction
  async function moveDeal(dealId, fromStage, toStage) {
    if (fromStage === toStage) return;

    // 🚨 If moving to Closed Lost → open modal first, capturing previous stage
    if (toStage === "Closed Lost") {
      const deal = columns[fromStage].find((d) => d._id === dealId);
      if (deal) {
        setPreviousStage(fromStage); // store the stage it's coming from
        openLostDealModalWithAction(deal); // CHANGED: was openLostDealModal
      }
      return;
    }

    // For other stages, update directly
    await updateDealStage(dealId, fromStage, toStage);
  }

    // Original updateDealStage function for regular stage changes
    async function updateDealStage(dealId, fromStage, toStage) {
      // Store deal info before update for CLV recalculation
      const deal = columns[fromStage]?.find(d => d._id === dealId);

      // 🔹 Local UI update — move the deal's card from its old column to the new one.
      setColumns((prev) => {
        let deal;
        const next = { ...prev };
        next[fromStage] = prev[fromStage].filter((d) => {
          if (d._id === dealId) {
            deal = d;
            return false;
          }
          return true;
        });
        if (deal) {
          next[toStage] = [...prev[toStage], { ...deal, stage: toStage }];
        }
        return next;
      });

      try {
        const token = localStorage.getItem("token");
        await axios.patch(
          `${API_URL}/deals/update-deal/${dealId}`,
          {
            stage: toStage,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        //  If moving OUT of "Closed Won", trigger CLV recalculation
        if (fromStage === "Closed Won" && toStage !== "Closed Won") {
          try {
            if (deal?.companyName && deal.companyName.trim() !== "") {
              const encodedName = encodeURIComponent(deal.companyName.trim());
              await axios.post(
                `${API_URL}/cltv/calculate/${encodedName}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log(` CLV updated for ${deal.companyName} - removed from active CLV`);
              
              toast.info(`Deal moved out of Closed Won - CLV updated`, {
                autoClose: 2000,
              });
            } else {
              console.warn("Cannot update CLV: companyName is missing", deal);
            }
          } catch (clvError) {
            console.error("Error updating CLV after stage change:", clvError);
            // Don't show error to user as it's not critical
          }
        }

        //  If moving INTO "Closed Won", also recalculate
        if (toStage === "Closed Won" && fromStage !== "Closed Won") {
          try {
            if (deal?.companyName && deal.companyName.trim() !== "") {
              const encodedName = encodeURIComponent(deal.companyName.trim());
              await axios.post(
                `${API_URL}/cltv/calculate/${encodedName}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log(` CLV updated for ${deal.companyName} - added to active CLV`);
            } else {
              console.warn("Cannot update CLV: companyName is missing", deal);
            }
          } catch (clvError) {
            console.error("Error updating CLV after stage change:", clvError);
          }
        }

      } catch (err) {
        console.error("Failed to update deal stage:", err);
        toast.error("Failed to save stage change! Please refresh.");
        // Rollback by re-fetching deals
        fetchData();
      }
    }

    // Handle confirm in modal – UPDATED to pass previousStage
    const handleConfirmLostDeal = useCallback(async () => {
      console.log("handleConfirmLostDeal called");
      if (!validateLostDealForm()) {
        console.log("Validation failed");
        return;
      }

      if (!lostDealId) {
        console.error("No deal ID found");
        toast.error("Deal ID not found. Please try again.");
        return;
      }

      console.log("Calling markDealAsLost with:", {
        dealId: lostDealId,
        reason: lossReason,
        notes: lossNotes,
        prevStage: previousStage
      });

      await markDealAsLost(lostDealId, lossReason, lossNotes, previousStage);
    }, [validateLostDealForm, markDealAsLost, lossReason, lossNotes, lostDealId, previousStage]);

    // Handle delete confirmation
    const handleDeleteClick = (deal) => {
      if (!canEditDeleteDeal(deal)) {
        toast.error("You don't have permission to delete this deal");
        return;
      }
      setDealToDelete(deal);
      setDeleteConfirmOpen(true);
    };

    // Handle actual deletion
    const handleDeleteConfirm = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Store company name before deletion for CLV cleanup
        const companyName = dealToDelete?.companyName;
        
        // Update UI immediately
        setColumns((prev) => {
          const next = { ...prev };
          for (const stage in next) {
            next[stage] = next[stage].filter((d) => d._id !== dealToDelete._id);
          }
          return next;
        });

        await axios.delete(`${API_URL}/deals/delete-deal/${dealToDelete._id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // If this was a Closed Won deal, trigger CLV cleanup
        if (dealToDelete?.stage === "Closed Won" && companyName) {
          try {
            await axios.post(
              `${API_URL}/cltv/calculate/${encodeURIComponent(companyName)}`,
              {},
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch (clvError) {
            console.error("Error updating CLV after deletion:", clvError);
          }
        }

        toast.success("Deal deleted successfully!");
      } catch (err) {
        console.error("Failed to delete deal:", err);
        toast.error("Failed to delete deal! Please try again.");
        // Revert UI changes if API call fails
        fetchData();
      } finally {
        setDeleteConfirmOpen(false);
        setDealToDelete(null);
      }
    };

    // Handle edit click - navigate to create deal page with deal data
    const handleEditClick = (deal) => {
      if (!canEditDeleteDeal(deal)) {
        toast.error("You don't have permission to edit this deal");
        return;
      }
      navigate(`/${tenantSlug}/createDeal`, { state: { deal } });
    };

    // Handle view click - navigate to pipeline view page with dealId parameter
    const handleViewClick = (deal) => {
      navigate(`/${tenantSlug}/Pipelineview/${deal._id}`);
    };

    const hasActiveFilters =
      Boolean(query.trim()) || selectedStages.length > 0 || Boolean(dateFrom) || Boolean(dateTo);

    // Filter deals by search query + stage checkboxes + created-date range
    const filtered = useMemo(() => {
      if (!hasActiveFilters) return columns;

      const q = query.trim().toLowerCase();
      const fromTime = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
      const toTime = dateTo ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
      const obj = {};

      for (const key of Object.keys(columns)) {
        if (selectedStages.length > 0 && !selectedStages.includes(key)) continue;

        const matchedDeals = columns[key].filter((d) => {
          if (q) {
            const matchesQuery =
              d.dealName.toLowerCase().includes(q) ||
              (d.companyName || "").toLowerCase().includes(q) ||
              (d.assignedTo?.firstName || "").toLowerCase().includes(q) ||
              (d.assignedTo?.lastName || "").toLowerCase().includes(q);
            if (!matchesQuery) return false;
          }

          if (fromTime !== null || toTime !== null) {
            if (!d.createdAt) return false;
            const createdTime = new Date(d.createdAt).getTime();
            if (fromTime !== null && createdTime < fromTime) return false;
            if (toTime !== null && createdTime > toTime) return false;
          }

          return true;
        });

        //  only add stage if deals exist
        if (matchedDeals.length > 0) {
          obj[key] = matchedDeals;
        }
      }

      return obj;
    }, [columns, query, selectedStages, dateFrom, dateTo, hasActiveFilters]);

    function toggleStage(stageId) {
      setSelectedStages((prev) =>
        prev.includes(stageId) ? prev.filter((s) => s !== stageId) : [...prev, stageId],
      );
    }

    function clearFilters() {
      setQuery("");
      setSelectedStages([]);
      setDateFrom("");
      setDateTo("");
    }

    // Calculate total values per column
    const totals = useMemo(() => {
      const t = {};
      for (const key of Object.keys(columns)) {
        t[key] = columns[key].reduce((sum, d) => sum + (d.value || 0), 0);
      }
      return t;
    }, [columns]);

    // Auto horizontal scroll while dragging (optional)
    useEffect(() => {
      function handleDrag(e) {
        const container = scrollRef.current;
        if (!container) return;

        const { clientX } = e;
        const { left, right } = container.getBoundingClientRect();
        const scrollAmount = 40;

        if (clientX - left < 80) {
          container.scrollLeft -= scrollAmount;
        } else if (right - clientX < 80) {
          container.scrollLeft += scrollAmount;
        }
      }

      window.addEventListener("dragover", handleDrag);
      return () => window.removeEventListener("dragover", handleDrag);
    }, []);

    if (isLoading) {
      return (
        <div className="min-h-screen w-full bg-gray-50 p-4 md:p-6 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading deals...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-gray-50 p-4 md:p-6">
        <ToastContainer position="top-right" autoClose={3000} />

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>
                Are you sure you want to delete the deal "{dealToDelete?.dealName}
                "?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                onClick={() => setDeleteConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                onClick={handleDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Lost Deal Modal */}
        <LostDealModal
          isOpen={lostModalOpen}
          onClose={() => {
            closeLostDealModal();
            setPreviousStage(null); // reset on close
          }}
          lossReason={lossReason}
          lossNotes={lossNotes}
          validationError={validationError}
          LOSS_REASONS={LOSS_REASONS}
          onReasonChange={setLossReason}
          onNotesChange={setLossNotes}
          onConfirm={handleConfirmLostDeal}
          title="Reason for Lost Deal"
          confirmText="Confirm & Move to Closed Lost"
          cancelText="Cancel"
          dealName={lostDealName}
          isLoading={isModalLoading}
        />

        {/* Toolbar */}
        <div className="mx-auto mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between max-w-[1600px]">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
               Pipeline View - Deal Stages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {userRole === "Admin"
                ? "Viewing all deals"
                : "Viewing deals assigned to you"}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <input
              className="search-input w-72 border border-gray-200 bg-white px-4 py-2 mr-12 rounded-full outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Search deals…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={startTour}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 tour-finish"
              >
                <Eye className="w-4 h-4" /> Take Tour
              </button>
              {userRole === "Admin" && (
                <button
                  className="create-deal-btn bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                  onClick={() => navigate(`/${tenantSlug}/createDeal`)}
                >
                  + Create Deal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filters: created-date range + stage checkboxes */}
        <div className="mx-auto mb-4 flex flex-col gap-3 md:flex-row md:items-center md:flex-wrap max-w-[1600px] bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            {STAGES.map((stage) => (
              <label
                key={stage.id}
                className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={selectedStages.includes(stage.id)}
                  onChange={() => toggleStage(stage.id)}
                  className="rounded border-gray-300"
                />
                {stage.title}
              </label>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Board */}
           {/* Board with "No deals found" message */}
      <div
        ref={scrollRef}
        className="mx-auto flex gap-4 overflow-x-auto pb-4 max-w-[1600px]"
      >
        {(() => {
          // Check if there are any results under the active filters
          const hasResults = hasActiveFilters
            ? Object.keys(filtered).length > 0
            : true;

          // Show "No deals found" message when filtering with no results
          if (hasActiveFilters && !hasResults) {
            return (
              <div className="w-full flex flex-col items-center justify-center py-20 px-4">
                <div className="text-center">
                  <svg
                    className="mx-auto h-16 w-16 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No deals found
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    No deals match the current search/filters
                  </p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Clear filters
                  </button>
                </div>
              </div>
            );
          }

          // Show filtered columns when there are results
          const visibleStages = hasActiveFilters
            ? STAGES.filter(stage => filtered[stage.id] && filtered[stage.id].length > 0)
            : STAGES;
          
          return visibleStages.map((stage, index) => (
            <Column
              key={stage.id}
              id={stage.id}
              title={stage.title}
              titleColor={stage.color}
              bgColor={stage.bgColor}
              borderColor={stage.borderColor}
              deals={filtered[stage.id] || []}
              moveDeal={moveDeal}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onView={handleViewClick}
              userRole={userRole}
              userId={userId}
              query={query}
              className={`pipeline-column ${index === 0 ? "first-column" : ""}`}
              index={index}
            />
          ));
        })()}
      </div>
    </div>
  );
}

  // ----- Column component -----
  function Column({
    id,
    title,
    titleColor,
    bgColor,
    borderColor,
    deals,
    moveDeal,
    onEdit,
    onDelete,
    onView,
    userRole,
    userId,
    className = "",
    index,
  }) {
    const [, dropRef] = useDrop({
      accept: ItemTypes.DEAL,
      drop: (item) => {
        if (item.from !== id) {
          moveDeal(item.id, item.from, id);
        }
      },
    });

    return (
      <div
        ref={dropRef}
        className={`min-w-[340px] w-[360px] flex flex-col border-2 border-gray-200 rounded-xl bg-white p-3 shadow-sm ${className}`}
        data-column-index={index}
      >
        <div className="mb-3">
          <h2
            className={`text-base font-bold flex items-center gap-2 ${titleColor} ${bgColor} p-3 rounded-lg`}
          >
            {title}
            <span className="inline-flex items-center justify-center border px-2 py-0.5 text-xs text-gray-600 bg-white rounded-full min-w-[24px]">
              {deals.length}
            </span>
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-2">
          <div className="flex flex-col gap-3 pb-2">
            {deals.map((deal, index) => (
              <DealCard
                key={deal._id}
                deal={deal}
                stageId={id}
                moveDeal={moveDeal}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={onView}
                userRole={userRole}
                userId={userId}
                className={index === 0 ? "deal-card" : ""}
              />
            ))}
            {deals.length === 0 && (
              <div className="mt-6 border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 rounded-xl">
                Drop deals here
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----- Deal Card -----
  function DealCard({
    deal,
    stageId,
    moveDeal,
    onEdit,
    onDelete,
    onView,
    userRole,
    userId,
    className = "",
  }) {
    // Overdue on an expired target, awaiting admin reassignment — read-only
    // for the owning sales person until it's reassigned.
    const isDisabled = deal.isActive === false && userRole !== "Admin";

    const [{ isDragging }, dragRef] = useDrag({
      type: ItemTypes.DEAL,
      item: { id: deal._id, from: stageId },
      canDrag: () => !isDisabled,
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    });

    const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    const userCurrency = storedUser?.currency || "USD";
    const userCurrencySymbol = CURRENCY_SYMBOLS[userCurrency] || userCurrency;

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Check if user can edit/delete this deal
    const canEditDelete =
      userRole === "Admin" || (deal.assignedTo && deal.assignedTo._id === userId);

    // Close menu when clicking outside
    useEffect(() => {
      function handleClickOutside(event) {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
          setMenuOpen(false);
        }
      }

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    // Function to get stage badge color based on stageId
    function getStageBadgeColor() {
      switch (stageId) {
        case "Qualification":
          return "bg-blue-100 text-blue-800";
        case "Proposal Sent-Negotiation":
          return "bg-amber-100 text-amber-800";
        case "Invoice Sent":
          return "bg-cyan-100 text-cyan-800";
        case "Closed Won":
          return "bg-emerald-100 text-emerald-800";
        case "Closed Lost":
          return "bg-rose-100 text-rose-800";
        default:
          return "bg-gray-100 text-gray-800";
      }
    }

    const assignedToName = deal.assignedTo
      ? `${deal.assignedTo.firstName || ""} ${
          deal.assignedTo.lastName || ""
        }`.trim()
      : "—";

    return (
      <div
        ref={isDisabled ? null : dragRef}
        title={isDisabled ? "Disabled — pending admin reassignment" : undefined}
        className={`border p-4 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative ${isDisabled ? "cursor-not-allowed opacity-50 grayscale pointer-events-none select-none bg-white border-gray-200" : "cursor-move bg-white border-gray-200"} ${className}`}
        style={{ opacity: isDragging ? 0.5 : isDisabled ? 0.5 : 1 }}
      >
        {/* Three-dot menu - only show if user has permission */}
        {canEditDelete && (
          <div className="absolute top-3 right-3 deal-menu" ref={menuRef}>
            <button
              className="p-1 rounded hover:bg-gray-100"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                className="w-4 h-4 text-gray-500"
                fill="currentColor"
                viewBox="0 0 16 16"
              >
                <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
              </svg>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                <button
                  className={`block w-full text-left px-4 py-2 text-sm ${isDisabled ? "text-gray-300 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100"}`}
                  disabled={isDisabled}
                  title={isDisabled ? "Disabled pending admin reassignment" : undefined}
                  onClick={() => {
                    if (isDisabled) return;
                    onEdit(deal);
                    setMenuOpen(false);
                  }}
                >
                  Edit
                </button>
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => {
                    onView(deal);
                    setMenuOpen(false);
                  }}
                >
                  View
                </button>
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  onClick={() => {
                    onDelete(deal);
                    setMenuOpen(false);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}

        {/* Deal Name - Centered and emphasized */}
        <div className={`text-center ${canEditDelete ? "pr-6" : ""}`}>
          <h3
            className="text-md font-semibold text-indigo-600 cursor-pointer hover:text-indigo-800 transition-colors"
            onClick={() => onView(deal)}
          >
            {deal.dealName}
          </h3>

          {isDisabled && (
            <div className="mb-1">
              <span className="text-[9px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded-full uppercase" title="Overdue — pending admin reassignment">
                Pending Reassignment
              </span>
            </div>
          )}

          <div className="text-xs text-stone-800 font-medium bg-indigo-100 py-1 px-2 rounded-full inline-block">
            {deal.companyName || "No company"}
          </div>
        </div>

        {/* Deal details */}
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <div className="grid gap-3">
            {/* Assigned To (Full width) */}
            <div className="flex items-center ml-8">
              <div className="bg-purple-100 p-1.5 rounded-md mr-2">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-xs text-gray-500">Assigned To</div>
                <div className="text-sm font-medium text-gray-800">
                  {assignedToName}
                </div>
              </div>
            </div>

            {/* Created & Value on the same row */}
            <div className="flex items-center justify-between">
              {/* Created */}
              <div className="flex items-center">
                <div className="bg-amber-100 p-1.5 rounded-md mr-2">
                  <svg
                    className="w-4 h-4 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Created</div>
                  <div className="text-sm font-medium text-gray-800">
                    {formatDate(deal.createdAt)}
                  </div>
                </div>
              </div>

              {/* Value */}
              <div className="flex items-center">
                <div>
                  <div className="text-xs text-gray-500">Value</div>
                  <div className="text-sm font-semibold text-gray-800">
                    {deal.value ? (
                      <>
                        {(() => {
                          const formatted = formatCurrencyValue(deal.value);
                          const match = formatted.match(/^([\d,]+)([A-Z]+)$/);
                          if (!match) return formatted;

                          const number = match[1];
                          const currency = match[2];

                          return (
                            <>
                              <span className="text-gray-800">{number}</span> {""}
                              <span className="text-gray-800">{currency}</span>
                            </>
                          );
                        })()}
                      </>
                    ) : (
                      "-"
                    )}
                  </div>
                  {deal.preferredCurrency === userCurrency && deal.preferredCurrencyValue != null && (
                    <div className="text-xs text-gray-500">
                      ({userCurrencySymbol} {Number(deal.preferredCurrencyValue).toLocaleString()})
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>


        {deal.tags?.length ? (
          <div className="flex flex-wrap gap-1">
            {deal.tags.map((t, i) => (
              <span
                key={i}
                className="bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 rounded-full"
              >
                {t}
              </span>
            ))}
          </div>
        ) : null}

        {/* Loss Information - Only show for Closed Lost deals, now includes stageLostAt */}
        {stageId === "Closed Lost" && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            {deal.lossReason && (
              <>
                <div className="text-xs text-gray-500">Loss Reason:</div>
                <div className="text-sm font-medium text-rose-700">
                  {deal.lossReason}
                </div>
              </>
            )}
            {deal.stageLostAt && (
              <div className="text-xs text-gray-500 mt-1">
                Lost from stage: <span className="font-medium text-gray-700">{deal.stageLostAt}</span>
              </div>
            )}
            {deal.lossNotes && (
              <div className="text-xs text-gray-600 mt-1">
                Notes: {deal.lossNotes}
              </div>
            )}
          </div>
        )}

        {/* Stage Indicator with badge design */}
        <div className="flex justify-between items-center text-xs mt-1">
          <span className="text-gray-500">Stage:</span>
          <span
            className={`font-bold px-2 py-1 rounded-full ${getStageBadgeColor()}`}
          >
            {stageId}
          </span>
        </div>
      </div>
    );
  }

/* ── Sales Pipeline Board Component ─────────────────────── */
  function SalesPipelineBoard() {
    return (
      <DndProvider backend={HTML5Backend}>
        <SalesPipelineBoardPure />
      </DndProvider>
    );
  }


  export default function SalesPipelineBoardWithTour() {
    return (
      <TourProvider
        steps={tourSteps}
        afterOpen={() => (document.body.style.overflow = "hidden")}
        beforeClose={() => (document.body.style.overflow = "unset")}
        styles={{
          popover: (base) => ({
            ...base,
            backgroundColor: "#fff",
            color: "#1f1f1f",
          }),
          maskArea: (base) => ({ ...base, rx: 8 }),
          badge: (base) => ({
            ...base,
            display: "none",
          }),
          close: (base) => ({
            ...base,
            right: "auto",
            left: 8,
            top: 8,
          }),
        }}
      >
        <SalesPipelineBoard />
      </TourProvider>
    );
  }
