import React, { useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import {
  FaEllipsisV,
  FaRupeeSign,
  FaDollarSign,
  FaEuroSign,
  FaPoundSign,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { useModal } from "../../context/ModalContext.jsx";
import InvoiceModal from "./InvoiceModal.jsx";
import axios from "axios";
import ReactDOM from "react-dom";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import "react-datepicker/dist/react-datepicker.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Receipt, CheckCircle, Clock, FileText, Trash2 } from "lucide-react";

const CustomCalendarInput = React.forwardRef(({ value, onClick, placeholder }, ref) => (
  <div
    onClick={onClick}
    ref={ref}
    className="flex items-center justify-between bg-white border border-gray-200 rounded-2xl px-5 py-2.5 cursor-pointer shadow-sm hover:border-blue-400 transition-all min-w-[260px] h-[48px]"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <span className="text-gray-600 text-[17px] font-normal">
      {value || placeholder}
    </span>
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  </div>
));

const InvoiceHead = () => {
  const API_URL = import.meta.env.VITE_API_URL;

  const { openModal } = useModal();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get("status");
  const [startDate, setStartDate] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAssignTo, setFilterAssignTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMethod, setFilterMethod] = useState("");
  const [openIndex, setOpenIndex] = useState(null);
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [dropdownButton, setDropdownButton] = useState(null);

  // Summary stats — always computed from ALL filteredInvoices
  const [summaryStats, setSummaryStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    totalAmount: 0,
    paidAmount: 0,
    unpaidAmount: 0,
  });

  // Pagination — only affects the TABLE, not the cards
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // modal state for email sending
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailMessage, setEmailMessage] = useState("Sending invoice email...");
  const [emailStatus, setEmailStatus] = useState("loading");

  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState("Downloading invoice...");
  const [downloadStatus, setDownloadStatus] = useState("loading");

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // ─── FIX 1: Fetch ALL invoices once — no page/limit params ───────────────
  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/invoices/getInvoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data.invoices || response.data;
      setInvoices(data);
      // filteredInvoices will be set by applyFilters via its useEffect
    } catch (error) {
      toast.error("Error fetching invoices!");
      console.error("Error fetching invoices:", error.response?.data || error);
    }
  };

  // ─── Only re-fetch when data actually changes, NOT on page change ──
  useEffect(() => {
    fetchInvoices();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenIndex(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ───  Reset to page 1 whenever filters change ──────────────────────
  useEffect(() => {
    applyFilters();
    setCurrentPage(1);
  }, [searchTerm, startDate, filterAssignTo, filterStatus, filterMethod, invoices, statusFilter]);

  // ─── Summary stats computed from ALL filteredInvoices ─────────────
  useEffect(() => {
    let total = 0, paid = 0, unpaid = 0;
    let totalAmount = 0, paidAmount = 0, unpaidAmount = 0;

    filteredInvoices.forEach((inv) => {
      total++;
      const amount = Number(inv.total) || 0;
      totalAmount += amount;

      if (inv.status === "paid") {
        paid++;
        paidAmount += amount;
      } else {
        unpaid++;
        unpaidAmount += amount;
      }
    });

    setSummaryStats({ total, paid, unpaid, totalAmount, paidAmount, unpaidAmount });
  }, [filteredInvoices]);

  const user = JSON.parse(localStorage.getItem("user"));

/* ── Handle Send Email Function ─────────────────────── */
  const handleSendEmail = async (invoiceId) => {
    try {
      setSendingEmailId(invoiceId);
      setEmailModalOpen(true);
      setEmailStatus("loading");
      setEmailMessage("📨 Sending invoice email...");

      await axios.post(`${API_URL}/invoices/sendEmail/${invoiceId}`);

      const invoice = invoices.find((inv) => inv._id === invoiceId);
      const dealId = invoice?.items?.[0]?.deal?._id;

      if (dealId) {
        const token = localStorage.getItem("token");
        await axios.patch(
          `${API_URL}/deals/update-deal/${dealId}`,
          { stage: "Invoice Sent" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setEmailStatus("success");
      setEmailMessage(" Invoice sent to customer email!");
    } catch (error) {
      setEmailStatus("error");
      setEmailMessage(" Failed to send email. Please try again.");
      toast.error("Failed to send invoice email.");
      console.error("Error sending invoice:", error);
    } finally {
      setSendingEmailId(null);
      setOpenIndex(null);
      setTimeout(() => setEmailModalOpen(false), 2000);
    }
  };

/* ── Apply Filters Function ─────────────────────── */
  const applyFilters = () => {
    let filtered = [...invoices];

    if (searchTerm) {
      filtered = filtered.filter((inv) =>
        inv.invoicenumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (startDate) {
      const sDate = new Date(startDate);
      const sDay = sDate.getDate();
      const sMonth = sDate.getMonth();
      const sYear = sDate.getFullYear();

      filtered = filtered.filter((invoice) => {
        const createdDate = invoice.createdAt ? new Date(invoice.createdAt) : null;
        const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : null;

        const checkMatch = (targetDate) => {
          if (!targetDate || isNaN(targetDate.getTime())) return false;
          return (
            targetDate.getDate() === sDay &&
            targetDate.getMonth() === sMonth &&
            targetDate.getFullYear() === sYear
          );
        };

        return checkMatch(createdDate) || checkMatch(dueDate);
      });
    }

    if (filterStatus) {
      filtered = filtered.filter((inv) => inv.status === filterStatus);
    }

    // URL query param filter (e.g. ?status=pending)
    if (statusFilter === "pending") {
      filtered = filtered.filter((inv) =>
        ["pending", "unpaid"].includes(inv.status?.toLowerCase())
      );
    }

    if (filterAssignTo) {
      filtered = filtered.filter((inv) => inv.assignTo?._id === filterAssignTo);
    }

    setFilteredInvoices(filtered);
  };

  useEffect(() => {
    if (statusFilter === "pending") {
      setFilterStatus("unpaid");
    }
  }, [statusFilter]);

/* ── Handle Delete Function ─────────────────────── */
  const handleDelete = async (invoiceId) => {
    try {
      await axios.delete(`${API_URL}/invoices/delete/${invoiceId}`);
      toast.success("Invoice deleted successfully!");
      setRefreshTrigger((prev) => prev + 1);
      setDeleteConfirmOpen(false);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice.");
    }
  };

/* ── Handle Edit Function ─────────────────────── */
  const handleEdit = (invoice) => {
    setEditingInvoice(invoice);
    openModal();
  };

/* ── Confirm Delete Function ─────────────────────── */
  const confirmDelete = (invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteConfirmOpen(true);
    setOpenIndex(null);
  };

/* ── Handle Checkbox Change Function ─────────────────────── */
  const handleCheckboxChange = (id) =>
    setSelectedInvoices((prev) =>
      prev.includes(id) ? prev.filter((inv) => inv !== id) : [...prev, id]
    );

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(filteredInvoices.map((inv) => inv._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const isAllSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((inv) => selectedInvoices.includes(inv._id));

  const handleBulkDelete = () => {
    if (!selectedInvoices.length) return toast.info("Select invoices to delete");
    setIsBulkDeleteModalOpen(true);
  };

/* ── Handle Bulk Delete Confirm Function ─────────────────────── */
  const handleBulkDeleteConfirm = async () => {
    try {
      setIsBulkDeleting(true);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/invoices/bulk-delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ids: selectedInvoices },
      });
      toast.success(`Successfully deleted ${selectedInvoices.length} invoice(s)`);
      setSelectedInvoices([]);
      setIsBulkDeleteModalOpen(false);
      await fetchInvoices();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete invoices");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleClearSelection = () => setSelectedInvoices([]);

/* ── Handle Invoice Saved Function ─────────────────────── */
  const handleInvoiceSaved = () => {
    setRefreshTrigger((prev) => prev + 1);
    setEditingInvoice(null);
  };

/* ── Download Invoice Function ─────────────────────── */
  const downloadInvoice = async (invoiceId, invoiceNumber) => {
    try {
      setDownloadModalOpen(true);
      setDownloadStatus("loading");
      setDownloadMessage("📥 Downloading invoice PDF...");

      const response = await axios.get(`${API_URL}/invoices/download/${invoiceId}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      setDownloadStatus("success");
      setDownloadMessage("Invoice downloaded successfully!");
    } catch (error) {
      setDownloadStatus("error");
      setDownloadMessage("Failed to download invoice.");
      toast.error("Failed to download invoice.");
      console.error("Error downloading invoice:", error);
    } finally {
      setTimeout(() => setDownloadModalOpen(false), 2000);
    }
  };

  const handleInvoiceClick = (invoiceId) => navigate(`/invoices/${invoiceId}`);

  // ─── Pagination — slices filteredInvoices for TABLE only ─────────────────
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);

  const handlePageChange = (page) => setCurrentPage(page);

  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatCurrency = (amount) =>
    amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

 // Per-row live INR cell
  const INRCell = ({ invoice }) => {
    const [liveInrValue, setLiveInrValue] = useState(null);

    useEffect(() => {
      const fetchLiveINR = async () => {
        // Fetch live rate if:
        // 1. Unpaid invoice (no stored inrAmount)
        // 2. Paid invoice but inrAmount was never saved (old invoices)
        if (!invoice.inrAmount) {
          try {
            const response = await axios.get(
              `${API_URL}/invoices/exchange-rate/${invoice.currency}`
            );
            const rate = response.data?.rate || 1;
            setLiveInrValue((Number(invoice.total) || 0) * rate);
          } catch (err) {
            console.error("Error fetching rate:", err);
          }
        }
      };
      fetchLiveINR();
    }, [invoice.currency, invoice.total, invoice.inrAmount]);

    // Paid invoice with stored INR amount (new invoices)
    if (invoice.inrAmount) {
      return (
        <span className="text-green-600 font-semibold">
          ₹ {invoice.inrAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }

    // Live converted value (unpaid invoices OR old paid invoices without stored inrAmount)
    if (liveInrValue !== null) {
      return (
        <span className={invoice.status === "paid" ? "text-green-600 font-semibold" : "text-orange-500"}>
          ₹ {liveInrValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    }

    return <span className="text-gray-400 text-xs">Loading...</span>;
  };

  // ─── FIX 5: INR totals computed from ALL filteredInvoices ─────────────────
  const [inrTotals, setInrTotals] = useState({ total: 0, paid: 0, unpaid: 0 });

  useEffect(() => {
    const calculateINRTotals = async () => {
      let totalINR = 0, paidINR = 0, unpaidINR = 0;

      for (const inv of filteredInvoices) {
        const amount = Number(inv.total) || 0;

        if (inv.inrAmount) {
          // Has stored INR amount (paid invoices with conversion saved)
          totalINR += inv.inrAmount;
          paidINR += inv.inrAmount;
        } else {
          // Fetch live rate for unpaid OR old paid invoices without stored inrAmount
          try {
            const response = await axios.get(
              `${API_URL}/invoices/exchange-rate/${inv.currency}`
            );
            const rate = response.data?.rate || 1;
            const inrValue = amount * rate;
            totalINR += inrValue;

            if (inv.status === "paid") {
              paidINR += inrValue;
            } else {
              unpaidINR += inrValue;
            }
          } catch {
            totalINR += amount;
            if (inv.status === "paid") {
              paidINR += amount;
            } else {
              unpaidINR += amount;
            }
          }
        }
      }

      setInrTotals({ total: totalINR, paid: paidINR, unpaid: unpaidINR });
    };

    calculateINRTotals();
  }, [filteredInvoices]);

  const formatINR = (amount) =>
    amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        {user?.role?.name?.toLowerCase() === "admin" && (
          <button
            onClick={() => { setEditingInvoice(null); openModal(); }}
            className="bg-[#4466f2] p-2 px-4 text-white rounded-sm hover:bg-[#3355e0] transition-colors"
          >
            + Create invoices
          </button>
        )}
      </div>

      {/* Summary Cards — show totals across ALL filtered invoices, not just current page */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.total}</p>
            </div>
            <div className="p-2 bg-blue-100 rounded-xl">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Total Value (INR)</span>
            <span className="text-xl font-bold text-gray-800">₹ {formatINR(inrTotals.total)}</span>
          </div>
        </div>

        <div
          className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-all"
          onClick={() => setFilterStatus("paid")}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Paid Invoices</p>
              <p className="text-2xl font-bold text-green-600">{summaryStats.paid}</p>
            </div>
            <div className="p-2 bg-green-100 rounded-xl">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Paid Value (INR)</span>
            <span className="text-xl font-bold text-green-600">₹ {formatINR(inrTotals.paid)}</span>
          </div>
        </div>

        <div
          className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5 shadow-sm cursor-pointer hover:shadow-md transition-all"
          onClick={() => setFilterStatus("unpaid")}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-red-600">{summaryStats.unpaid}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-xl">
              <Clock className="h-5 w-5 text-red-600" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Unpaid Value (INR)</span>
            <span className="text-xl font-bold text-red-600">₹ {formatINR(inrTotals.unpaid)}</span>
          </div>
        </div>
      </div>

      {statusFilter === "pending" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-yellow-600" />
            <span className="text-yellow-800">
              Showing only <strong>Pending Invoices</strong>
            </span>
          </div>
          <button
            onClick={() => navigate("/invoices")}
            className="text-sm text-yellow-600 hover:text-yellow-800 font-medium px-3 py-1 rounded-md hover:bg-yellow-100 transition-colors"
          >
            Clear Filter
          </button>
        </div>
      )}

      <InvoiceModal onInvoiceSaved={handleInvoiceSaved} editingInvoice={editingInvoice} />

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mt-4 items-center justify-between">
        <div className="flex flex-wrap gap-4">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="dd-MM-yyyy"
            placeholderText="dd-mm-yyyy"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            todayButton="Today"
            isClearable
            customInput={<CustomCalendarInput />}
          />
          <select
            className="px-4 py-2 rounded-md bg-white border text-gray-600"
            value={filterAssignTo}
            onChange={(e) => setFilterAssignTo(e.target.value)}
          >
            <option value="">All Users</option>
            {[...new Set(invoices.map((inv) => inv.assignTo?._id))].map((userId) => {
              const u = invoices.find((inv) => inv.assignTo?._id === userId)?.assignTo;
              return (
                <option key={userId} value={userId}>
                  {u ? `${u.firstName} ${u.lastName}` : "Unknown"}
                </option>
              );
            })}
          </select>
          <select
            className="px-4 py-2 rounded-md bg-white border text-gray-600"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
        </div>

        <div className="flex items-center border rounded-full bg-white px-3 w-[250px]">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search Invoice #"
            className="ml-2 w-full py-2 rounded-full outline-none text-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Bulk Delete Bar */}
      {selectedInvoices.length > 0 && (
        <div className="mb-4 mt-4 flex items-center justify-between bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-700 font-medium">
              {selectedInvoices.length} invoice{selectedInvoices.length > 1 ? "s" : ""} selected
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
            >
              <Trash2 size={14} />
              {isBulkDeleting ? "Deleting..." : `Delete Selected (${selectedInvoices.length})`}
            </button>
            <button
              onClick={handleClearSelection}
              className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Table — only paginatedInvoices (slice of filteredInvoices) */}
      <div className="bg-white mt-6 rounded-xl shadow-md overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) {
                      input.indeterminate = !isAllSelected && selectedInvoices.length > 0;
                    }
                  }}
                />
              </th>
              <th className="px-6 py-3">Invoice #</th>
              <th className="px-6 py-3">Deal</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">INR Value</th>
              <th className="px-6 py-3">Assigned To</th>
              <th className="px-6 py-3">Due Date</th>
              <th className="px-6 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedInvoices.map((invoice, index) => (
              <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    onChange={() => handleCheckboxChange(invoice._id)}
                    checked={selectedInvoices.includes(invoice._id)}
                  />
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleInvoiceClick(invoice._id)}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                  >
                    {invoice.invoicenumber}
                  </button>
                </td>
                <td className="px-6 py-4">
                  {invoice.items?.[0]?.deal?.dealName || "N/A"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${
                      invoice.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : invoice.status === "send"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {invoice.status}
                  </span>
                </td>
                <td className="px-6 py-4 font-semibold">
                  {invoice.total
                    ? Number(invoice.total).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "-"}{" "}
                  {invoice.currency}
                </td>
                <td className="px-6 py-4">
                  <INRCell invoice={invoice} />
                </td>
                <td className="px-6 py-4">
                  {invoice.assignTo
                    ? `${invoice.assignTo.firstName} ${invoice.assignTo.lastName}`
                    : "N/A"}
                </td>
                <td className="px-6 py-4">
                  {invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "-"}
                </td>
                <td className="px-6 py-4 text-center relative">
                  <button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      const position = spaceBelow > 200 ? "below" : "above";
                      setOpenIndex(openIndex === index ? null : index);
                      setDropdownButton({ rect, position });
                    }}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                  >
                    <FaEllipsisV />
                  </button>

                  {openIndex === index &&
                    ReactDOM.createPortal(
                      <div
                        ref={dropdownRef}
                        className="absolute z-50 bg-white border rounded-md shadow-lg"
                        style={{
                          top:
                            dropdownButton?.position === "below"
                              ? dropdownButton.rect.bottom + window.scrollY
                              : dropdownButton.rect.top +
                                window.scrollY -
                                (dropdownRef.current?.offsetHeight || 150),
                          left: dropdownButton
                            ? dropdownButton.rect.left + window.scrollX
                            : 0,
                          minWidth: "8rem",
                        }}
                      >
                        <button
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => handleSendEmail(invoice._id)}
                        >
                          Send to Email
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => downloadInvoice(invoice._id, invoice.invoicenumber)}
                        >
                          Download
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => handleEdit(invoice)}
                        >
                          Edit
                        </button>
                        <button
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => confirmDelete(invoice)}
                        >
                          Delete
                        </button>
                      </div>,
                      document.body
                    )}
                </td>
              </tr>
            ))}

            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center py-6 text-gray-400">
                  No invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center">
            <span className="text-sm text-gray-700 mr-4">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of{" "}
              {filteredInvoices.length} entries
            </span>

            <div className="flex space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md border text-sm disabled:opacity-50"
              >
                Previous
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 rounded-md border text-sm ${
                      currentPage === pageNum ? "bg-blue-500 text-white" : ""
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md border text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Sending Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Status</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            {emailStatus === "loading" && (
              <p className="text-blue-600 font-medium animate-pulse">{emailMessage}</p>
            )}
            {emailStatus === "success" && (
              <p className="text-green-600 font-semibold">{emailMessage}</p>
            )}
            {emailStatus === "error" && (
              <p className="text-red-600 font-semibold">{emailMessage}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete invoice #{invoiceToDelete?.invoicenumber}?</p>
            <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setDeleteConfirmOpen(false)}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(invoiceToDelete?._id)}
              className="px-4 py-2 bg-red-600 text-white rounded-md text-sm"
            >
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Modal */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete <strong>{selectedInvoices.length}</strong> invoice(s)?
          </p>
          <p className="text-sm text-red-600 mt-2">This action cannot be undone.</p>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkDeleteConfirm}
              disabled={isBulkDeleting}
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
            >
              {isBulkDeleting ? "Deleting..." : "Delete All"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Download PDF Modal */}
      <Dialog open={downloadModalOpen} onOpenChange={setDownloadModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Download Status</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            {downloadStatus === "loading" && (
              <p className="text-blue-600 font-medium animate-pulse">{downloadMessage}</p>
            )}
            {downloadStatus === "success" && (
              <p className="text-green-600 font-semibold">{downloadMessage}</p>
            )}
            {downloadStatus === "error" && (
              <p className="text-red-600 font-semibold">{downloadMessage}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
    </div>
  );
};

export default InvoiceHead;