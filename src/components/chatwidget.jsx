import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import VoiceButton from './VoiceMicButton';
import {
  Phone, MessageCircle, PhoneCall, Clock, CheckCircle, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// ─── Base API URL from environment ───────────────────────────────────────────
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

// ─── Logo Component ───────────────────────────────────────────────────────────
const AILogo = ({ size = "medium" }) => {
  const sizes = {
    micro: "w-3 h-3", xsmall: "w-4 h-4", small: "w-8 h-8",
    medium: "w-10 h-10", large: "w-12 h-12"
  };
  const robotDimensions = {
    micro: {
      headWidth: "w-4", headHeight: "h-3", bodyWidth: "w-4", bodyHeight: "h-2",
      eyeSize: "w-1 h-1", armWidth: "w-3", armheight: "h-2", buttonSize: "w-0.5 h-0.5",
      wheelWidth: "w-0.5", wheelHeight: "h-0.5", antennaTop: "-top-2",
      antennaSize: "w-0.5 h-1", antennaDotSize: "w-1 h-0.5", antennaDotTop: "-top-1.5",
      eyeSpace: "space-x-0.5", buttonSpace: "space-x-0.5", wheelSpace: "space-x-1"
    },
    xsmall: {
      headWidth: "w-4", headHeight: "h-3", bodyWidth: "w-4", bodyHeight: "h-3",
      eyeSize: "w-1 h-1", armWidth: "w-1.5", armHeight: "h-0.5", buttonSize: "w-0.5 h-0.5",
      wheelWidth: "w-1", wheelHeight: "h-0.5", antennaTop: "-top-1",
      antennaSize: "w-0.5 h-1", antennaDotSize: "w-0.5 h-0.5", antennaDotTop: "-top-2",
      eyeSpace: "space-x-1", buttonSpace: "space-x-0.5", wheelSpace: "space-x-2"
    },
    small: {
      headWidth: "w-5", headHeight: "h-3", bodyWidth: "w-5", bodyHeight: "h-3",
      eyeSize: "w-1 h-1", armWidth: "w-1.5", armHeight: "h-0.5", buttonSize: "w-0.5 h-0.5",
      wheelWidth: "w-1", wheelHeight: "h-0.5", antennaTop: "-top-1",
      antennaSize: "w-0.5 h-1", antennaDotSize: "w-0.5 h-0.5", antennaDotTop: "-top-2",
      eyeSpace: "space-x-1.5", buttonSpace: "space-x-1", wheelSpace: "space-x-2"
    },
    medium: {
      headWidth: "w-6", headHeight: "h-3", bodyWidth: "w-6", bodyHeight: "h-4",
      eyeSize: "w-1.5 h-1.5", armWidth: "w-2", armHeight: "h-0.5", buttonSize: "w-0.5 h-0.5",
      wheelWidth: "w-1", wheelHeight: "h-0.5", antennaTop: "-top-1.5",
      antennaSize: "w-0.5 h-1.5", antennaDotSize: "w-0.5 h-0.5", antennaDotTop: "-top-3",
      eyeSpace: "space-x-2", buttonSpace: "space-x-1", wheelSpace: "space-x-3"
    },
    large: {
      headWidth: "w-6", headHeight: "h-4", bodyWidth: "w-6", bodyHeight: "h-5",
      eyeSize: "w-2 h-2", armWidth: "w-3", armHeight: "h-0.5", buttonSize: "w-3 h-1",
      wheelWidth: "w-2", wheelHeight: "h-1", antennaTop: "-top-2",
      antennaSize: "w-0.5 h-1.5", antennaDotSize: "w-2 h-2", antennaDotTop: "-top-4",
      eyeSpace: "space-x-2.6", buttonSpace: "space-x-1", wheelSpace: "space-x-1"
    }
  };
  const dim = robotDimensions[size] || robotDimensions.medium;
  return (
    <div className={`${sizes[size]} relative`}>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full p-0.5 animate-spin-slow">
        <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
          <div className="relative">
            <div className={`${dim.headWidth} ${dim.headHeight} bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-lg relative`}>
              <div className={`absolute ${dim.antennaTop} left-1/2 transform -translate-x-1/2 ${dim.antennaSize} bg-purple-400`}></div>
              <div className={`absolute ${dim.antennaDotTop} left-1/2 transform -translate-x-1/2 ${dim.antennaDotSize} bg-purple-300 rounded-full animate-pulse`}></div>
              <div className={`flex justify-center ${dim.eyeSpace} pt-1`}>
                <div className={`${dim.eyeSize} bg-white rounded-full relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-blue-300 rounded-full animate-ping opacity-75"></div>
                </div>
                <div className={`${dim.eyeSize} bg-white rounded-full relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-blue-300 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
            <div className={`${dim.bodyWidth} ${dim.bodyHeight} bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-lg relative`}>
              <div className={`absolute -left-2 top-1 ${dim.armWidth} ${dim.armHeight} bg-gradient-to-r from-blue-500 to-purple-500 rounded-l-full animate-arm-wave-left`}></div>
              <div className={`absolute -right-2 top-1 ${dim.armWidth} ${dim.armHeight} bg-gradient-to-l from-pink-500 to-purple-500 rounded-r-full animate-arm-wave-right`}></div>
              <div className={`flex justify-center ${dim.buttonSpace} pt-1`}>
                <div className={`${dim.buttonSize} bg-green-400 rounded-full animate-pulse`} style={{ animationDelay: '0s' }}></div>
                <div className={`${dim.buttonSize} bg-yellow-400 rounded-full animate-pulse`} style={{ animationDelay: '0.3s' }}></div>
                <div className={`${dim.buttonSize} bg-red-400 rounded-full animate-pulse`} style={{ animationDelay: '0.6s' }}></div>
              </div>
            </div>
            <div className={`flex justify-center ${dim.wheelSpace} mt-0.5`}>
              <div className={`${dim.wheelWidth} ${dim.wheelHeight} bg-gray-400 rounded-full animate-spin-slow`}></div>
              <div className={`${dim.wheelWidth} ${dim.wheelHeight} bg-gray-400 rounded-full animate-spin-slow`} style={{ animationDirection: 'reverse' }}></div>
            </div>
          </div>
        </div>
      </div>
      {(size === 'medium' || size === 'large') && (
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 rounded-full blur-md opacity-30 animate-pulse"></div>
      )}
      {(size === 'medium' || size === 'large') && (
        <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
          <div className="flex space-x-0.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-0.5 h-0.5 bg-blue-300 rounded-full animate-trail" style={{ animationDelay: `${i * 0.1}s` }}></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Contact Picker Card (shown inside bot message when multiple matches) ─────
const ContactPickerCard = ({ matches, onPick }) => (
  <div className="mt-3 space-y-2">
    {matches.map((m) => (
      <div
        key={`${m.type}-${m.id}`}
        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 transition-colors"
      >
        <div className="flex-1 min-w-0 mr-3">
          {/* type badge */}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mr-2 ${
            m.type === 'lead'
              ? 'bg-green-100 text-green-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {m.type === 'lead' ? ' Lead' : ' Deal'}
          </span>
          <span className="text-xs font-semibold text-gray-800">{m.name}</span>
          {m.company && (
            <div className="text-xs text-gray-500 mt-0.5 truncate"> {m.company}</div>
          )}
          {m.phone && (
            <div className="text-xs text-gray-400 mt-0.5"> {m.phone}</div>
          )}
        </div>
        <button
          onClick={() => onPick(m)}
          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
        >
          <Phone className="w-3 h-3" />
          Call
        </button>
      </div>
    ))}
  </div>
);

// ─── Main ChatWidget ──────────────────────────────────────────────────────────
export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm Ziya, your Sales AI Assistant . I can help you with deals, leads, users, and analytics!",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState(null);
  const [callInProgress, setCallInProgress] = useState(null);
  const [liveDuration, setLiveDuration] = useState(0);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [callStartTime, setCallStartTime] = useState(null);

  const location  = useLocation();
  const navigate  = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const timerRef       = useRef(null);
  const heartbeatRef   = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized) inputRef.current?.focus();
  }, [isOpen, isMinimized]);

  // ── Visibility-change auto-tracking ──────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!callInProgress || !activeSessionId) return;

      if (document.visibilityState === 'hidden') {
        try {
          await fetch(`${API_BASE}/calllogs/track/${activeSessionId}/start`);
          setCallStartTime(Date.now());
          timerRef.current = setInterval(() => setLiveDuration(prev => prev + 1), 1000);
          heartbeatRef.current = setInterval(() => {
            fetch(`${API_BASE}/calllogs/track/${activeSessionId}/heartbeat`);
          }, 5000);
        } catch (err) { console.error('Track start failed:', err); }

      } else if (document.visibilityState === 'visible' && callStartTime) {
        try {
          const response = await fetch(`${API_BASE}/calllogs/track/${activeSessionId}/end`);
          const data = await response.json();

          if (timerRef.current) clearInterval(timerRef.current);
          if (heartbeatRef.current) clearInterval(heartbeatRef.current);

          if (data.success) {
            setMessages(prev => [...prev, {
              id: Date.now(),
              text: `Conversation ended — tracked ${formatDuration(data.duration)}`,
              sender: 'bot',
              timestamp: new Date(),
              sessionTracked: true,
              duration: data.duration
            }]);
            toast.success(`Session tracked — ${formatDuration(data.duration)}`);
          }

          setCallInProgress(null);
          setActiveSessionId(null);
          setCallStartTime(null);
          setLiveDuration(0);
        } catch (err) { console.error('Track end failed:', err); }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) clearInterval(timerRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [callInProgress, activeSessionId, callStartTime]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const toggleExpand = (messageId) => {
    setExpandedMessageId(expandedMessageId === messageId ? null : messageId);
  };

  // ── Core call initiator (shared by both paths) ────────────────────────────
  const initiateCallFromResult = (result) => {
    const sid = result.callLog?.sessionId;
    setActiveSessionId(sid);
    setCallInProgress(result);

    setMessages(prev => [...prev, {
      id: Date.now(),
      text: ` Ready to contact ${result.lead?.name}${result.lead?.company ? ` (${result.lead.company})` : ''}`,
      sender: 'bot',
      timestamp: new Date(),
      callData: result
    }]);

    const phoneNumber = result.lead?.phone || result.callLog?.phoneNumber;
    if (phoneNumber) {
      const msg        = encodeURIComponent('Hello, I am following up from CRM');
      const desktopUrl = `whatsapp://send?phone=${phoneNumber}&text=${msg}`;
      const webUrl     = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${msg}`;

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = desktopUrl;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 1000);

      setTimeout(() => {
        if (document.hasFocus()) {
          const shouldOpenWeb = window.confirm('WhatsApp Desktop not detected. Open WhatsApp Web instead?');
          if (shouldOpenWeb) window.open(webUrl, '_blank');
        }
      }, 500);

      toast.success('Opening WhatsApp...');
    }
  };

  // ── Called when user clicks "Call" on a picker card ───────────────────────
  const handlePickContact = async (contact) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/bot/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ contactId: contact.id, contactType: contact.type })
      });
      const result = await response.json();

      if (!result.success) {
        setMessages(prev => [...prev, {
          id: Date.now(), text: ` ${result.message}`,
          sender: 'bot', timestamp: new Date(), isError: true
        }]);
        return;
      }

      initiateCallFromResult(result);
    } catch (err) {
      console.error('Pick contact error:', err);
      toast.error('Failed to initiate call');
    } finally {
      setLoading(false);
    }
  };

  // ── Main call command handler ─────────────────────────────────────────────
  const handleCallCommand = async (command) => {
    if (!command.toLowerCase().startsWith('call ')) return false;

    const searchTerm = command.substring(5).trim();
    if (!searchTerm) {
      toast.error('Please specify a lead or company name');
      return true;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) { toast.error('Please login first'); return true; }

      const response = await fetch(`${API_BASE}/bot/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ command, type: 'call' })
      });
      const result = await response.json();

      if (!result.success) {
        setMessages(prev => [...prev, {
          id: Date.now(), text: ` ${result.message}`,
          sender: 'bot', timestamp: new Date(), isError: true
        }]);
        return true;
      }

      // ── Multiple matches → show picker inside bot message ─────────────────
      if (result.multipleMatches) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: result.message,
          sender: 'bot',
          timestamp: new Date(),
          pickerMatches: result.matches
        }]);
        return true;
      }

      // ── Single match → initiate immediately ───────────────────────────────
      initiateCallFromResult(result);

    } catch (error) {
      console.error('Call command error:', error);
      toast.error('Failed to process call command');
    } finally {
      setLoading(false);
    }

    return true;
  };
/* ── Send Message Handler ─────────────────────── */
  const sendMessage = async (text, forceGet = false) => {
    if (!text.trim()) return;

    if (text.toLowerCase().startsWith('call ')) {
      await handleCallCommand(text);
      setInputText('');
      return;
    }

    setMessages(prev => [...prev, { id: Date.now(), text, sender: 'user', timestamp: new Date() }]);
    setInputText('');
    setLoading(true);
    setIsTyping(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsTyping(false); setLoading(false);
        setMessages(prev => [...prev, { id: Date.now(), text: ' Please login to use ZIYA PULSE CRM.', sender: 'bot', timestamp: new Date() }]);
        return;
      }

      const lowerText    = text.toLowerCase().trim();
      const words        = text.split(' ').filter(w => w.length > 0);
      const originalWords = text.split(' ');
      let enhancedMessage = text;

      if (lowerText.includes('deals by') || lowerText.includes('handled by') || lowerText.includes('assigned to')) {
        enhancedMessage = text;
      } else if (lowerText.includes('leads by') || lowerText.includes('leads of')) {
        enhancedMessage = text;
      } else if (lowerText.startsWith('deal ') && !lowerText.includes('deals ')) {
        enhancedMessage = text;
      } else if (lowerText.startsWith('lead ') && !lowerText.includes('leads ')) {
        enhancedMessage = text;
      } else if (lowerText.includes('deals won') || (lowerText.includes('won') && lowerText.includes('deal'))) {
        enhancedMessage = 'deals won';
      } else if (lowerText.includes('deals lost') || (lowerText.includes('lost') && lowerText.includes('deal'))) {
        enhancedMessage = 'deals lost';
      } else if (lowerText.includes('open deals') || (lowerText.includes('open') && lowerText.includes('deal'))) {
        enhancedMessage = 'open deals';
      } else if (lowerText.includes('my deals') || lowerText === 'my deals') {
        enhancedMessage = 'my deals';
      } else if (lowerText.includes('hot leads') || (lowerText.includes('hot') && lowerText.includes('lead'))) {
        enhancedMessage = 'hot leads';
      } else if (lowerText.includes('warm leads') || (lowerText.includes('warm') && lowerText.includes('lead'))) {
        enhancedMessage = 'warm leads';
      } else if (lowerText.includes('cold leads') || (lowerText.includes('cold') && lowerText.includes('lead'))) {
        enhancedMessage = 'cold leads';
      } else if (lowerText.includes('my leads') || lowerText === 'my leads') {
        enhancedMessage = 'my leads';
      } else {
        const looksLikePersonName = (
          words.length >= 1 && words.length <= 3 &&
          originalWords.every(w => w.length > 0 && w[0] === w[0].toUpperCase()) &&
          !lowerText.includes('inc') && !lowerText.includes('corp') &&
          !lowerText.includes('ltd') && !lowerText.includes('llc')
        );
        if (looksLikePersonName) enhancedMessage = `deals by ${text}`;
      }

      const payload = { message: enhancedMessage, currentPage: location.pathname };
      const useGet  = forceGet || enhancedMessage.length < 40;

      const res = await fetch(
        useGet
          ? `${API_BASE}/ai/chat?${new URLSearchParams(payload)}`
          : `${API_BASE}/ai/chat`,
        {
          method: useGet ? 'GET' : 'POST',
          headers: { Authorization: `Bearer ${token}`, ...(useGet ? {} : { 'Content-Type': 'application/json' }) },
          body: useGet ? undefined : JSON.stringify(payload)
        }
      );
      const data = await res.json();
      await new Promise(r => setTimeout(r, 500));
      setIsTyping(false);

      setMessages(prev => [...prev, {
        id: Date.now(), text: data.message || 'No response',
        sender: 'bot', timestamp: new Date(),
        data: data.data || [], intent: data.intent
      }]);
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: Date.now(), text: ' Unable to connect to server.', sender: 'bot', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };
/* ── Submit Handler ─────────────────────── */
  const handleSubmit = (e) => { e.preventDefault(); sendMessage(inputText, false); };

  /* ── Quick Actions ─────────────────────── */
  const quickActions = [
    { label: " CALL",       query: "call " },
    { label: " Deals Won",  query: "deals won" },
    { label: " Deals Lost", query: "deals lost" },
    { label: " Open Deals", query: "open deals" },
    { label: " Hot Leads",  query: "hot leads" },
    { label: " Warm Leads", query: "warm leads" },
    { label: " Cold Leads", query: "cold leads" },
  ];

  // ── Floating button ───────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 z-50 group" aria-label="Open AI Assistant">
        <div className="relative">
          <AILogo size="large" />
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
        </div>
      </button>
    );
  }

  // ── Minimized bar ─────────────────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-slide-up">
        <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white cursor-pointer" onClick={() => setIsMinimized(false)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AILogo size="medium" />
              <div>
                <h3 className="font-semibold text-sm">ZIYA PULSE CRM</h3>
                <p className="text-xs text-blue-100 opacity-90">
                  {callInProgress ? 'Session tracking active...' : 'Click to expand • Ready to help'}
                </p>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1 hover:bg-white/20 rounded">✕</button>
          </div>
        </div>
        <div className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsMinimized(false)}>
          <div className="flex items-start space-x-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 text-xs">AI</span>
            </div>
            <p className="text-sm text-gray-600 truncate">
              {callInProgress
                ? `📱 WhatsApp session live — ${formatDuration(liveDuration)}`
                : messages[messages.length - 1]?.text || 'How can I help you today?'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Expanded chat window ──────────────────────────────────────────────────
  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-xl">
        <div className="flex items-center space-x-3">
          <AILogo size="medium" />
          <div>
            <h3 className="font-semibold">ZIYA PULSE CRM</h3>
            <p className="text-xs text-blue-100 opacity-90">
              {callInProgress ? 'WhatsApp session tracking...' : 'Connected to your CRM dashboard'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {callInProgress && (
            <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full text-xs flex items-center gap-1 mr-2">
              <Clock className="w-3 h-3 animate-pulse" />
              <span className="font-mono">{formatDuration(liveDuration)}</span>
            </div>
          )}
          <button onClick={() => setIsMinimized(true)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Minimize">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>
          </button>
          <button
            onClick={() => setMessages([{ id: 1, text: "Hello! I'm your ZIYA CRM Assistant. How can I help you today?", sender: 'bot', timestamp: new Date() }])}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Clear chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors" title="Close">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              message.sender === 'user'
                ? 'bg-blue-600 text-white rounded-br-none shadow-md'
                : message.isError
                  ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-none shadow-sm'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
            }`}>
              <div className="flex items-center mb-2">
                {message.sender === 'bot' && (
                  <div className="w-2 h-3 flex items-center justify-center mr-10">
                    <AILogo size="micro" />
                  </div>
                )}
                <span className="text-xs opacity-75 whitespace-nowrap">
                  {message.sender === 'user' ? 'You' : 'CRM Assistant'}
                </span>
                <span className="text-xs opacity-50 ml-2">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <p className="whitespace-pre-wrap mb-2">{message.text}</p>

              {/* Intent badges */}
              {message.intent === 'deals-by-salesperson' && <div className="text-xs mb-2 p-1 rounded bg-purple-100 text-purple-800 inline-block"> Deals by salesperson</div>}
              {message.intent === 'leads-by-salesperson' && <div className="text-xs mb-2 p-1 rounded bg-purple-100 text-purple-800 inline-block"> Leads by salesperson</div>}
              {message.intent === 'deal-search'           && <div className="text-xs mb-2 p-1 rounded bg-blue-100 text-blue-800 inline-block"> Specific deal search</div>}
              {message.intent === 'lead-search'           && <div className="text-xs mb-2 p-1 rounded bg-blue-100 text-blue-800 inline-block"> Specific lead search</div>}
              {message.intent === 'deals-by-company'      && <div className="text-xs mb-2 p-1 rounded bg-indigo-100 text-indigo-800 inline-block"> Deals by company</div>}
              {message.intent === 'leads-by-company'      && <div className="text-xs mb-2 p-1 rounded bg-indigo-100 text-indigo-800 inline-block"> Leads by company</div>}
              {message.intent === 'deals-won'             && <div className="text-xs mb-2 p-1 rounded bg-green-100 text-green-800 inline-block"> Won deals</div>}
              {message.intent === 'deals-lost'            && <div className="text-xs mb-2 p-1 rounded bg-red-100 text-red-800 inline-block"> Lost deals</div>}
              {message.intent === 'deals-open'            && <div className="text-xs mb-2 p-1 rounded bg-blue-100 text-blue-800 inline-block"> Open deals</div>}
              {message.intent === 'my-deals'              && <div className="text-xs mb-2 p-1 rounded bg-green-100 text-green-800 inline-block"> My deals</div>}
              {message.intent === 'leads-hot'             && <div className="text-xs mb-2 p-1 rounded bg-orange-100 text-orange-800 inline-block"> Hot leads</div>}
              {message.intent === 'leads-warm'            && <div className="text-xs mb-2 p-1 rounded bg-yellow-100 text-yellow-800 inline-block"> Warm leads</div>}
              {message.intent === 'leads-cold'            && <div className="text-xs mb-2 p-1 rounded bg-blue-100 text-blue-800 inline-block"> Cold leads</div>}
              {message.intent === 'my-leads'              && <div className="text-xs mb-2 p-1 rounded bg-green-100 text-green-800 inline-block"> My leads</div>}

              {/* ── Multiple matches picker ── */}
              {message.pickerMatches && (
                <ContactPickerCard
                  matches={message.pickerMatches}
                  onPick={handlePickContact}
                />
              )}

              {/* ── Single call buttons (inside bubble) ── */}
              {message.callData && message.callData.lead && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-800 mb-2 flex items-center gap-1">
                    <PhoneCall className="w-3 h-3" />
                    {message.callData.lead.name}{message.callData.lead.company ? ` · ${message.callData.lead.company}` : ''}
                  </p>
                  <div className="flex gap-2">
                    <a href={message.callData.whatsappUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors">
                      <MessageCircle className="w-3 h-3" /> WHATSAPP
                    </a>
                    <a href={message.callData.dialerUrl}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors">
                      <Phone className="w-3 h-3" /> PHONE
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    WhatsApp session time is auto-tracked when you return
                  </p>
                </div>
              )}

              {/* Session tracked */}
              {message.sessionTracked && (
                <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Conversation  session · {formatDuration(message.duration)}
                </div>
              )}

              {/* Data list (leads / deals) */}
              {message.data && Array.isArray(message.data) && message.data.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs font-medium mb-2 text-gray-600">
                     Found {message.data.length} {message.intent?.includes('lead') ? 'leads' : 'deals'}:
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {(expandedMessageId === message.id ? message.data : message.data.slice(0, 5)).map((item, idx) => {
                      const isDeal      = item.stage || item.value;
                      const statusText  = isDeal ? item.stage : item.status;
                      const badgeColor  =
                        statusText?.toLowerCase().includes('won')  ? 'bg-green-100 text-green-800' :
                        statusText?.toLowerCase().includes('lost') || statusText?.toLowerCase().includes('junk') ? 'bg-red-100 text-red-800' :
                        statusText?.toLowerCase().includes('hot')  ? 'bg-red-100 text-red-800' :
                        statusText?.toLowerCase().includes('warm') ? 'bg-yellow-100 text-yellow-800' :
                        statusText?.toLowerCase().includes('cold') ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800';
                      return (
                        <div key={item._id || idx} className="text-xs p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 transition-colors">
                          <div className="font-semibold truncate mb-1 flex items-center justify-between">
                            <span>{item.name || item.leadName || item.dealName || `Record ${idx + 1}`}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${badgeColor}`}>{statusText}</span>
                          </div>
                          {(item.company || item.companyName) && <div className="text-gray-600 mb-1"> {item.company || item.companyName}</div>}
                          {(item.phone  || item.phoneNumber)  && <div className="text-gray-600 mb-1"> {item.phone  || item.phoneNumber}</div>}
                          {item.value && <div className="text-green-600 font-medium mb-1"> ${Number(item.value).toLocaleString()}</div>}
                          <div className="text-gray-600 mt-2 pt-2 border-t border-gray-200">
                            <span className="font-medium"> Handled by: </span>
                            <span className="text-blue-600">
                              {item.handledBy || item.owner ||
                                (item.assignTo ? `${item.assignTo.firstName} ${item.assignTo.lastName}` : 'Unassigned')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {message.data.length > 5 && (
                      <div className="text-center">
                        <button onClick={() => toggleExpand(message.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium py-2 px-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                          {expandedMessageId === message.id
                            ? 'Show less'
                            : `View all ${message.data.length} ${message.intent?.includes('lead') ? 'leads' : 'deals'}`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl p-4 bg-white border border-gray-200 rounded-bl-none shadow-sm">
              <div className="flex items-center space-x-2">
                <AILogo size="xsmall" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-t border-gray-200 bg-white">
        <div className="text-xs text-gray-500 mb-2 font-medium">Quick actions:</div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, idx) => (
            <button key={idx}
              onClick={() => {
                if (action.query === 'call ') { setInputText('call '); inputRef.current?.focus(); }
                else sendMessage(action.query);
              }}
              className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors border border-blue-100 flex items-center space-x-1"
            >
              <span>{action.label.split(' ')[0]}</span>
              <span className="hidden sm:inline">{action.label.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about CRM data or type 'call company'..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            disabled={loading}
          />
          <VoiceButton
            onCommand={(text) => sendMessage(text)}
            onNavigationSuccess={(message) => setMessages(prev => [...prev, { id: Date.now(), text: message, sender: 'bot', timestamp: new Date() }])}
            onTranscript={(text) => {
              setInputText(text);
              setTimeout(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(text.length, text.length); }, 100);
            }}
            navigate={navigate}
          />
          <button type="submit" disabled={loading || !inputText.trim()}
            className="px-3 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.94 2.34L18 10 2.94 17.66 4.5 11l7.5-1-7.5-1-1.56-6.66z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}