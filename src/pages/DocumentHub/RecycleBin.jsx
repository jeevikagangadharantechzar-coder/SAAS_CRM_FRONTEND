import React from 'react';
import { X, RotateCcw, Trash, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRecycleBin, useRestoreDocument, usePermanentDeleteDocument } from '../../hooks/useDocumentHub';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const RecycleBin = ({ onClose }) => {
  const { data: binDocs, isLoading } = useRecycleBin();
  const restoreDoc = useRestoreDocument();
  const permDelete = usePermanentDeleteDocument();

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 10;

  const handleRestore = (doc) => {
    restoreDoc.mutate({ id: doc.id });
  };

  const handlePermDelete = (doc) => {
    if(confirm("Are you sure you want to permanently delete this document? This cannot be undone.")) {
      permDelete.mutate({ id: doc.id });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <div className="w-[800px] h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
          <div>
            <h2 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
              <Trash size={22} className="text-red-500"/> Recycle Bin
            </h2>
            <p className="text-sm text-slate-500 mt-1">Documents will be permanently purged after 30 days.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 transition">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900">
          {isLoading ? (
            <div className="text-center text-slate-500 py-12">Loading recycle bin...</div>
          ) : binDocs?.length === 0 ? (
            <div className="text-center text-slate-500 py-12 flex flex-col items-center">
               <Trash size={48} className="text-slate-300 mb-4" />
               <p>The recycle bin is empty.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Deleted Date</th>
                    <th className="px-4 py-3 font-medium">Time Left</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {binDocs?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(doc => {
                     const deletionDate = dayjs(doc.deletedAt);
                     const purgeDate = deletionDate.add(30, 'day');
                     const daysLeft = purgeDate.diff(dayjs(), 'day');
                     
                     return (
                      <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{doc.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                          {doc.sourceType} {doc.sourceName && <span className="text-slate-400 text-xs block">{doc.sourceName}</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{deletionDate.format('MMM D, YYYY')}</td>
                        <td className="px-4 py-3 text-red-500 font-medium">
                          {daysLeft < 0 ? 'Purging soon' : `${daysLeft} days`}
                        </td>
                        <td className="px-4 py-3 flex justify-end gap-2">
                          <button 
                            onClick={() => handleRestore(doc)}
                            className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 rounded transition"
                            title="Restore"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button 
                            onClick={() => handlePermDelete(doc)}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded transition"
                            title="Delete Permanently"
                          >
                            <Trash size={16} />
                          </button>
                        </td>
                      </tr>
                     )
                  })}
                </tbody>
              </table>
              {binDocs?.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 px-4 py-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-500">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, binDocs.length)} of {binDocs.length}
                  </div>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(binDocs.length / itemsPerPage)))}
                      disabled={currentPage === Math.ceil(binDocs.length / itemsPerPage)}
                      className="p-1 rounded bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 disabled:opacity-50 hover:bg-slate-50 transition"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecycleBin;
