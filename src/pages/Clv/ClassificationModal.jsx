import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Eye } from "lucide-react";

const ClassificationModal = ({ isOpen, onClose, title, data, type }) => {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!isOpen) return null;

  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  const getTypeColors = () => {
    switch(type) {
      case "Upsell": return { bg: "bg-purple-100", text: "text-purple-600", activeBg: "bg-purple-600" };
      case "Top Value": return { bg: "bg-green-100", text: "text-green-600", activeBg: "bg-green-600" };
      case "At Risk": return { bg: "bg-red-100", text: "text-red-600", activeBg: "bg-red-600" };
      case "Dormant": return { bg: "bg-gray-100", text: "text-gray-600", activeBg: "bg-gray-600" };
      default: return { bg: "bg-blue-100", text: "text-blue-600", activeBg: "bg-blue-600" };
    }
  };

  const colors = getTypeColors();

/* ── Get Status Badge ─────────────────────── */
  const getStatusBadge = (client) => {
    if (type === "Upsell") {
      return <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Ready</span>;
    }
    if (type === "At Risk") {
      return <span className="text-xs text-red-600 font-medium">At Risk</span>;
    }
    if (type === "Dormant") {
      return (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/cltv/client/${encodeURIComponent(client.companyName)}`);
          }}
          className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
        >
          Re-engage
        </button>
      );
    }
    return null;
  };

/* ── Get Client Details ─────────────────────── */
  const getClientDetails = (client) => {
    if (type === "Top Value" || type === "Upsell") {
      return (
        <>
          <p className="text-xs text-gray-500">CLV: ₹{client.clv?.toLocaleString()}</p>
          {client.delivered && <span className="text-xs text-green-600">✓ Delivered</span>}
        </>
      );
    }
    if (type === "At Risk") {
      return (
        <p className="text-xs text-gray-500">
          {client.daysSinceFollowUp || 0} days • {client.supportTickets || 0} tickets
        </p>
      );
    }
    if (type === "Dormant") {
      return (
        <p className="text-xs text-gray-500">
          {client.daysSinceFollowUp || 0} days • {client.supportTickets || 0} tickets
        </p>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              Total {data.length} {type} {data.length === 1 ? 'client' : 'clients'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content - WITH SCROLLBAR for all 5000 deals */}
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 180px)' }}>
          {paginatedData.length > 0 ? (
            <div className="space-y-3">
              {paginatedData.map((client, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/cltv/client/${encodeURIComponent(client.companyName)}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full ${colors.bg} ${colors.text} flex items-center justify-center font-medium flex-shrink-0`}>
                      {client.companyName?.charAt(0) || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-800 truncate">{client.companyName}</p>
                        {type === "Upsell" && (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full whitespace-nowrap">
                            Health: {client.clientHealthScore}
                          </span>
                        )}
                      </div>
                      {getClientDetails(client)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    {getStatusBadge(client)}
                    <Eye size={16} className="text-gray-400 hover:text-gray-600" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No {type} clients found.</p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 p-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, data.length)} of {data.length} clients
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft size={16} />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
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
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm ${
                        currentPage === pageNum
                          ? `${colors.activeBg} text-white`
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassificationModal;