import { createContext, useContext, useEffect, useReducer, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import {
  fetchConversations,
  fetchMessages,
  sendWhatsappMessage,
  sendWhatsappTemplate,
  sendWhatsappMedia,
  fetchUnreadCount,
  updateConversationApi,
} from "../services/whatsapp.service.js";

// ── State ────────────────────────────────────────────────────────────────────
const initialState = {
  conversations: [],
  totalConversations: 0,
  activeConversation: null,
  messages: [],
  loadingConversations: false,
  loadingMessages: false,
  sendingMessage: false,
  unreadCount: 0,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload, loadingConversations: false };
    case "PREPEND_CONVERSATIONS":
      return { ...state, conversations: [...action.payload, ...state.conversations] };
    case "SET_TOTAL":
      return { ...state, totalConversations: action.payload };
    case "LOADING_CONV":
      return { ...state, loadingConversations: true };
    case "SET_ACTIVE":
      return { ...state, activeConversation: action.payload, messages: [] };
    case "SET_MESSAGES":
      return { ...state, messages: action.payload, loadingMessages: false };
    case "LOADING_MSG":
      return { ...state, loadingMessages: true };
    case "APPEND_MESSAGE":
      // avoid duplicates
      if (state.messages.find((m) => m._id === action.payload._id)) return state;
      return { ...state, messages: [...state.messages, action.payload] };
    case "UPDATE_MESSAGE_STATUS":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.messageSid === action.payload.messageSid
            ? { ...m, status: action.payload.status }
            : m
        ),
      };
    case "UPSERT_CONVERSATION": {
      const exists = state.conversations.find(
        (c) => c.contactNumber === action.payload.contactNumber
      );
      if (exists) {
        return {
          ...state,
          conversations: state.conversations
            .map((c) =>
              c.contactNumber === action.payload.contactNumber
                ? {
                    ...c,
                    lastMessage: action.payload.body,
                    lastMessageAt: action.payload.createdAt,
                    lastMessageDirection: action.payload.direction,
                    unreadCount:
                      action.payload.direction === "inbound" &&
                      state.activeConversation?.contactNumber !== action.payload.contactNumber
                        ? (c.unreadCount || 0) + 1
                        : c.unreadCount,
                    contactName:
                      action.payload.contactName || c.contactName,
                  }
                : c
            )
            .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)),
        };
      }
      // New conversation — prepend
      return {
        ...state,
        conversations: [
          {
            contactNumber: action.payload.contactNumber,
            contactName: action.payload.contactName || action.payload.contactNumber,
            lastMessage: action.payload.body,
            lastMessageAt: action.payload.createdAt,
            lastMessageDirection: action.payload.direction,
            unreadCount: 1,
            _id: action.payload.conversationId,
          },
          ...state.conversations,
        ],
      };
    }
    case "MARK_READ":
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.contactNumber === action.payload ? { ...c, unreadCount: 0 } : c
        ),
      };
    case "SET_UNREAD":
      return { ...state, unreadCount: action.payload };
    case "SENDING":
      return { ...state, sendingMessage: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loadingConversations: false, loadingMessages: false };
    default:
      return state;
  }
}

// ── Context ──────────────────────────────────────────────────────────────────
const WhatsappContext = createContext(null);

export const WhatsappProvider = ({ children, userId, socketUri }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);

  // ── Socket setup ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socketUri) {
      console.warn(" socketUri not provided, real-time updates disabled");
      return;
    }
    const socket = io(socketUri, {
      auth: { userId },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🔌 Socket connected");
    });

    socket.on("connect_error", (err) => {
      console.error(" Socket connection error:", err.message);
    });

    socket.on("whatsapp_new_message", (msg) => {
      dispatch({ type: "UPSERT_CONVERSATION", payload: msg });
      // Update global unread badge
      loadUnreadCount(); // or increment optimistically
    });

    socket.on("whatsapp_message_sent", (msg) => {
      dispatch({ type: "APPEND_MESSAGE", payload: msg });
      dispatch({ type: "UPSERT_CONVERSATION", payload: msg });
    });

    socket.on("whatsapp_status_update", (data) => {
      dispatch({ type: "UPDATE_MESSAGE_STATUS", payload: data });
    });

    return () => socket.disconnect();
  }, [socketUri, userId]);

  // Append inbound to message list if conversation is open
  useEffect(() => {
    if (!socketRef.current) return;
    const handler = (msg) => {
      if (
        state.activeConversation &&
        msg.contactNumber === state.activeConversation.contactNumber
      ) {
        dispatch({ type: "APPEND_MESSAGE", payload: msg });
      }
    };
    socketRef.current.on("whatsapp_new_message", handler);
    return () => socketRef.current?.off("whatsapp_new_message", handler);
  }, [state.activeConversation]);

  // ── Load conversations ──────────────────────────────────────────────────
  const loadConversations = useCallback(async (search = "") => {
    dispatch({ type: "LOADING_CONV" });
    try {
      const data = await fetchConversations(1, search);
      dispatch({ type: "SET_CONVERSATIONS", payload: data.conversations });
      dispatch({ type: "SET_TOTAL", payload: data.total });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  // ── Open a conversation ─────────────────────────────────────────────────
  const openConversation = useCallback(async (conv) => {
    dispatch({ type: "SET_ACTIVE", payload: conv });
    dispatch({ type: "LOADING_MSG" });
    dispatch({ type: "MARK_READ", payload: conv.contactNumber });
    try {
      const data = await fetchMessages(conv.contactNumber);
      dispatch({ type: "SET_MESSAGES", payload: data.messages });
    } catch (err) {
      dispatch({ type: "SET_ERROR", payload: err.message });
    }
  }, []);

  // ── Send text ───────────────────────────────────────────────────────────
  const sendText = useCallback(async (to, body) => {
    dispatch({ type: "SENDING", payload: true });
    try {
      const res = await sendWhatsappMessage(to, body);
      dispatch({ type: "APPEND_MESSAGE", payload: res.message });
      dispatch({
        type: "UPSERT_CONVERSATION",
        payload: { ...res.message, direction: "outbound" },
      });
    } finally {
      dispatch({ type: "SENDING", payload: false });
    }
  }, []);

  // ── Send template ───────────────────────────────────────────────────────
  const sendTemplate = useCallback(async (to, contentSid, variables) => {
    dispatch({ type: "SENDING", payload: true });
    try {
      await sendWhatsappTemplate(to, contentSid, variables);
    } finally {
      dispatch({ type: "SENDING", payload: false });
    }
  }, []);

  // ── Send media ──────────────────────────────────────────────────────────
  const sendMedia = useCallback(async (to, body, mediaUrl) => {
    dispatch({ type: "SENDING", payload: true });
    try {
      const res = await sendWhatsappMedia(to, body, mediaUrl);
      dispatch({ type: "APPEND_MESSAGE", payload: res.message });
    } finally {
      dispatch({ type: "SENDING", payload: false });
    }
  }, []);

  // ── Update conversation name ────────────────────────────────────────────
  const updateConversation = useCallback(async (id, data) => {
    const updated = await updateConversationApi(id, data);
    dispatch({
      type: "SET_CONVERSATIONS",
      payload: state.conversations.map((c) =>
        c._id === id ? { ...c, ...updated } : c
      ),
    });
  }, [state.conversations]);

  // ── Load unread count ───────────────────────────────────────────────────
  const loadUnreadCount = useCallback(async () => {
    const data = await fetchUnreadCount();
    dispatch({ type: "SET_UNREAD", payload: data.unreadCount });
  }, []);

  useEffect(() => {
    loadConversations();
    loadUnreadCount();
  }, []);

  return (
    <WhatsappContext.Provider
      value={{
        ...state,
        loadConversations,
        openConversation,
        sendText,
        sendTemplate,
        sendMedia,
        updateConversation,
        loadUnreadCount,
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
};

export const useWhatsapp = () => {
  const ctx = useContext(WhatsappContext);
  if (!ctx) throw new Error("useWhatsapp must be used inside WhatsappProvider");
  return ctx;
};


