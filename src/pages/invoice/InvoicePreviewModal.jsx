import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

// Shows the generated PDF in place. Uses the same endpoint as Download, fetched
// only when a preview is opened, and the loaded file is reused for Download.
const InvoicePreviewModal = ({ invoice, onClose }) => {
  const API_URL = import.meta.env.VITE_API_URL;
  const [pdfUrl, setPdfUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!invoice?._id) return undefined;
    let objectUrl = null;
    let cancelled = false;
    setPdfUrl(null);
    setFailed(false);

    axios
      .get(`${API_URL}/invoices/download/${invoice._id}`, { responseType: "blob" })
      .then((res) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
        setPdfUrl(objectUrl);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        toast.error("Failed to load invoice preview.");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoice?._id, API_URL]);

  const title = `${invoice?.invoiceType || "Invoice"} #${invoice?.invoicenumber || ""}`;

  return (
    <Dialog open={!!invoice} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[95vw] max-w-5xl sm:max-w-5xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between gap-3 border-b px-6 py-4 pr-14">
          <DialogTitle className="text-lg font-semibold">Preview — {title}</DialogTitle>
          {pdfUrl && (
            <a
              href={pdfUrl}
              download={`Invoice_${invoice?.invoicenumber || invoice?._id}.pdf`}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Download className="h-4 w-4" /> Download
            </a>
          )}
        </DialogHeader>
        <div className="flex-1 bg-gray-100">
          {pdfUrl ? (
            <iframe src={pdfUrl} title={title} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              {failed ? "Preview could not be loaded." : "Generating preview..."}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreviewModal;
