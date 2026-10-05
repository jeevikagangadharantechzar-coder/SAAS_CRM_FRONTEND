import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Search, Loader2, FileText, ChevronRight } from 'lucide-react';
import { useAssignDocument } from '../../hooks/useDocumentHub';
import { toast } from 'react-toastify';
import { api } from '../../services/api';


const AssignDocumentModal = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState('Lead'); // Lead or Deal
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  
  const [documents, setDocuments] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState(new Set());
  
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [note, setNote] = useState('');

  const assignMutation = useAssignDocument();

  // Fetch users for assignment
  useEffect(() => {
    if (isOpen) {
      api.get('/users')
        .then(res => setUsers(res.data.users || res.data || []))
        .catch(err => console.error(err));
    } else {
      // Reset state on close
      setStep(1);
      setSourceType('Lead');
      setSearchQuery('');
      setSelectedSource(null);
      setSelectedDocIds(new Set());
      setSelectedUserId('');
      setNote('');
    }
  }, [isOpen]);

  // Search leads/deals
  useEffect(() => {
    if (step !== 1) return;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (sourceType === 'Lead') {
          const res = await api.get(`/leads/getAllLead?search=${searchQuery}&limit=20&hasAttachments=true`);
          const data = res.data.leads || res.data;
          setSearchResults(Array.isArray(data) ? data : []);
        } else {
          const res = await api.get(`/deals/getAll?search=${searchQuery}&limit=20&hasAttachments=true`);
          const data = res.data.deals || res.data;
          setSearchResults(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, sourceType, step]);

  const handleSelectSource = (item) => {
    setSelectedSource(item);
    
    // Extract documents
    let docs = [];
    if (item.attachments) docs = docs.concat(item.attachments);
    if (item.images) docs = docs.concat(item.images);
    
    // Filter out soft deleted ones
    docs = docs.filter(d => !d.deletedAt && !d.isDeleted);
    
    setDocuments(docs.map(d => ({
      id: d._id,
      name: d.name,
      path: d.path,
      size: d.size,
      type: d.type
    })));
    
    // Auto-select assignee for Lead/Deal
    let assigneeId = '';
    if (sourceType === 'Lead' && item.assignTo) {
      assigneeId = typeof item.assignTo === 'object' ? item.assignTo._id : item.assignTo;
    } else if (sourceType === 'Deal' && item.assignedTo) {
      assigneeId = typeof item.assignedTo === 'object' ? item.assignedTo._id : item.assignedTo;
    }
    setSelectedUserId(assigneeId || '');
    
    setStep(2);
  };

  const toggleDocSelection = (id) => {
    const newSet = new Set(selectedDocIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocIds(newSet);
  };

  const handleNextToConfirm = () => {
    if (selectedDocIds.size === 0) return toast.error("Select at least one document");
    if (!selectedUserId) return toast.error("Select a user to assign to");
    setStep(3);
  };

  const handleAssign = () => {
    if (selectedDocIds.size === 0) return toast.error("Select at least one document");
    if (!selectedUserId) return toast.error("Select a user to assign to");

    const selectedDocs = documents.filter(d => selectedDocIds.has(d.id));

    assignMutation.mutate({
      sourceType,
      sourceId: selectedSource._id,
      sourceName: sourceType === 'Lead' ? selectedSource.leadName : selectedSource.dealName,
      documents: selectedDocs,
      assignedTo: selectedUserId,
      note
    }, {
      onSuccess: () => {
        toast.success("Document has been set for review.");
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || "Failed to assign document");
        setStep(2); // Go back to step 2 on error
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Assign Documents for Review</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 bg-slate-50">
          
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="flex gap-2">
                <button
                  onClick={() => { setSourceType('Lead'); setSearchQuery(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md border ${sourceType === 'Lead' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  From Lead
                </button>
                <button
                  onClick={() => { setSourceType('Deal'); setSearchQuery(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-md border ${sourceType === 'Deal' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                >
                  From Deal
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={`Search ${sourceType} name...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-md outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="border rounded-md bg-white overflow-hidden shadow-sm h-[40vh] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" /></div>
                ) : searchResults.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500">No {sourceType.toLowerCase()}s found</div>
                ) : (
                  <ul className="divide-y">
                    {searchResults.map(item => (
                      <li 
                        key={item._id} 
                        onClick={() => handleSelectSource(item)}
                        className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between group"
                      >
                        <span className="font-medium text-slate-700">{sourceType === 'Lead' ? item.leadName : item.dealName}</span>
                        <ChevronRight className="text-slate-300 group-hover:text-blue-500" size={18} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-md mb-4 flex items-center gap-2 text-blue-800 text-sm font-medium">
                <button onClick={() => setStep(1)} className="text-blue-600 hover:underline">Select {sourceType}</button>
                <span>/</span>
                <span>{sourceType === 'Lead' ? selectedSource.leadName : selectedSource.dealName}</span>
              </div>

              <h3 className="font-medium text-slate-700">Select Documents</h3>
              {documents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 border rounded-md bg-white border-dashed">
                  No documents found in this {sourceType}.
                </div>
              ) : (
                <div className="space-y-2 max-h-[30vh] overflow-y-auto border rounded-md bg-white p-2">
                  {documents.map(doc => (
                    <label key={doc.id} className={`flex items-center p-3 rounded border cursor-pointer transition-colors ${selectedDocIds.has(doc.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}>
                      <input 
                        type="checkbox" 
                        className="mr-3 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        checked={selectedDocIds.has(doc.id)}
                        onChange={() => toggleDocSelection(doc.id)}
                      />
                      <FileText size={18} className="text-slate-400 mr-2" />
                      <span className="text-sm font-medium text-slate-700">{doc.name}</span>
                    </label>
                  ))}
                </div>
              )}

              {documents.length > 0 && (
                <div className="space-y-3 pt-4 border-t mt-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                    <select 
                      value={selectedUserId} 
                      onChange={e => setSelectedUserId(e.target.value)}
                      disabled={sourceType === 'Lead' || sourceType === 'Deal'}
                      className={`w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 ${
                        (sourceType === 'Lead' || sourceType === 'Deal') ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">Select Salesman...</option>
                      {users.map(u => (
                        <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                      ))}
                    </select>
                    {(sourceType === 'Lead' || sourceType === 'Deal') && (
                      <p className="text-xs text-slate-500 mt-1">
                        Automatically assigned to the {sourceType.toLowerCase()}'s owner.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Instructions / Note</label>
                    <textarea 
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="What should they review?"
                      className="w-full border rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <h3 className="font-medium text-slate-800 text-lg mb-2">Confirm Assignment</h3>
              <div className="bg-white border rounded-md p-4 space-y-3 text-sm">
                <div>
                  <span className="text-slate-500 block mb-1">Document(s):</span>
                  <ul className="list-disc pl-5 font-medium text-slate-700">
                    {documents.filter(d => selectedDocIds.has(d.id)).map(d => (
                      <li key={d.id}>{d.name}</li>
                    ))}
                  </ul>
                </div>
                <div className="border-t pt-3">
                  <span className="text-slate-500 block mb-1">Assigned To:</span>
                  <span className="font-medium text-slate-700">
                    {users.find(u => u._id === selectedUserId)?.firstName} {users.find(u => u._id === selectedUserId)?.lastName}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <span className="text-slate-500 block mb-1">Instruction:</span>
                  <p className="text-slate-700 italic bg-slate-50 p-2 rounded border">
                    {note || "No additional instructions provided."}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="px-6 py-4 border-t bg-white">
          <div className="flex w-full justify-between">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)} disabled={assignMutation.isPending} className="px-4 py-2 text-sm text-slate-600 border rounded hover:bg-slate-50 disabled:opacity-50">Back</button>
            ) : <div />}
            
            {step === 2 && documents.length > 0 && (
              <button 
                onClick={handleNextToConfirm}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 flex items-center gap-2"
              >
                Next <ChevronRight size={16} />
              </button>
            )}

            {step === 3 && (
              <button 
                onClick={handleAssign}
                disabled={assignMutation.isPending}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {assignMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                Send for Review
              </button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignDocumentModal;
