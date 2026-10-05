import React, { useState } from 'react';
import { useDocuments, useRecycleBin } from '../../hooks/useDocumentHub';
import DocumentTable from './DocumentTable';
import RecycleBin from './RecycleBin';
import LeadDocument from './LeadDocument';
import DealsDocument from './DealsDocument';
import AssignDocumentModal from './AssignDocumentModal';
import QuickAssignModal from './QuickAssignModal';
import UploadModal from './UploadModal';
import { Plus, Trash2, Search, ClipboardList } from 'lucide-react';
import { useSelector } from 'react-redux';

const DocumentHub = () => {
  const [activeTab, setActiveTab] = useState("Assigned Documents");
  const [searchTerm, setSearchTerm] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [quickAssignDoc, setQuickAssignDoc] = useState(null);
  
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role?.name === 'Admin';

  const { data, isLoading, error } = useDocuments({
    sourceType: activeTab === "Assigned Documents" ? "All" : activeTab,
    search: searchTerm,
    status: statusFilter,
    page: currentPage,
    limit: itemsPerPage
  });

  const { data: recycleData } = useRecycleBin();

  const tabs = ["Assigned Documents", "Lead", "Deal", "Invoice", "External"];

  return (
    <div className="p-6 h-full flex flex-col bg-slate-50 dark:bg-slate-900">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Document Hub</h1>
          <p className="text-sm text-slate-500">Manage all your linked and external documents.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowRecycleBin(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md hover:bg-slate-100 text-slate-600 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
          >
            <Trash2 size={16} /> Recycle Bin
          </button>
          {isAdmin && (
            <button 
              onClick={() => setIsAssignModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
            >
              <ClipboardList size={18} />
              Assign Document
            </button>
          )}
          <button 
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} /> Upload External
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search documents..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-900 dark:text-white"
            />
          </div>
          <select 
            value={statusFilter} 
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-sm outline-none dark:bg-slate-900 dark:text-white cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Assigned">Assigned</option>
            <option value="Viewed">Viewed</option>
            <option value="Replied">Replied</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Sent">Sent</option>
          </select>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center p-12 text-slate-500">Loading documents...</div>
        ) : error ? (
          <div className="flex h-full items-center justify-center p-12 text-red-500">Failed to load documents.</div>
        ) : activeTab === "Lead" ? (
          <LeadDocument assignments={data?.data || []} recycleAssignments={recycleData || []} onQuickAssign={setQuickAssignDoc} />
        ) : activeTab === "Deal" ? (
          <DealsDocument assignments={data?.data || []} recycleAssignments={recycleData || []} onQuickAssign={setQuickAssignDoc} />
        ) : (
          <DocumentTable 
            documents={data?.data || []}
            pagination={data?.pagination}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        )}
      </div>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      {showRecycleBin && <RecycleBin onClose={() => setShowRecycleBin(false)} />}
      {isAssignModalOpen && <AssignDocumentModal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />}
      {quickAssignDoc && <QuickAssignModal isOpen={!!quickAssignDoc} doc={quickAssignDoc} onClose={() => setQuickAssignDoc(null)} />}
    </div>
  );
};

export default DocumentHub;
