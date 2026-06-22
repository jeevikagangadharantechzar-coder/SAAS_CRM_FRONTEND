// Voice Assistant functionality for React (Web)
import React, { useState, useEffect, useRef } from 'react';

const VoiceButton = ({ onCommand, onTranscript, navigate, onNavigationSuccess }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [feedback, setFeedback] = useState('');

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const isVoiceActive = useRef(false);

  // Initialize speech recognition only once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        // Only process if voice is active
        if (!isVoiceActive.current) return;

        const currentTranscript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setTranscript(currentTranscript);

        if (event.results[0].isFinal) {
          setFeedback(`"${currentTranscript}"`);
          setTimeout(() => setFeedback(''), 2000);

          if (onTranscript) onTranscript(currentTranscript);
          handleVoiceCommand(currentTranscript);
          setIsListening(false);
          isVoiceActive.current = false;
        }
      };

      recognition.onerror = (event) => {
        if (!isVoiceActive.current) return;

        console.error('Speech recognition error:', event.error);
        setFeedback(`Error: ${event.error}`);
        setTimeout(() => setFeedback(''), 3000);
        setIsListening(false);
        isVoiceActive.current = false;
      };

      recognition.onend = () => {
        if (isVoiceActive.current) {
          setIsListening(false);
          isVoiceActive.current = false;
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech recognition not supported');
      setFeedback('Voice not supported');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Handle all voice commands
  const handleVoiceCommand = (text) => {
    const lowerText = text.toLowerCase().trim();

    // Fix common misrecognitions
    const command = lowerText
      .replace(/street|streets|streat|striat/gi, 'streak')
      .replace(/leed|leeds/gi, 'lead')
      .replace(/dell|dells/gi, 'deal')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('🎤 Processing voice command:', command);
    // ===== CREATE LEAD COMMAND =====
    if (
      command.includes('create lead') ||
      command.includes('create a lead') ||
      command.includes('new lead') ||
      command.includes('add lead') ||
      command.includes('make lead') ||
      command.includes('generate lead')
    ) {
      if (navigate) {
        console.log(' Navigating to: /createleads');
        navigate('/createleads');
        speak('Opening create lead page');

        if (onNavigationSuccess) {
          onNavigationSuccess('Opening Create Lead page');
        }
      }
      return;
    }
    // ===== CREATE DEAL COMMAND =====
    if (
      command.includes('create deal') ||
      command.includes('create a deal') ||
      command.includes('new deal') ||
      command.includes('add deal') ||
      command.includes('make deal') ||
      command.includes('generate deal')
    ) {
      if (navigate) {
        console.log(' Navigating to: /createdeal');
        navigate('/createdeal');
        speak('Opening create deal page');

        if (onNavigationSuccess) {
          onNavigationSuccess('Opening Create Deal page');
        }
      }
      if (
        command.includes('deal metrics') ||
        command.includes('deals metrics') ||
        (command.includes('deal') && command.includes('metrics'))
      ) {
        if (navigate) {
          console.log(' Navigating to: /DealAnalysis (Deal Metrics)');
          navigate('/DealAnalysis');
          speak('Opening Deal Metrics');
          if (onNavigationSuccess) {
            onNavigationSuccess('Opening Deal Metrics page');
          }
        }
        return;
      }

      if (
        command.includes('loss analysis') ||
        command.includes('analyze losses') ||
        (command.includes('loss') && command.includes('analysis'))
      ) {
        if (navigate) {
          console.log(' Navigating to: /LossAnalysis (Loss Analysis)');
          navigate('/LossAnalysis');
          speak('Opening Loss Analysis');
          if (onNavigationSuccess) {
            onNavigationSuccess('Opening Loss Analysis page');
          }
        }
        return;
      }

      if (
        command.includes('won analysis') ||
        command.includes('wins analysis') ||
        (command.includes('won') && command.includes('analysis'))
      ) {
        if (navigate) {
          console.log(' Navigating to: /cltv/dashboard (Won Analysis)');
          navigate('/cltv/dashboard');
          speak('Opening Won Analysis');
          if (onNavigationSuccess) {
            onNavigationSuccess('Opening Won Analysis page');
          }
        }
        return;
      }

      if (
        command.includes('email campaign') ||
        command.includes('mass email') ||
        command.includes('campaign') ||
        (command.includes('email') && !command.includes('proposal') && !command.includes('invoice'))
      ) {
        if (navigate) {
          console.log(' Navigating to: /mass-email (Email Campaign)');
          navigate('/mass-email');
          speak('Opening Email Campaign');
          if (onNavigationSuccess) {
            onNavigationSuccess('Opening Email Campaign page');
          }
        }
        return;
      }
    }

    // ===== NAVIGATION COMMANDS =====
    if (command.includes('go to') || command.includes('open') || command.includes('navigate') || command.includes('show')) {
      let page = command
        .replace('go to', '')
        .replace('open', '')
        .replace('navigate to', '')
        .replace('show', '')
        .replace('me', '')
        .trim();

      page = page.replace(/[^\w\s]/gi, '').trim();

      // Route mapping (same as before)
      const routes = {
        'admin': { path: '/dashboard', name: 'Admin Dashboard' },
        'admin dashboard': { path: '/dashboard', name: 'Admin Dashboard' },
        'dashboard': { path: '/dashboard', name: 'Dashboard' },
        'deals': { path: '/deals', name: 'Deals' },
        'deal': { path: '/deals', name: 'Deals' },
        'leads': { path: '/leads', name: 'Leads' },
        'lead': { path: '/leads', name: 'Leads' },
        'streak': { path: '/leaderboard', name: 'Streak Leaderboard' },
        'leaderboard': { path: '/leaderboard', name: 'Leaderboard' },
        'invoice': { path: '/invoices', name: 'Invoices' },
        'invoices': { path: '/invoices', name: 'Invoices' },
        'proposal': { path: '/proposal', name: 'Proposals' },
        'proposals': { path: '/proposal', name: 'Proposals' },
        'calendar': { path: '/calendar', name: 'Calendar' },
        'activity': { path: '/list', name: 'Activities' },
        'tasks': { path: '/list', name: 'Tasks' },
        'users': { path: 'user&roles', name: 'User Management' },
        'user roles': { path: 'user&roles', name: 'User Roles' },
        'reports': { path: '/team-analytics       ', name: 'Reports' },
        'pipeline': { path: '/Pipelineview', name: 'Pipeline View' },
        'deal metrics': { path: '/DealAnalysis', name: 'Deal Metrics' },
        'deals metrics': { path: '/DealAnalysis', name: 'Deal Metrics' },
        'metrics': { path: '/DealAnalysis', name: 'Deal Metrics' },
        'loss analysis': { path: '/LossAnalysis', name: 'Loss Analysis' },
        'loss': { path: '/LossAnalysis', name: 'Loss Analysis' },
        'analyze losses': { path: '/LossAnalysis', name: 'Loss Analysis' },
        'won analysis': { path: '/cltv/dashboard', name: 'Won Analysis' },
        'wins analysis': { path: '/cltv/dashboard', name: 'Won Analysis' },
        'won': { path: '/cltv/dashboard', name: 'Won Analysis' },
        'email campaign': { path: '/mass-email', name: 'Email Campaign' },
        'mass email': { path: '/mass-email', name: 'Email Campaign' },
        'campaign': { path: '/mass-email', name: 'Email Campaign' },
        'email': { path: '/mass-email', name: 'Email Campaign' }
      };

      const pageNoSpaces = page.replace(/\s+/g, '');
      let matchedRoute = null;
      let matchedName = '';

      if (routes[page]) {
        matchedRoute = routes[page].path;
        matchedName = routes[page].name;
      } else if (routes[pageNoSpaces]) {
        matchedRoute = routes[pageNoSpaces].path;
        matchedName = routes[pageNoSpaces].name;
      } else {
        for (const [keyword, routeInfo] of Object.entries(routes)) {
          if (page.includes(keyword) || pageNoSpaces.includes(keyword)) {
            matchedRoute = routeInfo.path;
            matchedName = routeInfo.name;
            break;
          }
        }
      }

      if (matchedRoute && navigate) {
        console.log(' Navigating to:', matchedRoute);
        navigate(matchedRoute);
        speak(`Opening ${matchedName}`);

        if (onNavigationSuccess) {
          onNavigationSuccess(`Opening ${matchedName} page`);
        }
        return;
      }
    }
    // ===== For all other commands, pass to chat =====
    if (onCommand) {
      onCommand(text);
    }
  };

  /* ── Speak Function ─────────────────────── */
  const speak = (text) => {
    if (synthRef.current) {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      synthRef.current.speak(utterance);
    }
  };

  /* ── Request Microphone Permission ─────────────────────── */
  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      setFeedback('Microphone permission required');
      setTimeout(() => setFeedback(''), 3000);
      return false;
    }
  };

  /* ── Start Listening ─────────────────────── */
  const startListening = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in your browser');
      return;
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      alert('Microphone permission is required for voice input');
      return;
    }

    try {
      setTranscript('');
      setIsListening(true);
      isVoiceActive.current = true; 
      recognitionRef.current.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      isVoiceActive.current = false;
    }
  };

/* ── Stop Listening ─────────────────────── */
  const stopListening = () => {
    if (recognitionRef.current && isVoiceActive.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      isVoiceActive.current = false;
    }
  };

  /* ── Wave Animation ─────────────────────── */
  const WaveAnimation = () => (
    <div className="flex items-center justify-center space-x-0.5">
      {[0, 1, 2, 3].map((index) => (
        <div
          key={index}
          className="w-1 bg-white rounded-full"
          style={{
            height: '12px',
            animation: `wave 0.7s ease-in-out infinite`,
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (isListening) {
            stopListening();
          } else {
            startListening();
          }
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          w-10 h-10 rounded-full flex items-center justify-center
          transition-all duration-300
          ${isListening
            ? 'bg-red-500 text-white scale-110'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105'
          }
    focus:outline-none focus:ring-2 focus:ring-blue-300
  `}
      >
        {isListening ? <WaveAnimation /> : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>

      {isListening && (
        <>
          <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping" style={{ animationDelay: '0.2s' }}></div>
        </>
      )}

      {isListening && transcript && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
            {transcript}
          </div>
        </div>
      )}

      {isListening && !transcript && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-2">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
            <span>Listening...</span>
          </div>
        </div>
      )}

      {feedback && !isListening && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-green-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
            {feedback}
          </div>
        </div>
      )}

      {showTooltip && !isListening && !feedback && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg">
            Click mic to speak
          </div>
        </div>
      )}

      <style>{`
        @keyframes wave {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  );
};

export default VoiceButton;