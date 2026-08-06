import React from "react";
import { CheckSquare, Target, X, Calendar } from "lucide-react";
import dayjs from "dayjs";

const LinkedWorkModal = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  const { activeTasks = [], activeTargets = [], itemName } = data;
  const hasTasks = activeTasks.length > 0;
  const hasTargets = activeTargets.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-slate-900">Linked Work Details</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-1">Item</p>
            <p className="font-medium text-gray-800">{itemName}</p>
          </div>

          <div className="space-y-6">
            {hasTasks && (
              <div>
                <h3 className="flex items-center gap-2 text-blue-600 mb-3">
                  <CheckSquare size={16} /> Active Tasks
                </h3>
                <div className="space-y-3">
                  {activeTasks.map((task, idx) => (
                    <div key={task._id || idx} className="bg-blue-50/50 border border-blue-100 rounded-lg p-3">
                      <p className="font-medium text-gray-800 text-sm mb-1">{task.title}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={14} className="text-blue-500" />
                        <span>
                          {task.dueDate ? `Finish within (Due: ${dayjs(task.dueDate).format("MMM D, YYYY h:mm A")})` : "No due date"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasTargets && (
              <div>
                <h3 className="flex items-center gap-2 text-purple-600 mb-3">
                  <Target size={16} /> Active Targets
                </h3>
                <div className="space-y-3">
                  {activeTargets.map((target, idx) => (
                    <div key={target._id || idx} className="bg-purple-50/50 border border-purple-100 rounded-lg p-3">
                      <p className="font-medium text-gray-800 text-sm mb-1">Linked to Target</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={14} className="text-purple-500" />
                        <span>
                          {target.endDate ? `Finish within (End: ${dayjs(target.endDate).format("MMM D, YYYY")})` : "No end date"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!hasTasks && !hasTargets && (
              <p className="text-sm text-gray-500 italic text-center py-4">No active tasks or targets found.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default LinkedWorkModal;
