import React, { useState, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MoreVertical, Eye } from "lucide-react";
import { Link } from "react-router-dom";

const ItemTypes = {
  INVOICE: "INVOICE",
};

const STAGES = [
  {
    id: "unpaid",
    title: "Unpaid",
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  {
    id: "partially_paid",
    title: "Partially Paid",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
  {
    id: "paid",
    title: "Paid",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  }
];

export default function InvoicePipelineView({
  invoices,
  handleStatusChange,
  CURRENCY_SYMBOLS,
  userCurrency,
  tenantSlug,
  handleSendEmail,
  downloadInvoice,
  handleEdit,
  confirmDelete,
}) {
  const [columns, setColumns] = useState({});

  useEffect(() => {
    const grouped = {};
    STAGES.forEach((s) => (grouped[s.id] = []));

    invoices.forEach((invoice) => {
      const status = STAGES.find((s) => s.id === invoice.status) ? invoice.status : "unpaid";
      if (!grouped[status]) grouped[status] = [];
      grouped[status].push(invoice);
    });
    setColumns(grouped);
  }, [invoices]);

  const moveInvoice = (invoiceId, fromStage, toStage) => {
    if (fromStage === toStage) return;

    // Call API handler from parent which will open the modal
    handleStatusChange(invoiceId, toStage);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="mx-auto flex gap-4 overflow-x-auto pb-4 pt-2 mt-6">
        {STAGES.map((stage) => (
          <Column
            key={stage.id}
            id={stage.id}
            title={stage.title}
            titleColor={stage.color}
            bgColor={stage.bgColor}
            borderColor={stage.borderColor}
            invoices={columns[stage.id] || []}
            moveInvoice={moveInvoice}
            CURRENCY_SYMBOLS={CURRENCY_SYMBOLS}
            userCurrency={userCurrency}
            tenantSlug={tenantSlug}
            handleSendEmail={handleSendEmail}
            downloadInvoice={downloadInvoice}
            handleEdit={handleEdit}
            confirmDelete={confirmDelete}
          />
        ))}
      </div>
    </DndProvider>
  );
}

function Column({
  id,
  title,
  titleColor,
  bgColor,
  borderColor,
  invoices,
  moveInvoice,
  CURRENCY_SYMBOLS,
  userCurrency,
  tenantSlug,
  handleSendEmail,
  downloadInvoice,
  handleEdit,
  confirmDelete,
}) {
  const [, dropRef] = useDrop({
    accept: ItemTypes.INVOICE,
    drop: (item) => {
      if (item.from !== id) {
        moveInvoice(item.id, item.from, id);
      }
    },
  });

  return (
    <div
      ref={dropRef}
      className={`min-w-[320px] w-[320px] flex flex-col border-2 ${borderColor} rounded-xl bg-white p-3 shadow-sm`}
    >
      <div className="mb-3">
        <h2 className={`text-sm font-bold flex items-center justify-between ${titleColor} ${bgColor} p-3 rounded-lg`}>
          <span>{title}</span>
          <span className="inline-flex items-center justify-center border px-2 py-0.5 text-xs text-gray-600 bg-white rounded-full min-w-[24px]">
            {invoices.length}
          </span>
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1">
        <div className="flex flex-col gap-3 pb-2">
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice._id}
              invoice={invoice}
              stageId={id}
              moveInvoice={moveInvoice}
              CURRENCY_SYMBOLS={CURRENCY_SYMBOLS}
              userCurrency={userCurrency}
              tenantSlug={tenantSlug}
              handleSendEmail={handleSendEmail}
              downloadInvoice={downloadInvoice}
              handleEdit={handleEdit}
              confirmDelete={confirmDelete}
            />
          ))}
          {invoices.length === 0 && (
            <div className="mt-4 border-2 border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 rounded-xl">
              Drop invoices here
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoiceCard({
  invoice,
  stageId,
  moveInvoice,
  CURRENCY_SYMBOLS,
  userCurrency,
  tenantSlug,
  handleSendEmail,
  downloadInvoice,
  handleEdit,
  confirmDelete,
}) {
  const [{ isDragging }, dragRef] = useDrag({
    type: ItemTypes.INVOICE,
    item: { id: invoice._id, from: stageId },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const invoiceNumber = invoice.invoiceNumber || invoice._id.substring(0, 6).toUpperCase();
  const currencySymbol = CURRENCY_SYMBOLS[invoice.currency || userCurrency] || invoice.currency || userCurrency;

  return (
    <div
      ref={dragRef}
      className="border border-gray-200 p-3 rounded-xl shadow-sm bg-white hover:shadow-md transition-shadow relative cursor-move"
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="absolute top-2 right-2" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="p-1 rounded hover:bg-gray-100 text-gray-500"
        >
          <MoreVertical size={16} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[9999]">
            <Link
              to={`/${tenantSlug}/invoices/${invoice._id}`}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              View Invoice
            </Link>
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleSendEmail(invoice._id); }}
            >
              Send to Email
            </button>
            <button
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); downloadInvoice(invoice._id, invoiceNumber); }}
            >
              Download
            </button>
            {invoice.status !== "paid" && (
              <button
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleEdit(invoice); }}
              >
                Edit
              </button>
            )}
            <button
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); confirmDelete(invoice); }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start mb-2 pr-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-1" title={invoiceNumber}>
            Invoice #{invoiceNumber}
          </h3>
          <p className="text-xs text-blue-600 mt-0.5 line-clamp-1 hover:underline cursor-pointer">
            {invoice.items?.[0]?.deal?.dealName || invoice.items?.[0]?.deal?.title || "No Deal"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-3 text-xs text-gray-600">
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Total:</span>
          <span>{currencySymbol}{Number(invoice.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Date:</span>
          <span>
            {invoice.date || invoice.createdAt
              ? new Date(invoice.date || invoice.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "-"}
          </span>
        </div>
        <div className="flex justify-between items-center bg-gray-50 p-1.5 rounded">
          <span className="font-medium">Assignee:</span>
          <span>{invoice.assignTo ? `${invoice.assignTo.firstName || ""} ${invoice.assignTo.lastName || ""}`.trim() : "-"}</span>
        </div>
      </div>
    </div>
  );
}
