import React, { useState, useEffect } from "react";
import { FaTimes } from "react-icons/fa";

const KpiDetailsSection = ({ activeCard, data, onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCard]);

  if (!activeCard) return null;

  let title = "";
  let description = "";
  let filteredLeads = [];
  let isJunkCard = false;

  switch (activeCard) {
    case "lossRate":
      title = "Lost Leads Detail";
      description = `Showing ${data.kpis.totalLost} lost leads out of ${data.kpis.totalLeads} total leads created during this period.`;
      filteredLeads = data.rawLeads;
      break;
    case "junkLeads":
      title = "Junk Leads Summary";
      description = `You have ${data.kpis.totalJunk} junk leads in this period. Junk leads are disqualified before entering the sales process.`;
      isJunkCard = true;
      break;
    case "topReason":
      title = `Leads Lost Due To: ${data.kpis.highestReason?.reason}`;
      description = `Showing leads that were lost specifically because "${data.kpis.highestReason?.reason}".`;
      filteredLeads = data.rawLeads.filter(l => (l.rejectionReason || l.junkReason || "Unspecified Reason") === data.kpis.highestReason?.reason);
      break;
    case "topStage":
      title = `Leads Lost at Stage: ${data.kpis.highestLossStage?.stage}`;
      description = `Showing leads that were lost during the ${data.kpis.highestLossStage?.stage} stage.`;
      filteredLeads = data.rawLeads.filter(l => (l.lossStage || "Unknown") === data.kpis.highestLossStage?.stage);
      break;
    default:
      return null;
  }

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const currentLeads = filteredLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="bg-white/60 backdrop-blur-lg p-6 md:p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-white mb-8 animate-fade-in-up">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <p className="text-slate-500 mt-1">{description}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-rose-500 transition-colors p-2 rounded-full hover:bg-rose-50"
          title="Close Details"
        >
          <FaTimes size={18} />
        </button>
      </div>

      {!isJunkCard ? (
        filteredLeads.length === 0 ? (
          <p className="text-slate-500 italic">No leads found for this category.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto w-full rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left bg-white min-w-[800px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold text-slate-700">Lead Name</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Company</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Stage</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Reason</th>
                    <th className="py-3 px-4 font-semibold text-slate-700">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeads.map(lead => (
                    <tr key={lead._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-800 font-medium">{lead.leadName}</td>
                      <td className="py-3 px-4 text-slate-600">{lead.companyName || "-"}</td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          lead.lossStage === 'Hot' ? 'bg-red-100 text-red-700' : 
                          lead.lossStage === 'Warm' ? 'bg-orange-100 text-orange-700' : 
                          lead.lossStage === 'Cold' ? 'bg-blue-100 text-blue-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.lossStage || "Unknown"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-rose-600 font-medium">{lead.rejectionReason || lead.junkReason || "Unknown"}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {lead.assignTo ? `${lead.assignTo.firstName} ${lead.assignTo.lastName}` : "Unassigned"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex flex-col xl:flex-row justify-between items-center mt-4 gap-6 xl:gap-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 text-center">
                <span className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredLeads.length)} of {filteredLeads.length} leads
                </span>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-200 rounded px-2 py-1 text-sm text-slate-600 outline-none"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({length: totalPages}, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded text-sm ${currentPage === page ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {page}
                  </button>
                ))}
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-center text-slate-600">
          <p>Detailed view of individual junk leads is currently not available in this view.</p>
        </div>
      )}
    </div>
  );
};

export default KpiDetailsSection;
