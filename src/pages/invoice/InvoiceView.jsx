import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  ChevronRight,
  Calendar,
  FileText,
  Clock,
  User,
  Building,
  Mail,
  Percent,
  IndianRupee,
  Receipt,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-toastify";

const InvoiceView = () => {
  const API_URL = import.meta.env.VITE_API_URL;
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(true);

  // Fetch invoice details
  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/invoices/getSingle/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInvoice(res.data);
      } catch (err) {
        console.error("Error fetching invoice:", err);
        toast.error("Failed to fetch invoice details");
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id, API_URL]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600">
        Loading invoice details...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        Invoice not found.
      </div>
    );
  }

  // Total never changes — amountPaid is the cumulative figure tracked separately
  const isPaidFamily = ["paid", "partially_paid"].includes(invoice.status);
  const amountPaid = isPaidFamily ? Number(invoice.amountPaid) || 0 : 0;
  const balanceDue = Math.max((Number(invoice.total) || 0) - amountPaid, 0);

/* ── Get Status Classes Function ─────────────────────── */
  const getStatusClasses = (status) => {
    switch (status?.toLowerCase()) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "unpaid":
        return "bg-red-100 text-red-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center text-slate-600 mb-3">
              <Link
                to="/invoices"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ArrowLeft size={16} className="mr-1" />
                All Invoices
              </Link>
              <ChevronRight size={16} className="mx-2" />
              <span className="text-slate-500">View Invoice</span>
            </div>
            <div className="flex items-center gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                Invoice #{invoice.invoicenumber || id}
              </h1>
              <span
                className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusClasses(
                  invoice.status
                )}`}
              >
                {invoice.status || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mb-6">
          {["details", "activity"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Invoice Details
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Full breakdown of this invoice
                  </p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Info */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">
                      Client Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center text-slate-700">
                        <User size={18} className="mr-3 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium">Client Name</p>
                          <p className="text-slate-900">
                            {invoice.items?.[0]?.deal?.dealName || "No deal"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <Building size={18} className="mr-3 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium">Company</p>
                          <p className="text-slate-900">
                            {invoice.items?.[0]?.deal?.companyName || "No deal"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Invoice Info */}
                  <div className="space-y-5">
                    <h3 className="text-sm font-medium text-slate-700 mb-3 uppercase tracking-wide">
                      Invoice Information
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center text-slate-700">
                        <Receipt size={18} className="mr-3 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium">Subtotal</p>
                          <p className="text-slate-900">
                            {invoice.currency} {invoice.subtotal || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <Percent size={18} className="mr-3 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium">Tax</p>
                          <p className="text-slate-900">
                            {invoice.currency} {invoice.tax || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <IndianRupee
                          size={18}
                          className="mr-3 text-slate-500"
                        />
                        <div>
                          <p className="text-sm font-medium">Discount</p>
                          <p className="text-slate-900">
                            {invoice.currency} {invoice.discount || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <FileText size={18} className="mr-3 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium">Total</p>
                          <p className="text-slate-900 font-semibold">
                            {invoice.currency} {invoice.total}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <CheckCircle size={18} className="mr-3 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Amount Paid</p>
                          <p className="text-green-700 font-semibold">
                            {invoice.currency} {amountPaid.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <AlertCircle size={18} className="mr-3 text-red-500" />
                        <div>
                          <p className="text-sm font-medium">Balance Due</p>
                          <p className="text-red-700 font-semibold">
                            {invoice.currency} {balanceDue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center text-slate-700">
                        <Calendar size={18} className="mr-3 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium">Issue Date</p>
                          <p className="text-slate-900">
                            {invoice.issueDate
                              ? new Date(
                                  invoice.issueDate
                                ).toLocaleDateString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                      {invoice.dueDate && (
                        <div className="flex items-center text-slate-700">
                          <Clock size={18} className="mr-3 text-slate-500" />
                          <div>
                            <p className="text-sm font-medium">Due Date</p>
                            <p className="text-slate-900">
                              {new Date(invoice.dueDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Activity Timeline
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Updates and changes for this invoice
                  </p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Invoice created */}
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FileText size={16} className="text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-sm font-medium text-slate-900">
                        Invoice created
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {invoice.createdAt
                          ? new Date(invoice.createdAt).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Invoice updated */}
                  {invoice.updatedAt && (
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Clock size={16} className="text-emerald-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-slate-900">
                          Invoice updated
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(invoice.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Email sent */}
                  {invoice.emailSentAt && (
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Mail size={16} className="text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-slate-900">
                          Invoice email sent
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {new Date(invoice.emailSentAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h3 className="text-sm font-medium text-slate-700 mb-4 uppercase tracking-wide">
                Assigned To
              </h3>
              {invoice.assignTo ? (
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mr-3">
                    <User size={20} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {invoice.assignTo.firstName} {invoice.assignTo.lastName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {invoice.assignTo.email}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Not assigned</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceView;
