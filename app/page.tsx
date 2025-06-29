"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";
import { startCall, endCall, toggleMute } from "@/lib/callFunctions";
import {
  Role,
  Transcript,
  UltravoxExperimentalMessageEvent,
} from "ultravox-client";
import { PhoneOffIcon, User, Phone, Calendar, Clock, MapPin, ExternalLink, Mic, MicOff } from "lucide-react";
import MicToggleButton from "./components/MicToggleButton";
import demoConfig from "./demo-config";

// Button Component for Actions
const ActionButton = ({ text, url, type, onClick }) => {
  const getButtonStyle = (type) => {
    switch (type) {
      case 'assessment':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'booking':
        return 'bg-green-600 hover:bg-green-700 text-white';
      case 'selfhelp':
        return 'bg-purple-600 hover:bg-purple-700 text-white';
      default:
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    }
  };

  const handleClick = () => {
    if (onClick) onClick();
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors ${getButtonStyle(type)} w-full`}
    >
      <span>{text}</span>
      <ExternalLink className="w-4 h-4 ml-2" />
    </button>
  );
};

// API Service
const apiService = {
  baseUrl: "https://staging-api.cadabams.com",
  
  async createLead(contactName, callerMobile, callerZip = "", userId = 1) {
    try {
      const response = await fetch(`${this.baseUrl}/create-chat-lead`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: callerMobile,
          contact_name: contactName,
          caller_zip: callerZip,
          country_code: 91,
          user_id: userId,
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create lead");
      }
      
      return data;
    } catch (error) {
      console.error("Create lead error:", error);
      throw error;
    }
  },
  
  async getUpcomingAppointments(phoneNumber, userId = 1) {
    try {
      const response = await fetch(
        `${this.baseUrl}/upcoming-appointments/${phoneNumber}?user_id=${userId}`
      );
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch appointments");
      }
      
      return data;
    } catch (error) {
      console.error("Get appointments error:", error);
      throw error;
    }
  }
};

// User Details Form Component
const UserDetailsForm = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    zipCode: "",
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(formData.mobile.replace(/\D/g, ""))) {
      newErrors.mobile = "Mobile number must be 10 digits";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        mobile: formData.mobile.replace(/\D/g, ""),
        zipCode: formData.zipCode.trim(),
      });
    }
  };

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setFormData({ ...formData, mobile: value });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            Welcome to Cadabams MindTalk
          </h2>
          <p className="text-gray-600 text-sm md:text-base">
            Please provide your details to start your mental health consultation
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your full name"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.name ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mobile Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="tel"
                value={formData.mobile}
                onChange={handleMobileChange}
                placeholder="Enter 10-digit mobile number"
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.mobile ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>
            {errors.mobile && (
              <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ZIP Code (Optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={formData.zipCode}
                onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                placeholder="Enter your ZIP code"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Setting up..." : "Start Mental Health Consultation"}
          </button>
        </form>
      </div>
    </div>
  );
};

// Appointment Card Component
const AppointmentCard = ({ appointment }) => {
  if (!appointment) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="text-center">
          <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 text-sm">No upcoming appointments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
      <div className="flex items-start space-x-3">
        <Calendar className="w-5 h-5 text-blue-600 mt-1" />
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-2">Upcoming Appointment</h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{appointment.startDateTime}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span>{appointment.doctor}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span>{appointment.campus}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                appointment.consultationType === 'virtual' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {appointment.consultationType === 'virtual' ? 'Virtual' : 'In-Person'}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                appointment.status === 'booked' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {appointment.status}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Message Component for Transcript
const MessageBubble = ({ message, isUser, timestamp, buttons }) => {
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`px-4 py-2 rounded-lg ${
          isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-900'
        }`}>
          <p className="text-sm">{message}</p>
          {timestamp && (
            <p className={`text-xs mt-1 ${
              isUser ? 'text-blue-100' : 'text-gray-500'
            }`}>
              {timestamp}
            </p>
          )}
        </div>
        
        {buttons && buttons.length > 0 && (
          <div className="mt-3 space-y-2">
            {buttons.map((button, index) => (
              <ActionButton
                key={index}
                text={button.text}
                url={button.url}
                type={button.type}
                onClick={() => console.log(`Button clicked: ${button.type}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Conversation Notes Component
const ConversationNotes = ({ consultationData, messages, callHistory }) => {
  const getConversationSummary = () => {
    const userMessages = messages.filter(msg => msg.isUser).length;
    const aiMessages = messages.filter(msg => !msg.isUser).length;
    return { userMessages, aiMessages, totalMessages: messages.length };
  };

  const summary = getConversationSummary();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
      <h3 className="text-lg font-semibold mb-4 text-orange-600 border-b border-orange-200 pb-2">
        Consultation Notes
      </h3>

      <div className="space-y-4">
        {/* Conversation Overview */}
        <div>
          <h4 className="font-medium text-orange-600 mb-2">Session Overview</h4>
          <div className="bg-orange-50 p-3 rounded-lg text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>Total Messages: {summary.totalMessages}</div>
              <div>User Messages: {summary.userMessages}</div>
              <div>AI Responses: {summary.aiMessages}</div>
            </div>
            <div className="mt-2">
              Stage: <span className="font-medium">{consultationData.conversationStage}</span>
            </div>
          </div>
        </div>

        {/* Current Mood Assessment */}
        {consultationData.userMood && (
          <div>
            <h4 className="font-medium text-orange-600 mb-2">Current Mood Assessment</h4>
            <div className="bg-orange-50 p-3 rounded-lg">
              <span className="text-sm font-medium">{consultationData.userMood}</span>
            </div>
          </div>
        )}

        {/* Reported Concerns */}
        <div>
          <h4 className="font-medium text-orange-600 mb-2">Reported Concerns & Symptoms</h4>
          <div className="space-y-2">
            {consultationData.symptoms && consultationData.symptoms.length > 0 ? (
              consultationData.symptoms.map((symptom, index) => (
                <div key={index} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="font-medium text-gray-900 mb-1">
                    {symptom.symptom}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {symptom.duration && (
                      <div><span className="font-medium">Duration:</span> {symptom.duration}</div>
                    )}
                    {symptom.severity && (
                      <div><span className="font-medium">Severity:</span> {symptom.severity}</div>
                    )}
                    {symptom.triggers && (
                      <div><span className="font-medium">Triggers:</span> {symptom.triggers}</div>
                    )}
                    {symptom.impact && (
                      <div><span className="font-medium">Impact:</span> {symptom.impact}</div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm italic bg-gray-50 p-3 rounded-lg">
                No specific concerns reported yet
              </div>
            )}
          </div>
        </div>

        {/* Support Offered */}
        {consultationData.supportOffered && consultationData.supportOffered.length > 0 && (
          <div>
            <h4 className="font-medium text-orange-600 mb-2">Support Options Discussed</h4>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="space-y-1">
                {consultationData.supportOffered.map((support, index) => (
                  <div key={index} className="text-sm text-gray-700 flex items-start">
                    <span className="text-orange-500 mr-2">•</span>
                    <span>{support}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Key Conversation Points */}
        {messages.length > 0 && (
          <div>
            <h4 className="font-medium text-orange-600 mb-2">Key Conversation Points</h4>
            <div className="bg-orange-50 p-3 rounded-lg max-h-32 overflow-y-auto">
              <div className="space-y-2">
                {messages.slice(-5).map((msg, index) => (
                  <div key={index} className="text-xs">
                    <span className={`font-medium ${msg.isUser ? 'text-blue-600' : 'text-green-600'}`}>
                      {msg.isUser ? 'User' : 'Dr. Riya'}:
                    </span>
                    <span className="ml-2 text-gray-700">
                      {msg.text.length > 100 ? `${msg.text.substring(0, 100)}...` : msg.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Call History */}
        {callHistory.length > 0 && (
          <div>
            <h4 className="font-medium text-orange-600 mb-2">Session History</h4>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="space-y-2">
                {callHistory.map((session, index) => (
                  <div key={index} className="text-sm text-gray-700 border-b border-orange-200 pb-2 last:border-b-0">
                    <div className="font-medium">Session {index + 1}</div>
                    <div className="text-xs text-gray-600">
                      {session.date} • Duration: {session.duration} • Messages: {session.messageCount}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SearchParamsContent = ({ children }) => {
  const searchParams = useSearchParams();
  const showMuteSpeakerButton = searchParams.get("showSpeakerMute") === "true";
  const showDebugMessages = searchParams.get("showDebugMessages") === "true";
  const showUserTranscripts = searchParams.get("showUserTranscripts") === "true";
  let modelOverride;

  if (searchParams.get("model")) {
    modelOverride = "fixie-ai/" + searchParams.get("model");
  }

  return children({
    showMuteSpeakerButton,
    modelOverride,
    showDebugMessages,
    showUserTranscripts,
  });
};

const SearchParamsHandler = (props) => {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="max-w-[1206px] mx-auto w-full py-5 pl-5 pr-[10px] border border-[#2A2A2A] rounded-[3px]">
            Loading...
          </div>
        </div>
      }
    >
      <SearchParamsContent {...props} />
    </Suspense>
  );
};

const Home = () => {
  // User and Lead Management
  const [userDetails, setUserDetails] = useState(null);
  const [leadData, setLeadData] = useState(null);
  const [appointmentData, setAppointmentData] = useState(null);
  const [showUserForm, setShowUserForm] = useState(true);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  
  // Call Management
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Not Connected");
  const [callTranscript, setCallTranscript] = useState([]);
  const [callDebugMessages, setCallDebugMessages] = useState([]);
  const [customerProfileKey, setCustomerProfileKey] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // UI State
  const [lastUpdateTime, setLastUpdateTime] = useState("");
  const [consultationData, setConsultationData] = useState({
    symptoms: [],
    conversationStage: "Not started",
    userMood: "",
    supportOffered: [],
  });
  const [messages, setMessages] = useState([]);
  const [actionButtons, setActionButtons] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [currentSessionStart, setCurrentSessionStart] = useState(null);
  
  const transcriptContainerRef = useRef(null);
  const demoConfigRef = useRef(null);

  // Initialize demo config when user details are set
  useEffect(() => {
    if (userDetails?.name) {
      demoConfigRef.current = demoConfig(userDetails.name);
    }
  }, [userDetails]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Parse consultation data from messages
  const parseConsultationData = useCallback((message) => {
    try {
      if (message.includes("Tool calls:") && message.includes("updateConsultation")) {
        console.log("Raw message:", message);
        
        const lines = message.split('\n');
        for (let line of lines) {
          if (line.includes('updateConsultation') && line.includes('{')) {
            const argsMatch = line.match(/args='([^']+)'/);
            if (argsMatch) {
              try {
                const argsJson = JSON.parse(argsMatch[1]);
                console.log("Parsed args:", argsJson);
                
                if (argsJson.consultationData || argsJson.symptoms) {
                  const consultationData = argsJson.consultationData || argsJson;
                  return {
                    symptoms: Array.isArray(consultationData.symptoms) ? consultationData.symptoms : [],
                    conversationStage: consultationData.conversationStage || "In Progress",
                    userMood: consultationData.userMood || "",
                    supportOffered: Array.isArray(consultationData.supportOffered) ? consultationData.supportOffered : [],
                  };
                }
              } catch (parseError) {
                console.error("Error parsing args:", parseError);
              }
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error parsing consultation data:", error);
      return null;
    }
  }, []);

  // Add event listeners for consultation data updates
  useEffect(() => {
    const handleConsultationUpdate = (event) => {
      console.log("Consultation updated:", event.detail);
      const consultationData = event.detail;
      
      setConsultationData((prevData) => {
        const mergedSymptoms = [...prevData.symptoms];
        
        if (consultationData.symptoms && consultationData.symptoms.length > 0) {
          consultationData.symptoms.forEach(newSymptom => {
            const existingIndex = mergedSymptoms.findIndex(
              existing => existing.symptom === newSymptom.symptom
            );
            
            if (existingIndex >= 0) {
              mergedSymptoms[existingIndex] = {
                ...mergedSymptoms[existingIndex],
                ...newSymptom
              };
            } else {
              mergedSymptoms.push(newSymptom);
            }
          });
        }
        
        const newData = {
          symptoms: mergedSymptoms,
          conversationStage: consultationData.conversationStage || prevData.conversationStage,
          userMood: consultationData.userMood || prevData.userMood,
          supportOffered: consultationData.supportOffered && consultationData.supportOffered.length > 0 
            ? [...new Set([...prevData.supportOffered, ...consultationData.supportOffered])]
            : prevData.supportOffered,
        };
        
        console.log("Updated consultation data:", newData);
        return newData;
      });
    };

    const handleActionButton = (event) => {
      console.log("Action button triggered:", event.detail);
      const buttonData = event.detail;
      
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && !lastMessage.isUser && !lastMessage.buttons) {
          const updatedMessages = [...prev];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            buttons: [buttonData]
          };
          return updatedMessages;
        } else {
          return [...prev, {
            id: Date.now(),
            text: "Here are some options that might help:",
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
            sender: "Dr. Riya",
            buttons: [buttonData]
          }];
        }
      });
    };

    // Call ended event - save session but don't clear data
    const handleCallEnded = () => {
      console.log("Call ended, saving session data");
      
      if (currentSessionStart && messages.length > 0) {
        const sessionEnd = new Date();
        const duration = Math.round((sessionEnd - currentSessionStart) / 1000 / 60); // minutes
        
        const sessionData = {
          date: currentSessionStart.toLocaleDateString(),
          startTime: currentSessionStart.toLocaleTimeString(),
          endTime: sessionEnd.toLocaleTimeString(),
          duration: `${duration} min`,
          messageCount: messages.length,
          stage: consultationData.conversationStage,
          symptoms: consultationData.symptoms.length
        };
        
        setCallHistory(prev => [...prev, sessionData]);
        setCurrentSessionStart(null);
      }
    };

    // Add event listeners
    window.addEventListener('consultationUpdated', handleConsultationUpdate);
    window.addEventListener('showActionButton', handleActionButton);
    window.addEventListener('callEnded', handleCallEnded);

    // Cleanup
    return () => {
      window.removeEventListener('consultationUpdated', handleConsultationUpdate);
      window.removeEventListener('showActionButton', handleActionButton);
      window.removeEventListener('callEnded', handleCallEnded);
    };
  }, [currentSessionStart, messages.length, consultationData.conversationStage, consultationData.symptoms.length]);

  // Process transcript changes
  useEffect(() => {
    if (callTranscript && callTranscript.length > 0) {
      const userTranscripts = callTranscript.filter(t => t.speaker === Role.USER);
      userTranscripts.forEach(transcript => {
        if (transcript.text && transcript.text.trim()) {
          setMessages(prev => {
            const exists = prev.some(msg => 
              msg.text === transcript.text && msg.isUser === true
            );
            if (!exists) {
              return [...prev, {
                id: Date.now() + Math.random(),
                text: transcript.text.trim(),
                isUser: true,
                timestamp: new Date().toLocaleTimeString(),
                sender: userDetails?.name || "You"
              }];
            }
            return prev;
          });
        }
      });

      // Parse debug messages for consultation data
      callDebugMessages.forEach(debugMsg => {
        const consultationUpdate = parseConsultationData(debugMsg.message);
        if (consultationUpdate) {
          setConsultationData(prev => ({
            ...prev,
            ...consultationUpdate
          }));
        }
      });
    }
  }, [callTranscript, callDebugMessages, userDetails, parseConsultationData]);

  const handleUserDetailsSubmit = async (details) => {
    setIsLoadingUserData(true);
    
    try {
      const leadResponse = await apiService.createLead(
        details.name,
        details.mobile,
        details.zipCode
      );
      
      setLeadData(leadResponse);
      setUserDetails(details);
      
      try {
        const appointmentResponse = await apiService.getUpcomingAppointments(details.mobile);
        setAppointmentData(appointmentResponse);
      } catch (appointmentError) {
        console.warn("Could not fetch appointments:", appointmentError);
        setAppointmentData({ success: true, appointment: null });
      }
      
      setShowUserForm(false);
      
    } catch (error) {
      console.error("Error setting up user:", error);
      alert("Failed to set up consultation. Please try again.");
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const handleStatusChange = useCallback((status) => {
    if (status) {
      let statusMessage = "";
      switch (status) {
        case "idle":
          statusMessage = "Ready to start";
          break;
        case "listening":
          statusMessage = "Listening...";
          break;
        case "thinking":
          statusMessage = "Dr. Riya is thinking...";
          break;
        case "speaking":
          statusMessage = "Dr. Riya is speaking...";
          break;
        case "disconnected":
          statusMessage = "Disconnected";
          break;
        default:
          statusMessage = typeof status === "string" ? status : "Connected";
      }
      
      setAgentStatus(statusMessage);
      setLastUpdateTime(new Date().toLocaleTimeString());
    } else {
      setAgentStatus("Not Connected");
    }
    }, []);

  const handleTranscriptChange = useCallback(
    (transcripts) => {
      if (transcripts) {
        setCallTranscript([...transcripts]);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    },
    []
  );

  const handleDebugMessage = useCallback(
    (debugMessage) => {
      setCallDebugMessages((prevMessages) => [...prevMessages, debugMessage]);
      setLastUpdateTime(new Date().toLocaleTimeString());
    },
    []
  );

  const clearCustomerProfile = useCallback(() => {
    setCustomerProfileKey((prev) => (prev ? `${prev}-cleared` : "cleared"));
  }, []);

  const getCallStatus = () => {
    if (!isCallActive) return "Not started";
    if (agentStatus === "Call started successfully") return "In progress";
    return agentStatus;
  };

  const handleToggleMute = useCallback(() => {
    try {
      toggleMute(Role.USER);
      setIsMuted(prev => !prev);
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  }, []);

  const handleStartCallButtonClick = async (
    modelOverride,
    showDebugMessages
  ) => {
    if (isCallStarting || isCallActive || !demoConfigRef.current) return;

    try {
      setIsCallStarting(true);
      setCurrentSessionStart(new Date());
      handleStatusChange("Starting call...");
      setCallTranscript([]);
      setCallDebugMessages([]);
      // Don't clear messages - keep conversation history
      setActionButtons([]);
      clearCustomerProfile();

      const newKey = `call-${Date.now()}`;
      setCustomerProfileKey(newKey);

      let callConfig = {
        ...demoConfigRef.current.callConfig,
        model: modelOverride || demoConfigRef.current.callConfig.model,
      };

      await startCall(
        {
          onStatusChange: handleStatusChange,
          onTranscriptChange: handleTranscriptChange,
          onDebugMessage: handleDebugMessage,
        },
        callConfig,
        showDebugMessages
      );

      setIsCallActive(true);
      handleStatusChange("Call started successfully");
      
      // Add welcome message only if no previous messages
      if (messages.length === 0) {
        setMessages([{
          id: Date.now(),
          text: "Hello! I'm Dr. Riya from Cadabams MindTalk. I'm here to provide compassionate support for your mental health. How have you been feeling lately?",
          isUser: false,
          timestamp: new Date().toLocaleTimeString(),
          sender: "Dr. Riya"
        }]);
      }
      
    } catch (error) {
      handleStatusChange(
        `Error starting call: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      setCurrentSessionStart(null);
    } finally {
      setIsCallStarting(false);
    }
  };

  const handleEndCallButtonClick = async () => {
    try {
      handleStatusChange("Ending call...");
      await endCall();
      setIsCallActive(false);
      clearCustomerProfile();
      setCustomerProfileKey(null);
      setIsMuted(false);
      handleStatusChange("Call ended successfully");
    } catch (error) {
      handleStatusChange(
        `Error ending call: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const handleNewSession = () => {
    // Clear only current session data, keep history
    setMessages([]);
    setConsultationData({
      symptoms: [],
      conversationStage: "Not started",
      userMood: "",
      supportOffered: [],
    });
    setActionButtons([]);
    setCallTranscript([]);
    setCallDebugMessages([]);
    setAgentStatus("Not Connected");
    setIsCallActive(false);
    setCurrentSessionStart(null);
  };

  const handleSwitchUser = () => {
    setShowUserForm(true);
    setUserDetails(null);
    setLeadData(null);
    setAppointmentData(null);
    setIsCallActive(false);
    setMessages([]);
    setActionButtons([]);
    setCallHistory([]);
    setConsultationData({
      symptoms: [],
      conversationStage: "Not started",
      userMood: "",
      supportOffered: [],
    });
  };

  if (showUserForm) {
    return <UserDetailsForm onSubmit={handleUserDetailsSubmit} loading={isLoadingUserData} />;
  }

  return (
    <SearchParamsHandler>
      {({
        showMuteSpeakerButton,
        modelOverride,
        showDebugMessages,
        showUserTranscripts,
      }) => (
        <div className="min-h-screen bg-gray-50 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b shadow-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                    Cadabams MindTalk
                  </h1>
                  <p className="text-sm text-gray-600 truncate">
                    {userDetails?.name} • {userDetails?.mobile}
                  </p>
                </div>
                {leadData && (
                  <div className="text-xs md:text-sm text-orange-600 flex-shrink-0">
                    Lead: {leadData.lead_id}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-4 gap-4">
            
            {/* Chat Area - Mobile First */}
            <div className="flex-1 flex flex-col min-h-0 order-1 lg:order-1">
              <div className="bg-white rounded-lg shadow-sm border flex flex-col h-full">
                
                {/* Chat Header */}
                <div className="border-b p-3 md:p-4 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-sm md:text-base">Dr. Riya</h3>
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                          {getCallStatus()}
                        </p>
                      </div>
                    </div>
                    {lastUpdateTime && (
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {lastUpdateTime}
                      </span>
                    )}
                  </div>
                </div>

                {/* Messages Area */}
                <div 
                  ref={transcriptContainerRef}
                  className="flex-1 overflow-y-auto p-3 md:p-4 bg-gray-50 min-h-[300px] max-h-[400px] md:max-h-[500px]"
                >
                  {messages.length === 0 && !isCallActive && (
                    <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm md:text-base">Start your consultation with Dr. Riya</p>
                      <p className="text-xs md:text-sm mt-2">Compassionate mental health support</p>
                    </div>
                  )}
                  
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message.text}
                      isUser={message.isUser}
                      timestamp={message.timestamp}
                      buttons={message.buttons}
                    />
                  ))}
                </div>

                {/* Call Controls - Always Visible on Mobile */}
                <div className="border-t p-3 md:p-4 flex-shrink-0 bg-white">
                  {isCallActive ? (
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <button
                        type="button"
                        className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors text-sm ${
                          isMuted 
                            ? 'bg-red-100 text-red-700 border border-red-300' 
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                        onClick={handleToggleMute}
                      >
                        {isMuted ? (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Unmute
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Mute
                          </>
                        )}
                      </button>
                      {showMuteSpeakerButton && (
                        <button
                          type="button"
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                          onClick={() => toggleMute(Role.AGENT)}
                        >
                          Toggle Speaker
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-center py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        onClick={handleEndCallButtonClick}
                        disabled={!isCallActive}
                      >
                        <PhoneOffIcon className="w-4 h-4 mr-2" />
                        End Call
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        type="button"
                        className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400 text-sm md:text-base font-medium"
                        onClick={() =>
                          handleStartCallButtonClick(
                            modelOverride,
                            showDebugMessages
                          )
                        }
                        disabled={isCallStarting || !userDetails}
                      >
                        {isCallStarting ? "Starting Call..." : "Start Voice Consultation with Dr. Riya"}
                      </button>
                      
                      {messages.length > 0 && (
                        <button
                          onClick={handleNewSession}
                          className="w-full py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Start New Session
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Mobile: Below chat, Desktop: Side */}
            <div className="w-full lg:w-80 xl:w-96 space-y-4 order-2 lg:order-2">
              
              {/* Appointment Status */}
              <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-orange-500" />
                  Appointment Status
                </h3>
                <AppointmentCard appointment={appointmentData?.appointment} />
              </div>

              {/* Consultation Notes */}
              <ConversationNotes 
                consultationData={consultationData}
                messages={messages}
                callHistory={callHistory}
              />

              {/* User Information */}
              <div className="bg-white rounded-lg shadow-sm border p-4 md:p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-gray-600" />
                  Patient Information
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{userDetails?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mobile:</span>
                    <span className="font-medium">{userDetails?.mobile}</span>
                  </div>
                  {userDetails?.zipCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">ZIP Code:</span>
                      <span className="font-medium">{userDetails.zipCode}</span>
                    </div>
                  )}
                  {leadData?.success && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lead ID:</span>
                      <span className="font-medium text-orange-600">
                        {leadData.lead_id}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    onClick={handleSwitchUser}
                    className="w-full px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    Switch User
                  </button>
                  
                  {callHistory.length > 0 && (
                    <div className="text-xs text-gray-500 text-center mt-2">
                      Total Sessions: {callHistory.length}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SearchParamsHandler>
  );
};

export default Home;
