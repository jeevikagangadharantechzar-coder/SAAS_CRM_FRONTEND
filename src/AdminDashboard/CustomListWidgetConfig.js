export const MODULE_CONFIG = {
  deals: {
    label: "Deals",
    filters: [
      { value: "all", label: "All Deals" },
      { value: "open", label: "Open Deals" },
      { value: "won", label: "Won Deals" },
      { value: "lost", label: "Lost Deals" },
    ],
    fields: [
      { value: "dealName", label: "Deal Name" },
      { value: "stage", label: "Stage" },
      { value: "amount", label: "Value" },
      { value: "amount_user", label: "Value (User Currency)" },
      { value: "assignedTo", label: "Assigned To" },
      { value: "createdAt", label: "Created At" },
    ],
    endpoint: "/deals/getAll",
  },
  leads: {
    label: "Leads",
    filters: [
      { value: "all", label: "All Leads" },
      { value: "new", label: "New Leads" },
    ],
    fields: [
      { value: "firstName", label: "Lead Name" },
      { value: "contactNumber", label: "Contact Number" },
      { value: "company", label: "Company" },
      { value: "country", label: "Country" },
      { value: "source", label: "Source" },
      { value: "status", label: "Status" },
      { value: "assignedTo", label: "Assignee" },
      { value: "createdAt", label: "Created Date" },
      { value: "followUpDate", label: "Follow-up Date" },
    ],
    endpoint: "/leads/getAllLead",
  },
  invoices: {
    label: "Invoices",
    filters: [
      { value: "all", label: "All Invoices" },
      { value: "pending", label: "Pending" },
      { value: "paid", label: "Paid" },
    ],
    fields: [
      { value: "invoiceNumber", label: "Invoice #" },
      { value: "dealName", label: "Deal Name" },
      { value: "status", label: "Status" },
      { value: "total", label: "Amount" },
      { value: "paid", label: "Paid Amount" },
      { value: "balance", label: "Balance Due" },
      { value: "assignedTo", label: "Assigned To" },
      { value: "dueDate", label: "Due Date" },
    ],
    endpoint: "/invoices/getInvoice",
  },
  proposals: {
    label: "Proposals",
    filters: [
      { value: "all", label: "All Proposals" },
      { value: "sent", label: "Sent" },
      { value: "accepted", label: "Accepted" },
    ],
    fields: [
      { value: "title", label: "Title" },
      { value: "dealTitle", label: "Deal Title" },
      { value: "email", label: "Email" },
      { value: "status", label: "Status" },
      { value: "followUpDate", label: "Follow-up Date" },
    ],
    endpoint: "/proposal/getall",
  },
  tasks: {
    label: "Tasks",
    filters: [
      { value: "all", label: "All Tasks" },
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
    ],
    fields: [
      { value: "title", label: "Task Title" },
      { value: "status", label: "Status" },
      { value: "priority", label: "Priority" },
      { value: "assignedTo", label: "Assignee" },
      { value: "dueDate", label: "Due Date" },
    ],
    endpoint: "/tasks",
    useTenantBase: true
  },
  targets: {
    label: "Targets",
    filters: [
      { value: "all", label: "All Targets" },
      { value: "active", label: "Active" },
      { value: "completed", label: "Completed" },
    ],
    fields: [
      { value: "title", label: "Target Name" },
      { value: "targetType", label: "Target Type" },
      { value: "goalValue", label: "Goal Value" },
      { value: "achievedValue", label: "Achieved" },
      { value: "status", label: "Status" },
      { value: "assignedTo", label: "Assignee" },
      { value: "endDate", label: "End Date" },
    ],
    endpoint: "/targets",
    useTenantBase: true
  }
};
