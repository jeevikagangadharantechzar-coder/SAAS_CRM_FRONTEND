import React, { useState } from 'react';
import { File, FileText, Image, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import DocumentDrawer from './DocumentDrawer';
import dayjs from 'dayjs';

const getFileIcon = (type) => {
  if (type.includes('pdf')) return <FileText className="text-red-500" size={20} />;
  if (type.includes('image')) return <Image className="text-blue-500" size={20} />;
  return <File className="text-slate-500" size={20} />;
};

const getStatusColor = (status) => {
  switch (status) {
    case 'Assigned': return 'bg-blue-100 text-blue-700';
    case 'Viewed': return 'bg-indigo-100 text-indigo-700';
    case 'Replied': return 'bg-purple-100 text-purple-700';
    case 'Approved': return 'bg-green-100 text-green-700';
    case 'Rejected': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const DocumentTable = ({ documents, onQuickAssign, isAdmin, pagination, currentPage = 1, setCurrentPage, itemsPerPage = 10, setItemsPerPage }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);

  if (!documents || documents.length === 0) {
    return <div className="p-12 text-center text-slate-500">No documents found matching your criteria.</div>;
  }

  const totalPages = pagination?.totalPages || 1;
  const totalItems = pagination?.total || documents.length;

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages && setCurrentPage) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="pb-16">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs uppercase text-slate-500">
              <th className="px-6 py-4 font-medium">File</th>
              <th className="px-6 py-4 font-medium">Source</th>
              <th className="px-6 py-4 font-medium">Reviewer</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium">Updated</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
            {documents.map((doc) => (
              <tr 
                key={doc.id} 
                className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <td className="px-6 py-4 flex items-center gap-3">
                  {getFileIcon(doc.type)}
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                    {doc.name}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{doc.sourceType}</span>
                    <span className="text-xs text-slate-500 truncate max-w-[150px]">{doc.sourceName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                  {/* Need assignedTo population to show names, assuming it's populated or id is shown. The controller isn't populating assignTo fully for all, but for External it is. */}
                  {doc.assignedTo?.firstName ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'Assigned Salesman'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                    {doc.status}
                  </span>
                  {isAdmin && doc.status === 'Not Assigned' && onQuickAssign && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onQuickAssign(doc); }}
                      className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200 rounded text-xs transition"
                    >
                      Assign
                    </button>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-500">
                  {dayjs(doc.updatedAt).format('MMM D, YYYY')}
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    onClick={(e) => { e.stopPropagation(); setSelectedDoc(doc); }}
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm text-slate-600 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => { 
              if (setItemsPerPage) setItemsPerPage(Number(e.target.value)); 
              if (setCurrentPage) setCurrentPage(1); 
            }}
            className="border-slate-300 rounded px-2 py-1 outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <span>
          {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
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

      {selectedDoc && (() => {
        const activeDoc = documents.find(d => (d.id || d._id) === (selectedDoc.id || selectedDoc._id)) || selectedDoc;
        return <DocumentDrawer doc={activeDoc} onClose={() => setSelectedDoc(null)} />;
      })()}
    </div>
  );
};

export default DocumentTable;
