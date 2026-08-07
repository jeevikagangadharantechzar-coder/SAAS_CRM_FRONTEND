import React, { useState } from "react";

const LostLeadsTables = ({ data, selectedAssignee, setModalAssignee }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const filteredTableLeads = selectedAssignee ? data.rawLeads.filter(l => l.assignTo?._id === selectedAssignee) : data.rawLeads;
  const totalPages = Math.ceil(filteredTableLeads.length / itemsPerPage);
  const currentLeads = filteredTableLeads.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {/* Action Required: Hot Leads Lost */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Action Required: Hot Leads Lost</h2>
        {data.hotLeadsActionRequired.length === 0 ? (
          <p className="text-gray-500">No hot leads lost in this period. Great job!</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 font-semibold text-gray-600">Lead Name</th>
                  <th className="py-3 font-semibold text-gray-600">Phone</th>
                  <th className="py-3 font-semibold text-gray-600">Company</th>
                  <th className="py-3 font-semibold text-gray-600">Reason</th>
                  <th className="py-3 font-semibold text-gray-600">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {data.hotLeadsActionRequired.map(lead => (
                  <tr key={lead._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 text-gray-800 font-medium">{lead.leadName}</td>
                    <td className="py-3 text-gray-600">{lead.phoneNumber || "-"}</td>
                    <td className="py-3 text-gray-600">{lead.companyName}</td>
                    <td className="py-3 text-red-600">{lead.rejectionReason || lead.junkReason || "Unspecified Reason"}</td>
                    <td className="py-3 text-gray-600">{lead.assignTo?.firstName} {lead.assignTo?.lastName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Raw Lost Leads Table */}
      <div className="bg-white/60 backdrop-blur-lg p-8 rounded-3xl shadow-2xl shadow-slate-200/50 border border-white mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-2xl font-bold text-slate-800">Lost Leads Details</h2>
        </div>
        {filteredTableLeads.length === 0 ? (
          <p className="text-slate-500">No lost leads in this period.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="overflow-x-auto w-full rounded-xl border border-slate-200">
              <table className="w-full text-left bg-white min-w-[1000px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="py-4 px-6 font-semibold text-slate-700">Lead Name</th>
                    <th className="py-4 px-6 font-semibold text-slate-700">Company</th>
                    <th className="py-4 px-6 font-semibold text-slate-700">Loss Stage</th>
                    <th className="py-4 px-6 font-semibold text-slate-700">Reason</th>
                    <th className="py-4 px-6 font-semibold text-slate-700">Lead Age (Days)</th>
                    <th className="py-4 px-6 font-semibold text-slate-700">Follow-ups</th>
                    <th className="py-4 px-6 font-semibold text-slate-700">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {currentLeads.map(lead => (
                    <tr key={lead._id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 text-slate-800 font-medium">{lead.leadName}</td>
                      <td className="py-4 px-6 text-slate-600">{lead.companyName || "-"}</td>
                      <td className="py-4 px-6 text-slate-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          lead.lossStage === 'Hot' ? 'bg-red-100 text-red-700' : 
                          lead.lossStage === 'Warm' ? 'bg-orange-100 text-orange-700' : 
                          lead.lossStage === 'Cold' ? 'bg-blue-100 text-blue-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {lead.lossStage || "Unknown"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sky-600 font-medium">{lead.rejectionReason || lead.junkReason || "Unknown"}</td>
                      <td className="py-4 px-6 text-slate-600">{lead.leadAgeAtLossDays || 0}</td>
                      <td className="py-4 px-6 text-slate-600">{lead.followUpCountAtLoss || 0}</td>
                      <td className="py-4 px-6">
                        {lead.assignTo ? (
                          <button 
                            onClick={() => setModalAssignee(lead.assignTo)}
                            className="text-indigo-600 hover:text-indigo-800 font-semibold underline decoration-indigo-200 underline-offset-4 hover:decoration-indigo-500 transition-all"
                          >
                            {lead.assignTo.firstName} {lead.assignTo.lastName}
                          </button>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredTableLeads.length)} of {filteredTableLeads.length} leads
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
              
              <div className="flex items-center gap-2">
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
        )}
      </div>
    </>
  );
};

export default LostLeadsTables;
