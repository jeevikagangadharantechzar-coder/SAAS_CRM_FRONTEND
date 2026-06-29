import React from "react";
import { Trash2, X, UserX, Users, MessageSquareX } from "lucide-react";

const DeleteModal = ({ type, name, onDeleteForEveryone, onDeleteForMe, onClearChat, onConfirm, onClose }) => {

  if (type === "delete_chat") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
                <Trash2 size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Delete Chat</h3>
                {name && <p className="text-xs text-gray-400 mt-0.5">{name}</p>}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to delete this chat? All messages will be
              <span className="font-semibold text-gray-800"> permanently deleted</span> and
              cannot be recovered.
            </p>
          </div>
          <div className="flex gap-2.5 px-5 pb-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition"
            >
              Delete Chat
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === "delete_group") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
                <Users size={16} className="text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-sm">Delete Group</h3>
                {name && <p className="text-xs text-gray-400 mt-0.5">{name}</p>}
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-gray-800">"{name}"</span>?
              This will permanently delete the group and all its messages for
              <span className="font-semibold text-gray-800"> all members</span>.
              This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-2.5 px-5 pb-5">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition"
            >
              Delete Group
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === "clear") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
                <MessageSquareX size={15} className="text-red-500" />
              </div>
              <h3 className="font-semibold text-gray-800 text-sm">Clear Chat</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600">
              This will permanently delete all messages in this conversation. This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-2 px-5 pb-4">
            <button
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => { onClearChat(); onClose(); }}
              className="flex-1 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-50 rounded-full flex items-center justify-center">
              <Trash2 size={15} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800 text-sm">Delete Message</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="p-3 space-y-2">
          <button
            onClick={() => { onDeleteForEveryone(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 group transition"
          >
            <div className="w-9 h-9 rounded-full bg-red-50 group-hover:bg-red-100 flex items-center justify-center flex-shrink-0 transition">
              <Users size={16} className="text-red-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">Delete for Everyone</p>
              <p className="text-xs text-gray-400 mt-0.5">Remove this message for all members</p>
            </div>
          </button>

          <button
            onClick={() => { onDeleteForMe(); onClose(); }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-50 group transition"
          >
            <div className="w-9 h-9 rounded-full bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center flex-shrink-0 transition">
              <UserX size={16} className="text-gray-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-800">Delete for Me</p>
              <p className="text-xs text-gray-400 mt-0.5">Remove only from your view</p>
            </div>
          </button>
        </div>

        <div className="px-5 pb-4">
          <button
            onClick={onClose}
            className="w-full py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
