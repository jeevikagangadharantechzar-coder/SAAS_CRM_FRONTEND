import React, { useState } from "react";
import { AlertCircle, Calendar, Target as TargetIcon, CheckSquare } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const ReassignmentModal = ({ isOpen, onClose, onConfirm, hasTasks, hasTargets, itemType }) => {
  const [step, setStep] = useState(1);
  
  const [taskAction, setTaskAction] = useState("continue");
  const [newTaskName, setNewTaskName] = useState("");
  const [extendedTaskDueDate, setExtendedTaskDueDate] = useState(null);
  const [extendedTaskDescription, setExtendedTaskDescription] = useState("");

  // Target state
  const [targetAction, setTargetAction] = useState("continue");
  const [extendedTargetEndDate, setExtendedTargetEndDate] = useState(null);
  const [extendedTargetDescription, setExtendedTargetDescription] = useState("");

  if (!isOpen) return null;

  const handleNext = () => setStep(2);

  const resetState = () => {
    setStep(1);
    setTaskAction("continue");
    setNewTaskName("");
    setExtendedTaskDueDate(null);
    setExtendedTaskDescription("");
    setTargetAction("continue");
    setExtendedTargetEndDate(null);
    setExtendedTargetDescription("");
  };

  const handleConfirm = () => {
    onConfirm({
      taskAction, newTaskName, extendedTaskDueDate, extendedTaskDescription,
      targetAction, extendedTargetEndDate, extendedTargetDescription
    });
    resetState();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 overflow-y-auto">
          {step === 1 ? (
            <>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4 mx-auto">
                <AlertCircle className="text-red-600" size={24} />
              </div>
              <h2 className="text-xl font-semibold text-center text-gray-800 mb-2">
                Active Assignments Detected
              </h2>
              <p className="text-gray-600 text-center mb-6">
                This {itemType} is currently linked to active work for the current salesperson. 
                Reassigning it will affect their pipeline. Are you sure you want to proceed?
              </p>
              
              <div className="flex justify-center gap-4 mb-6">
                {hasTasks && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200">
                    <CheckSquare size={18} /> Linked to Task(s)
                  </div>
                )}
                {hasTargets && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium border border-purple-200">
                    <TargetIcon size={18} /> Linked to Target(s)
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                >
                  Yes, Proceed
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Reassignment Options
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                How would you like to handle the existing active work linked to this {itemType}?
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hasTasks && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <CheckSquare className="text-blue-600" size={18} /> Task Reassignment
                    </h3>
                    
                    <div className="space-y-3">
                      <label className={`flex p-3 border rounded-lg cursor-pointer transition-colors ${taskAction === "continue" ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white"}`}>
                        <input type="radio" className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" checked={taskAction === "continue"} onChange={() => setTaskAction("continue")} />
                        <div className="ml-2">
                          <span className="block text-sm font-medium text-gray-900">Continue Task</span>
                          <span className="block text-xs text-gray-500">Clone task for the new person.</span>
                        </div>
                      </label>

                      {taskAction === "continue" && (
                        <div className="space-y-3 pl-6 border-l-2 border-blue-200 ml-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Task Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              placeholder="e.g. Follow up on reassigned deal"
                              className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Extended Due Date (Optional)</label>
                            <DatePicker
                              selected={extendedTaskDueDate}
                              onChange={setExtendedTaskDueDate}
                              showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="MMM d, yyyy h:mm aa"
                              placeholderText="Select date"
                              className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                              minDate={new Date()} isClearable
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Task Note (Optional)</label>
                            <textarea
                              value={extendedTaskDescription}
                              onChange={(e) => setExtendedTaskDescription(e.target.value)}
                              placeholder="Note for new salesperson..."
                              className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-y"
                              rows="2"
                            />
                          </div>
                        </div>
                      )}

                      <label className={`flex p-3 border rounded-lg cursor-pointer transition-colors ${taskAction === "reassign" ? "border-blue-500 bg-blue-50/50" : "border-gray-200 bg-white"}`}>
                        <input type="radio" className="mt-1 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500" checked={taskAction === "reassign"} onChange={() => setTaskAction("reassign")} />
                        <div className="ml-2">
                          <span className="block text-sm font-medium text-gray-900">Just Reassign</span>
                          <span className="block text-xs text-gray-500">Unlink from old task.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {hasTargets && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <TargetIcon className="text-purple-600" size={18} /> Target Reassignment
                    </h3>
                    
                    <div className="space-y-3">
                      <label className={`flex p-3 border rounded-lg cursor-pointer transition-colors ${targetAction === "continue" ? "border-purple-500 bg-purple-50/50" : "border-gray-200 bg-white"}`}>
                        <input type="radio" className="mt-1 w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500" checked={targetAction === "continue"} onChange={() => setTargetAction("continue")} />
                        <div className="ml-2">
                          <span className="block text-sm font-medium text-gray-900">Continue Target</span>
                          <span className="block text-xs text-gray-500">Create target for new person.</span>
                        </div>
                      </label>

                      {targetAction === "continue" && (
                        <div className="space-y-3 pl-6 border-l-2 border-purple-200 ml-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Extended End Date (Optional)</label>
                            <DatePicker
                              selected={extendedTargetEndDate}
                              onChange={setExtendedTargetEndDate}
                              showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="MMM d, yyyy h:mm aa"
                              placeholderText="Select date"
                              className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                              minDate={new Date()} isClearable
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Target Note (Optional)</label>
                            <textarea
                              value={extendedTargetDescription}
                              onChange={(e) => setExtendedTargetDescription(e.target.value)}
                              placeholder="Note for new salesperson..."
                              className="w-full border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none resize-y"
                              rows="2"
                            />
                          </div>
                        </div>
                      )}

                      <label className={`flex p-3 border rounded-lg cursor-pointer transition-colors ${targetAction === "reassign" ? "border-purple-500 bg-purple-50/50" : "border-gray-200 bg-white"}`}>
                        <input type="radio" className="mt-1 w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500" checked={targetAction === "reassign"} onChange={() => setTargetAction("reassign")} />
                        <div className="ml-2">
                          <span className="block text-sm font-medium text-gray-900">Just Reassign</span>
                          <span className="block text-xs text-gray-500">Unlink from old target.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end mt-6">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={hasTasks && taskAction === "continue" && !newTaskName.trim()}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReassignmentModal;
