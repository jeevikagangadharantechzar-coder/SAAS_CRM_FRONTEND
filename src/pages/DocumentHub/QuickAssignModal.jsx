import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { useAssignDocument } from '../../hooks/useDocumentHub';
import { toast } from 'react-toastify';
import { api } from '../../services/api';

const QuickAssignModal = ({ isOpen, onClose, doc }) => {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [note, setNote] = useState('');
  const assignMutation = useAssignDocument();

  useEffect(() => {
    if (isOpen) {
      api.get('/users')
        .then(res => {
          setUsers(res.data.users || res.data || []);
          const defaultUser = doc?.assignedTo;
          if (defaultUser) {
            setSelectedUserId(typeof defaultUser === 'object' ? defaultUser._id : defaultUser);
          }
        })
        .catch(err => console.error(err));
    } else {
      setSelectedUserId('');
      setNote('');
    }
  }, [isOpen, doc?.assignedTo]);

  const handleAssign = () => {
    if (!selectedUserId) {
      return toast.error("Please select a Salesman");
    }

    const payload = {
      sourceType: doc.sourceType,
      sourceId: doc.sourceId,
      sourceName: doc.sourceName,
      documents: [{
        id: doc.id,
        name: doc.name,
        path: doc.path,
        type: doc.type,
        size: doc.size || 0
      }],
      assignedTo: selectedUserId,
      note: note
    };

    assignMutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Document has been set for review.");
        onClose();
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Failed to assign document");
      }
    });
  };

  if (!doc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Quick Assign Document</DialogTitle>
          <DialogDescription className="sr-only">Assign a document to a salesman</DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Document</p>
            <p className="text-sm text-slate-500 bg-slate-50 p-2 rounded">{doc.name}</p>
          </div>
          
          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 block mb-1">Select Salesman</label>
            <select 
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={!!(doc?.assignedTo)}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value="">-- Choose User --</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            {!!(doc?.assignedTo) && (
              <p className="text-xs text-slate-500 mt-1">Automatically locked to the user owning this {doc.sourceType}.</p>
            )}
          </div>

          <div className="mb-4">
            <label className="text-sm font-medium text-slate-700 block mb-1">Instructions (Optional)</label>
            <textarea 
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              rows={3}
              placeholder="E.g., Please review page 2."
            />
          </div>
        </div>

        <DialogFooter>
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md text-sm font-medium transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleAssign}
            disabled={assignMutation.isPending || !selectedUserId}
            className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-sm font-medium transition disabled:opacity-50"
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAssignModal;
