import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

export default function DeleteModal({ item, itemType, onClose, onConfirm }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Confirm Delete
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-4">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this {itemType}? 
            <br />
            <span className="font-semibold">{item?.name || `${item?.firstName} ${item?.lastName}`}</span>
          </p>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}