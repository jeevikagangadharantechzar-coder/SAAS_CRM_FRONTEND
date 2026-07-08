import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { useModal } from "../../context/ModalContext";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const InvoiceModal = ({ onInvoiceSaved, editingInvoice }) => {
  const API_URL = import.meta.env.VITE_API_URL;
  const { isOpen, closeModal } = useModal();

  const [salesUsers, setSalesUsers] = useState([]);
  const [deals, setDeals] = useState([]);
  const [selectedDealRequirement, setSelectedDealRequirement] = useState(null);
  const [invoiceData, setInvoiceData] = useState({
    assignTo: "",
    issueDate: "",
    dueDate: "",
    status: "unpaid",
    deal: "",
    price: 0,
    tax: "0",
    taxType: "none",
    discountType: "none",
    discountValue: 0,
    note: "",
    currency: "INR",
    billingAddress: "",
    clientTaxId: "",
    poNumber: "",
  });
  // Ad-hoc fields the admin adds for invoices that need something the fixed form doesn't cover
  const [customFields, setCustomFields] = useState([]);
  // Amount typed in "Amount Received Now" — only used for paid/partially_paid statuses
  const [paymentReceivedNow, setPaymentReceivedNow] = useState("");
  const [note, setNote] = useState("");
  const [isNoteVisible, setIsNoteVisible] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [issueDateObj, setIssueDateObj] = useState(null);
  const [dueDateObj, setDueDateObj] = useState(null);
  const issueDateRef = useRef(null);
  const dueDateRef = useRef(null);

  const toMMDDYYYY = (isoOrDate) => {
    if (!isoOrDate) return { formatted: "", obj: null };
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return { formatted: `${mm}/${dd}/${d.getFullYear()}`, obj: d };
  };

  // Load editing invoice if any
  useEffect(() => {
    if (editingInvoice) {
      const issue = toMMDDYYYY(editingInvoice.issueDate);
      const due = toMMDDYYYY(editingInvoice.dueDate);
      setInvoiceData({
        assignTo: editingInvoice.assignTo?._id || "",
        issueDate: issue.formatted,
        dueDate: due.formatted,
        status: editingInvoice.status || "unpaid",
        deal: editingInvoice.items?.[0]?.deal?._id || "",
        price: editingInvoice.items?.[0]?.price || 0,
        tax: editingInvoice.tax?.toString() || "0",
        taxType: editingInvoice.taxType || "none",
        discountType: editingInvoice.discountType || "none",
        discountValue: editingInvoice.discountValue || 0,
        note: editingInvoice.note || "",
        currency: editingInvoice.currency || "INR",
        billingAddress: editingInvoice.billingAddress || "",
        clientTaxId: editingInvoice.clientTaxId || "",
        poNumber: editingInvoice.poNumber || "",
      });
      setIssueDateObj(issue.obj);
      setDueDateObj(due.obj);
      setNote(editingInvoice.note || "");
      setIsNoteVisible(!!editingInvoice.note);
      setPaymentReceivedNow("");
      setCustomFields(
        (editingInvoice.customFields || []).map((f) => ({ ...f }))
      );

      const selectedDeal = deals.find(
        (d) => d._id === editingInvoice.items?.[0]?.deal?._id
      );
      setSelectedDealRequirement(selectedDeal || null);
    } else {
      setInvoiceData({
        assignTo: "",
        issueDate: "",
        dueDate: "",
        status: "unpaid",
        deal: "",
        price: 0,
        tax: "0",
        taxType: "none",
        discountType: "none",
        discountValue: 0,
        note: "",
        currency: "INR",
        billingAddress: "",
        clientTaxId: "",
        poNumber: "",
      });
      setIssueDateObj(null);
      setDueDateObj(null);
      setNote("");
      setIsNoteVisible(false);
      setSelectedDealRequirement(null);
      setPaymentReceivedNow("");
      setCustomFields([]);
    }
    setValidationErrors({});
  }, [editingInvoice, isOpen, deals]);

  // Fetch sales users
  useEffect(() => {
    const fetchSalesUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        // console.log(token);

        const response = await axios.get(`${API_URL}/users/sales`, {
  headers: { Authorization: `Bearer ${token}` },
});
setSalesUsers(response.data.users);

        setSalesUsers(filteredSales);
      } catch {
       // toast.error("Failed to fetch sales users");
      }
    };
    fetchSalesUsers();
  }, []);

  // Fetch deals
  useEffect(() => {
    const fetchDeals = async () => {
      const token = localStorage.getItem("token");
      try {
        const response = await axios.get(`${API_URL}/deals/getAll`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data) setDeals(response.data);
      } catch {
        toast.error("Failed to fetch deals");
      }
    };
    fetchDeals();
  }, []);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setInvoiceData((prev) => ({ ...prev, [name]: value }));

    if (name === "deal") {
      const selectedDeal = deals.find((d) => d._id === value);
      setSelectedDealRequirement(selectedDeal || null);

      if (selectedDeal?.value) {
        const numericValue = Number(selectedDeal.value.replace(/[^0-9.]/g, ""));
        const currency = selectedDeal.value.replace(/[\d.,\s]/g, "").trim();
        setInvoiceData((prev) => ({
          ...prev,
          price: numericValue,
          currency: currency || "INR",
        }));
      }
      if (selectedDeal?.address) {
        setInvoiceData((prev) => ({ ...prev, billingAddress: selectedDeal.address }));
      }
    }
  };

  // Custom fields
  const handleAddCustomField = () => {
    setCustomFields((prev) => [...prev, { label: "", type: "text", value: "" }]);
  };
  const handleCustomFieldChange = (index, key, value) => {
    setCustomFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, [key]: value } : f))
    );
  };
  const handleRemoveCustomField = (index) => {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIssueDateChange = (date) => {
    setIssueDateObj(date);
    if (date) {
      const { formatted } = toMMDDYYYY(date);
      setInvoiceData((prev) => ({ ...prev, issueDate: formatted }));
      setValidationErrors((prev) => ({ ...prev, issueDate: "" }));
      // Re-validate due date if it's now before the new issue date
      if (dueDateObj) {
        if (dueDateObj < date) {
          setValidationErrors((prev) => ({
            ...prev,
            dueDate: "Due date must be on or after the issue date.",
          }));
        } else if (validationErrors.dueDate) {
          setValidationErrors((prev) => ({ ...prev, dueDate: "" }));
        }
      }
    } else {
      setInvoiceData((prev) => ({ ...prev, issueDate: "" }));
      setValidationErrors((prev) => ({ ...prev, issueDate: "Issue Date is required." }));
    }
  };

  const handleDueDateChange = (date) => {
    setDueDateObj(date);
    if (date) {
      const { formatted } = toMMDDYYYY(date);
      setInvoiceData((prev) => ({ ...prev, dueDate: formatted }));
      if (validationErrors.dueDate) {
        const err =
          issueDateObj && date < issueDateObj
            ? "Due date must be on or after the issue date."
            : "";
        setValidationErrors((prev) => ({ ...prev, dueDate: err }));
      }
    } else {
      setInvoiceData((prev) => ({ ...prev, dueDate: "" }));
      if (validationErrors.dueDate) {
        setValidationErrors((prev) => ({ ...prev, dueDate: "Due Date is required." }));
      }
    }
  };

  // Notes
  const handleAddNoteClick = () => setIsNoteVisible(true);
  const handleNoteChange = (e) => {
    setNote(e.target.value);
    setInvoiceData((prev) => ({ ...prev, note: e.target.value }));
  };
  const handleRemoveNoteClick = () => {
    setIsNoteVisible(false);
    setNote("");
    setInvoiceData((prev) => ({ ...prev, note: "" }));
  };

  // Validation
  const validateInputs = () => {
    const errors = {};
    const { assignTo, issueDate, dueDate, deal, price, status } = invoiceData;

    if (!assignTo) errors.assignTo = "Sales user is required.";
    if (!issueDate) errors.issueDate = "Issue Date is required.";
    if (!dueDate) errors.dueDate = "Due Date is required.";
    if (!deal) errors.deal = "Deal is required.";
    if (price <= 0) errors.price = "Price must be greater than 0.";

    if (issueDateObj && dueDateObj && dueDateObj < issueDateObj) {
      errors.dueDate = "Due date must be on or after the issue date.";
    }

    if (customFields.some((f) => !f.label.trim())) {
      errors.customFields = "Every custom field needs a name.";
    }

    // Paid and Partially Paid both require an entered amount — unless the invoice was
    // already saved as Paid, in which case status/payment are locked and nothing new is collected
    const statusLocked = editingInvoice?.status === "paid";
    const requiresPaymentEntry = !statusLocked && ["paid", "partially_paid"].includes(status);
    const entered = Number(paymentReceivedNow) || 0;

    if (requiresPaymentEntry && !(entered > 0)) {
      errors.paymentReceivedNow = "Amount received is required.";
    } else if (!statusLocked && (status === "paid" || status === "partially_paid")) {
      const total = Number(calculateTotalBreakdown().total);
      const remaining = Math.max(total - previousAmountPaid, 0);
      const EPS = 0.01;

      if (entered - remaining > EPS) {
        errors.paymentReceivedNow = `Payment exceeds the remaining balance. Maximum allowed: ${remaining.toFixed(2)}.`;
      } else if (status === "paid" && remaining - entered > EPS) {
        errors.paymentReceivedNow = `To mark as Paid, the full remaining amount (${remaining.toFixed(2)}) must be entered.`;
      } else if (status === "partially_paid" && remaining - entered <= EPS) {
        errors.paymentReceivedNow = `This covers the full remaining amount. Please select "Paid" instead.`;
      }
    }

    setValidationErrors(errors);

    if (errors.issueDate) {
      setTimeout(() => issueDateRef.current?.setFocus(), 50);
    } else if (errors.dueDate) {
      setTimeout(() => dueDateRef.current?.setFocus(), 50);
    }

    return Object.keys(errors).length === 0;
  };

  // Calculations
  const calculateAmount = () => {
    return (Number(invoiceData.price) || 0).toFixed(2);
  };

/* ── Calculate Total Breakdown Function ─────────────────────── */
  const calculateTotalBreakdown = () => {
    const price = Number(invoiceData.price) || 0;

    // Discount
    let discountAmount = 0;
    if (invoiceData.discountType && invoiceData.discountType !== "none") {
      const discountVal = Number(invoiceData.discountValue) || 0;
      if (invoiceData.discountType === "fixed") discountAmount = discountVal;
      else if (invoiceData.discountType === "percentage")
        discountAmount = (price * discountVal) / 100;
    }
    const priceAfterDiscount = price - discountAmount;

    // Tax (only if INR)
    let taxAmount = 0;
    if (invoiceData.currency === "INR" && invoiceData.taxType !== "none") {
      const taxVal = Number(invoiceData.tax) || 0;
      if (invoiceData.taxType === "fixed") taxAmount = taxVal;
      else if (invoiceData.taxType === "percentage")
        taxAmount = (priceAfterDiscount * taxVal) / 100;
    }

    const total = priceAfterDiscount + taxAmount;

    return {
      price: price.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      subtotalAfterDiscount: priceAfterDiscount.toFixed(2),
      discountText:
        invoiceData.discountType === "percentage"
          ? `${invoiceData.discountValue}% of ${price.toFixed(2)}`
          : discountAmount.toFixed(2),
      taxText:
        invoiceData.taxType === "percentage"
          ? `${invoiceData.tax}% of ${priceAfterDiscount.toFixed(2)}`
          : taxAmount.toFixed(2),
    };
  };

  // Save
  const handleSaveInvoice = async () => {
    if (!validateInputs()) {
      toast.error("Please correct the errors in the form.");
      return;
    }

    const breakdown = calculateTotalBreakdown();

    const toISO = (mmddyyyy) => {
      if (!mmddyyyy) return "";
      const [mm, dd, yyyy] = mmddyyyy.split("/");
      return `${yyyy}-${mm}-${dd}`;
    };

    const invoiceToSave = {
      ...invoiceData,
      issueDate: toISO(invoiceData.issueDate),
      dueDate: toISO(invoiceData.dueDate),
      items: [
        {
          deal: invoiceData.deal,
          price: Number(invoiceData.price),
          amount: Number(invoiceData.price),
        },
      ],
      discountValue: Number(invoiceData.discountValue),
      discountType:
        invoiceData.discountType === "none"
          ? "fixed"
          : invoiceData.discountType,
      tax: Number(invoiceData.tax),
      taxType: invoiceData.taxType === "none" ? "fixed" : invoiceData.taxType,
      total: Number(breakdown.total),
      customFields: customFields.filter((f) => f.label.trim()),
    };

    // Paid and Partially Paid both track the CUMULATIVE amount actually collected so far
    // (previous + this payment), and freeze the preferred-currency conversion against
    // that real amount — not the total. Skipped once already saved as Paid, since status
    // and payment are locked and there's nothing new to collect.
    if (isPaidFamily && editingInvoice?.status !== "paid") {
      const total = Number(breakdown.total);
      const payment = Number(paymentReceivedNow) || 0;
      const maxAllowed = Math.max(total - previousAmountPaid, 0);

      if (payment > maxAllowed) {
        toast.error(`Payment exceeds invoice total. Maximum you can enter now: ${maxAllowed.toFixed(2)}`);
        return;
      }

      const newAmountPaid = previousAmountPaid + payment;
      invoiceToSave.paymentReceivedNow = payment;

      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      const userCurrency = storedUser?.currency || "USD";
      try {
        let preferredValue;
        if (invoiceData.currency === userCurrency) {
          preferredValue = newAmountPaid;
        } else {
          const rateRes = await axios.get(
            `https://open.er-api.com/v6/latest/${invoiceData.currency}`
          );
          const rate = rateRes.data?.rates?.[userCurrency];
          preferredValue = rate ? parseFloat((newAmountPaid * rate).toFixed(2)) : null;
        }
        invoiceToSave.preferredCurrency = userCurrency;
        invoiceToSave.preferredCurrencyValue = preferredValue;
      } catch {
        // proceed without frozen rate — backend will leave it null
      }
    }

    try {
      const token = localStorage.getItem("token");
      let response;
      if (editingInvoice) {
        response = await axios.put(
          `${API_URL}/invoices/updateInvoice/${editingInvoice._id}`,
          invoiceToSave,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Invoice updated successfully!");
      //  Move Deal to Closed Won if status changed to paid
      if (
        editingInvoice.status !== "paid" &&
        invoiceData.status === "paid"
      ) {
        const dealId = editingInvoice.items?.[0]?.deal?._id;

        if (dealId) {
          await axios.patch(
            `${API_URL}/deals/update-deal/${dealId}`,
            { stage: "Closed Won" },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }
  
      } else {
        response = await axios.post(
          `${API_URL}/invoices/createinvoice`,
          invoiceToSave,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Invoice created successfully!");
      }

      if (response.status === 200 || response.status === 201) {
        closeModal();
        if (onInvoiceSaved) onInvoiceSaved();
      } else {
        toast.error("Failed to save invoice.");
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save invoice.");
    }
  };

  const PAID_FAMILY = ["paid", "partially_paid"];
  const isPaidFamily = PAID_FAMILY.includes(invoiceData.status);
  // Amount already collected before this save — carries over between paid/partially_paid
  const previousAmountPaid =
    editingInvoice && PAID_FAMILY.includes(editingInvoice.status)
      ? Number(editingInvoice.amountPaid) || 0
      : 0;

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="w-[95vw] md:w-full md:min-w-[800px] lg:min-w-[1000px] max-w-4xl p-0 overflow-hidden rounded-lg shadow-xl">
        <DialogHeader className="bg-gray-50  text-black p-6">
          <DialogTitle className="text-xl font-semibold">
            {editingInvoice ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 max-h-[80vh] overflow-y-auto ">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
            {/* Left Column */}
            <div>
              <div className="h-full bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    ></path>
                  </svg>
                  Basic Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assign To (Sales User) *
                    </label>
                    <select
                      name="assignTo"
                      value={invoiceData.assignTo}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.assignTo
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                      disabled={
                        editingInvoice &&
                        localStorage.getItem("role")?.toLowerCase() === "sales"
                      }
                    >
                      <option value="">Select Sales User</option>
                      {salesUsers.map((user) => (
                        <option key={user._id} value={user._id}>
                          {user.firstName} {user.lastName}
                        </option>
                      ))}
                    </select>

                    {validationErrors.assignTo && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.assignTo}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Issue Date *
                      </label>
                      <DatePicker
                        ref={issueDateRef}
                        selected={issueDateObj}
                        onChange={handleIssueDateChange}
                        minDate={new Date()}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="mm/dd/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        isClearable
                        wrapperClassName="w-full"
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                          validationErrors.issueDate
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {validationErrors.issueDate && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.issueDate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date *
                      </label>
                      <DatePicker
                        ref={dueDateRef}
                        selected={dueDateObj}
                        onChange={handleDueDateChange}
                        minDate={issueDateObj || new Date()}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="mm/dd/yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        isClearable
                        wrapperClassName="w-full"
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                          validationErrors.dueDate
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {validationErrors.dueDate && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.dueDate}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={invoiceData.status}
                      onChange={handleChange}
                      disabled={editingInvoice?.status === "paid"}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="unpaid">Unpaid</option>
                      <option value="paid">Paid</option>
                      <option value="partially_paid">Partially Paid</option>
                    </select>
                    {editingInvoice?.status === "paid" && (
                      <p className="mt-1 text-xs text-gray-500">
                        This invoice is marked Paid and its status can no longer be changed.
                      </p>
                    )}
                  </div>

                  {isPaidFamily && editingInvoice?.status !== "paid" && (() => {
                    const total = Number(calculateTotalBreakdown().total);
                    const maxAllowed = Math.max(total - previousAmountPaid, 0);
                    const entered = Number(paymentReceivedNow) || 0;
                    const exceeds = entered > maxAllowed;

                    return (
                      <div>
                        {previousAmountPaid > 0 && (
                          <p className="text-sm text-gray-600 mb-1">
                            Already Received:{" "}
                            <span className="font-semibold text-green-700">
                              {invoiceData.currency} {previousAmountPaid.toFixed(2)}
                            </span>
                          </p>
                        )}
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Amount Received Now *
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={paymentReceivedNow}
                          onChange={(e) => setPaymentReceivedNow(e.target.value)}
                          placeholder={`Max ${maxAllowed.toFixed(2)}`}
                          className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                            exceeds || validationErrors.paymentReceivedNow ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {exceeds && (
                          <p className="mt-1 text-sm text-red-600">
                            Payment exceeds invoice total. Maximum you can enter now: {maxAllowed.toFixed(2)}
                          </p>
                        )}
                        {!exceeds && validationErrors.paymentReceivedNow && (
                          <p className="mt-1 text-sm text-red-600">
                            {validationErrors.paymentReceivedNow}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <div className="h-full bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    ></path>
                  </svg>
                  Deal Information
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Deal *
                    </label>
                    <select
                      name="deal"
                      value={invoiceData.deal}
                      onChange={handleChange}
                      className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        validationErrors.deal
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    >
                      <option value="">Select a Deal</option>
                      {deals.filter((deal) => deal.stage !== "Closed Won").map((deal) => (
                        <option key={deal._id} value={deal._id}>
                          {deal.dealName}
                        </option>
                      ))}
                    </select>
                    {validationErrors.deal && (
                      <p className="mt-1 text-sm text-red-600">
                        {validationErrors.deal}
                      </p>
                    )}
                  </div>

                  {selectedDealRequirement && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                        <svg
                          className="w-4 h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          ></path>
                        </svg>
                        Deal Information:
                      </p>
                      <div className="bg-white p-3 rounded-md border border-blue-100 space-y-2">
                        <p className="text-sm text-blue-700">
                          <span className="font-semibold">Requirement:</span>{" "}
                          {selectedDealRequirement.requirement}
                        </p>
                        <p className="text-sm text-green-700">
                          <span className="font-semibold">Value:</span> {" "}
                          {selectedDealRequirement.value}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Price *
                      </label>
                      <input
                        type="number"
                        name="price"
                        min="0"
                        step="0.01"
                        value={invoiceData.price}
                        onChange={handleChange}
                        className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                          validationErrors.price
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {validationErrors.price && (
                        <p className="mt-1 text-sm text-red-600">
                          {validationErrors.price}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <div className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg font-medium">
                        {invoiceData.currency}: {calculateAmount()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Billing Details — varies by country/client, so kept optional. Full-width,
              like Financial Details below, rather than squeezed into one column —
              it doesn't pair evenly in height with either Basic Information or
              Deal Information. */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                ></path>
              </svg>
              Billing Details
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Address
                </label>
                <textarea
                  name="billingAddress"
                  rows="4"
                  value={invoiceData.billingAddress}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none min-h-[100px]"
                  placeholder="Defaults to the deal's address"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Tax ID
                  </label>
                  <input
                    type="text"
                    name="clientTaxId"
                    value={invoiceData.clientTaxId}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    placeholder="e.g. GSTIN, VAT No."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PO Number
                  </label>
                  <input
                    type="text"
                    name="poNumber"
                    value={invoiceData.poNumber}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
              <svg
                className="w-5 h-5 mr-2 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                ></path>
              </svg>
              Financial Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {invoiceData.currency === "INR" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tax Type
                    </label>
                    <select
                      name="taxType"
                      value={invoiceData.taxType || "none"}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="none">Zero Tax</option>
                      <option value="fixed">Fixed Amount</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>

                  {invoiceData.taxType === "fixed" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Amount
                      </label>
                      <input
                        type="number"
                        name="tax"
                        min="0"
                        step="0.01"
                        value={invoiceData.tax}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Enter fixed tax amount"
                      />
                    </div>
                  )}

                  {invoiceData.taxType === "percentage" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Percentage
                      </label>
                      <input
                        type="number"
                        name="tax"
                        min="0"
                        max="100"
                        step="0.01"
                        value={invoiceData.tax}
                        onChange={handleChange}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                        placeholder="Enter tax %"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type
                </label>
                <select
                  name="discountType"
                  value={invoiceData.discountType}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="none">No Discount</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>

              {invoiceData.discountType !== "none" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    name="discountValue"
                    min="0"
                    step="0.01"
                    value={invoiceData.discountValue}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="text-lg font-semibold text-gray-800 shrink-0">
                Total Amount:
              </span>
              {(() => {
                const breakdown = calculateTotalBreakdown();
                return (
                  <div className="space-y-1 w-full sm:w-auto sm:min-w-[260px]">
                    <div className="flex justify-between gap-4 text-gray-700 text-sm">
                      <span className="shrink-0">Price:</span>
                      <span className="font-medium text-right break-all">{invoiceData.currency} {breakdown.price}</span>
                    </div>

                    {invoiceData.currency === "INR" &&
                      invoiceData.taxType !== "none" && (
                        <div className="flex justify-between gap-4 text-gray-700 text-sm">
                          <span className="shrink-0">Tax:</span>
                          <span className="font-medium text-right break-all">
                            {breakdown.taxText} = {invoiceData.currency} {breakdown.taxAmount}
                          </span>
                        </div>
                      )}

                    {invoiceData.discountType !== "none" && (
                      <div className="flex justify-between gap-4 text-gray-700 text-sm">
                        <span className="shrink-0">Discount:</span>
                        <span className="font-medium text-right break-all">
                          {breakdown.discountText} = {invoiceData.currency} {" "}
                          {breakdown.discountAmount}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between gap-4 font-bold text-blue-600 text-base border-t border-gray-100 pt-1 mt-1">
                      <span className="shrink-0">Total:</span>
                      <span className="text-right break-all">{invoiceData.currency} {breakdown.total}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Custom Fields — for anything the fixed form doesn't cover (varies by country/client) */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">Custom Fields</h3>
              <button
                type="button"
                onClick={handleAddCustomField}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                Add Field
              </button>
            </div>

            {customFields.length === 0 ? (
              <p className="text-sm text-gray-400">No custom fields added.</p>
            ) : (
              <div className="space-y-3">
                {customFields.map((field, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 border-b sm:border-b-0 pb-3 sm:pb-0">
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => handleCustomFieldChange(index, "label", e.target.value)}
                      placeholder="Field name"
                      className="w-full sm:w-1/3 p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => handleCustomFieldChange(index, "type", e.target.value)}
                      className="w-full sm:w-28 p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                    <input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      value={field.value}
                      onChange={(e) => handleCustomFieldChange(index, "value", e.target.value)}
                      placeholder="Value"
                      className="w-full sm:flex-1 p-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(index)}
                      className="p-2.5 text-red-500 hover:text-red-700 transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            {validationErrors.customFields && (
              <p className="mt-2 text-sm text-red-600">{validationErrors.customFields}</p>
            )}
          </div>

          {/* Notes */}
          <div className="mb-6">
            {!isNoteVisible ? (
              <button
                className="flex items-center text-blue-600 hover:text-blue-800 transition"
                onClick={handleAddNoteClick}
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  ></path>
                </svg>
                Add Note
              </button>
            ) : (
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      ></path>
                    </svg>
                    Notes
                  </label>
                  <button
                    className="text-red-500 hover:text-red-700 text-sm flex items-center transition"
                    onClick={handleRemoveNoteClick}
                  >
                    <svg
                      className="w-4 h-4 mr-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      ></path>
                    </svg>
                    Remove
                  </button>
                </div>
                <textarea
                  rows="3"
                  value={note}
                  onChange={handleNoteChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="Add additional notes..."
                ></textarea>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
            <button
              className="px-5 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition w-full sm:w-auto"
              type="button"
              onClick={closeModal}
            >
              Cancel
            </button>
            <button
              className="px-5 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition flex items-center justify-center w-full sm:w-auto"
              type="button"
              onClick={handleSaveInvoice}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              {editingInvoice ? "Update Invoice" : "Create Invoice"}
            </button>
          </div>
        </div>

        <ToastContainer />
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceModal; 
