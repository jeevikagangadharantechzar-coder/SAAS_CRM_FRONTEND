import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ChevronLeft, ChevronRight, Search, Briefcase, ArrowLeft } from 'lucide-react';
import { useSelector } from 'react-redux';
import DocumentTable from './DocumentTable';


const DealsDocument = ({ searchTerm = "", assignments = [], recycleAssignments = [], onQuickAssign }) => {
  const { user } = useSelector(state => state.auth);
  const isAdmin = user?.role?.name === 'Admin';
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDeals, setTotalDeals] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  
  const [selectedDeal, setSelectedDeal] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, itemsPerPage]);

  useEffect(() => {
    let active = true;
    const fetchDeals = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams({ page: currentPage, limit: itemsPerPage, hasAttachments: true });
        if (debouncedSearch.trim()) params.append("search", debouncedSearch.trim());

        const { data } = await api.get(`/deals/getAll?${params.toString()}`);
        if (!active) return;

        const isNew = data && !Array.isArray(data) && Array.isArray(data.deals);
        const dealsArr = isNew ? data.deals : (Array.isArray(data) ? data : []);
        setDeals(dealsArr);
        setTotalDeals(isNew ? data.totalDeals : dealsArr.length);
        setTotalPages(isNew ? data.totalPages : Math.ceil(dealsArr.length / itemsPerPage) || 1);
      } catch (err) {
        console.error("Failed to fetch deals", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    if (!selectedDeal) {
      fetchDeals();
    }
    return () => { active = false; };
  }, [currentPage, itemsPerPage, debouncedSearch, selectedDeal]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) setCurrentPage(newPage);
  };

  if (selectedDeal) {
    let normalizedDocs = [];
    const processArray = (arr) => {
      if (!arr) return;
      arr.forEach(doc => {
        if (doc.deletedAt || doc.isDeleted) return; 

        // Check if it's in the document hub recycle bin
        if (recycleAssignments.some(a => String(a.documentId) === String(doc._id))) return;

        const assignment = assignments.find(a => String(a.documentId) === String(doc._id));
        normalizedDocs.push({
          id: doc._id,
          name: doc.name,
          path: doc.path,
          type: doc.type || (doc.name.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
          size: doc.size || 0,
          sourceType: "Deal",
          sourceId: selectedDeal._id,
          sourceName: selectedDeal.dealName,
          uploadedBy: doc.uploadedBy,
          assignedTo: selectedDeal.assignedTo,
          status: assignment ? assignment.status : "Not Assigned",
          activity: assignment ? assignment.activity : [],
          assignmentId: assignment ? assignment.id : null,
          uploadedAt: doc.uploadedAt || new Date(),
          deletedAt: doc.deletedAt
        });
      });
    };
    processArray(selectedDeal.attachments);
    processArray(selectedDeal.images);

    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <div className="mb-4 flex items-center gap-3">
          <button 
            onClick={() => setSelectedDeal(null)}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          >
            <ArrowLeft size={16} /> Back to Deals
          </button>
          <h2 className="text-lg font-semibold text-slate-800">
            Documents for Deal: <span className="text-blue-600">{selectedDeal.dealName}</span>
          </h2>
        </div>
        <DocumentTable documents={normalizedDocs} onQuickAssign={onQuickAssign} isAdmin={isAdmin} />
      </div>
    );
  }

  const getActiveDocCount = (deal) => {
    const isValidDoc = (doc) => !doc.isDeleted && !doc.deletedAt && !recycleAssignments.some(a => String(a.documentId) === String(doc._id));
    return (deal.attachments?.filter(isValidDoc).length || 0) + (deal.images?.filter(isValidDoc).length || 0);
  };
  // Hide deals whose documents are all in the Document Hub recycle bin (or already purged)
  const visibleDeals = deals.filter((deal) => getActiveDocCount(deal) > 0);

  return (
    <div className="flex flex-col h-full animate-in fade-in">

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex-1">
        <table className="min-w-full text-sm text-slate-700 dark:text-slate-200">
          <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Deal Name</th>
              <th className="px-6 py-3 text-left font-medium">Assignee</th>
              <th className="px-6 py-3 text-left font-medium">Documents Linked</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-500">Loading deals...</td>
              </tr>
            ) : visibleDeals.length > 0 ? (
              visibleDeals.map((deal) => {
                const docCount = getActiveDocCount(deal);
                return (
                  <tr 
                    key={deal._id} 
                    className="hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <td className="px-6 py-4 font-medium">{deal.dealName}</td>
                    <td className="px-6 py-4">
                      {deal.assignedTo ? `${deal.assignedTo.firstName || ""} ${deal.assignedTo.lastName || ""}`.trim() : "Unassigned"}
                    </td>
                    <td className="px-6 py-4">
                      {docCount > 0 ? (
                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          {docCount} files
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No deals found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 text-sm text-slate-600 pb-16">
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="border-slate-300 rounded px-2 py-1 outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <span>
          {totalDeals === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalDeals)} of {totalDeals}
        </span>

        <div className="flex items-center gap-1 pr-16">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-full hover:bg-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealsDocument;
