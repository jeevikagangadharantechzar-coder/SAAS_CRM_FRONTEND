


const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const headers = () => ({
  "Content-Type": "application/json",
  ...(localStorage.getItem("token")
    ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
    : {}),
});

// ── Conversations ────────────────────────────────────────────────────────────
export const fetchConversations = async (page = 1, search = "") => {
  const res = await fetch(
    `${BASE}/whatsapp/conversations?page=${page}&limit=30&search=${encodeURIComponent(search)}`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error("Failed to fetch conversations");
  return res.json();
};

// ── Messages ─────────────────────────────────────────────────────────────────
export const fetchMessages = async (contactNumber, page = 1) => {
  const res = await fetch(
    `${BASE}/whatsapp/messages/${encodeURIComponent(contactNumber)}?page=${page}&limit=50`,
    { headers: headers() }
  );
  if (!res.ok) throw new Error("Failed to fetch messages");
  return res.json();
};

// ── Send ──────────────────────────────────────────────────────────────────────
export const sendWhatsappMessage = async (to, body) => {
  const res = await fetch(`${BASE}/whatsapp/send`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ to, body }),
  });
  if (!res.ok) {
    const err = await res.json();
    const error = new Error(err.message || "Failed to send message");
    error.tip = err.tip || null;
    error.twilioCode = err.twilioCode || null;
    throw error;
  }
  return res.json();
};

export const sendWhatsappTemplate = async (to, contentSid, variables = {}) => {
  const res = await fetch(`${BASE}/whatsapp/send-template`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ to, contentSid, variables }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to send template");
  }
  return res.json();
};

export const sendWhatsappMedia = async (to, body, mediaUrl) => {
  const res = await fetch(`${BASE}/whatsapp/send-media`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ to, body, mediaUrl }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Failed to send media");
  }
  return res.json();
};

// ── Update conversation ───────────────────────────────────────────────────────
export const updateConversationApi = async (id, data) => {
  const res = await fetch(`${BASE}/whatsapp/conversations/${id}`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update conversation");
  return res.json();
};

// ── Unread count ─────────────────────────────────────────────────────────────
export const fetchUnreadCount = async () => {
  const res = await fetch(`${BASE}/whatsapp/unread-count`, { headers: headers() });
  if (!res.ok) return { unreadCount: 0 };
  return res.json();
};//original