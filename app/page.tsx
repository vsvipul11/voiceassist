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
import { PhoneOffIcon, User, Phone, Calendar, Clock, MapPin, ExternalLink } from "lucide-react";
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

const parseConsultationData = (message) => {
    try {
      // Multiple ways to extract tool call data
      if (message.includes("Tool calls:") && message.includes("updateConsultation")) {
        console.log("Raw message:", message); // Debug log
        
        // Method 1: Look for JSON in the tool call line
        const lines = message.split('\n');
        for (let line of lines) {
          if (line.includes('updateConsultation') && line.includes('{')) {
            // Extract args from the FunctionCall
            const argsMatch = line.match(/args='([^']+)'/);
            if (argsMatch) {
              try {
                const argsJson = JSON.parse(argsMatch[1]);
                console.log("Parsed args:", argsJson); // Debug log
                
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
        
        // Method 2: Look for complete JSON objects in the message
        const jsonMatches = message.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
        if (jsonMatches) {
          for (let jsonStr of jsonMatches) {
            try {
              const parsed = JSON.parse(jsonStr);
              console.log("Parsed JSON object:", parsed); // Debug log
              
              // Check multiple possible structures
              let consultationData = null;
              if (parsed.consultationData) {
                consultationData = parsed.consultationData;
              } else if (parsed.symptoms || parsed.conversationStage) {
                consultationData = parsed;
              } else if (parsed.value && (parsed.value.consultationData || parsed.value.symptoms)) {
                consultationData = parsed.value.consultationData || parsed.value;
              }
              
              if (consultationData) {
                return {
                  symptoms: Array.isArray(consultationData.symptoms) ? consultationData.symptoms : [],
                  conversationStage: consultationData.conversationStage || "In Progress",
                  userMood: consultationData.userMood || "",
                  supportOffered: Array.isArray(consultationData.supportOffered) ? consultationData.supportOffered : [],
                };
              }
            } catch (parseError) {
              continue; // Try next JSON match
            }
          }
        }
        
        // Method 3: Look for tool result messages
        if (message.includes("Tool call complete") || message.includes("consultationData")) {
          const resultMatch = message.match(/consultationData['":]?\s*[{[]([^}]+)[}\]]/);
          if (resultMatch) {
            try {
              const resultJson = JSON.parse(`{${resultMatch[1]}}`);
              console.log("Parsed tool result:", resultJson); // Debug log
              
              return {
                symptoms: Array.isArray(resultJson.symptoms) ? resultJson.symptoms : [],
                conversationStage: resultJson.conversationStage || "In Progress",
                userMood: resultJson.userMood || "",
                supportOffered: Array.isArray(resultJson.supportOffered) ? resultJson.supportOffered : [],
              };
            } catch (parseError) {
              console.error("Error parsing tool result:", parseError);
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error("Error parsing consultation data:", error);
      return null;
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Cadabams MindTalk
          </h2>
          <p className="text-gray-600">
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
          <p className="text-gray-600">No upcoming appointments</p>
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

  // Add event listeners for consultation data updates
  useEffect(() => {
    const handleConsultationUpdate = (event: CustomEvent) => {
      console.log("Consultation updated:", event.detail);
      const consultationData = event.detail;
      
      setConsultationData((prevData) => {
        // Merge symptoms arrays, avoiding duplicates
        const mergedSymptoms = [...prevData.symptoms];
        
        if (consultationData.symptoms && consultationData.symptoms.length > 0) {
          consultationData.symptoms.forEach(newSymptom => {
            const existingIndex = mergedSymptoms.findIndex(
              existing => existing.symptom === newSymptom.symptom
            );
            
            if (existingIndex >= 0) {
              // Update existing symptom with new information
              mergedSymptoms[existingIndex] = {
                ...mergedSymptoms[existingIndex],
                ...newSymptom
              };
            } else {
              // Add new symptom
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

    const handleActionButton = (event: CustomEvent) => {
      console.log("Action button triggered:", event.detail);
      const buttonData = event.detail;
      
      // Add button to the most recent AI message
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
          // Add as a new message with just the button
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

    const handleCallEnded = () => {
      console.log("Call ended, clearing data");
      setConsultationData({
        symptoms: [],
        conversationStage: "Not started",
        userMood: "",
        supportOffered: [],
      });
      setMessages([]);
      setActionButtons([]);
    };

    // Add event listeners
    window.addEventListener('consultationUpdated', handleConsultationUpdate as EventListener);
    window.addEventListener('showActionButton', handleActionButton as EventListener);
    window.addEventListener('callEnded', handleCallEnded);

    // Cleanup
    return () => {
      window.removeEventListener('consultationUpdated', handleConsultationUpdate as EventListener);
      window.removeEventListener('showActionButton', handleActionButton as EventListener);
      window.removeEventListener('callEnded', handleCallEnded);
    };
  }, []);

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
    }
  }, [callTranscript, userDetails]);

  const handleUserDetailsSubmit = async (details) => {
    setIsLoadingUserData(true);
    
    try {
      // Create/update lead
      const leadResponse = await apiService.createLead(
        details.name,
        details.mobile,
        details.zipCode
      );
      
      setLeadData(leadResponse);
      setUserDetails(details);
      
      // Fetch appointments
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
      // Convert UltravoxSessionStatus to readable string
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

  const handleStartCallButtonClick = async (
    modelOverride,
    showDebugMessages
  ) => {
    if (isCallStarting || isCallActive || !demoConfigRef.current) return;

    try {
      setIsCallStarting(true);
      handleStatusChange("Starting call...");
      setCallTranscript([]);
      setCallDebugMessages([]);
      setMessages([]);
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
      
      // Add welcome message
      setMessages([{
        id: Date.now(),
        text: "Hello! I'm Dr. Riya from Cadabams MindTalk. I'm here to provide compassionate support for your mental health. How have you been feeling lately?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString(),
        sender: "Dr. Riya"
      }]);
      
    } catch (error) {
      handleStatusChange(
        `Error starting call: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
      handleStatusChange("Call ended successfully");
    } catch (error) {
      handleStatusChange(
        `Error ending call: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const parseConsultationData = (message) => {
    try {
      if (message.includes("Tool calls:") && message.includes("updateConsultation")) {
        // Look for the JSON data in the message
        const lines = message.split('\n');
        let jsonData = null;
        
        for (let line of lines) {
          if (line.includes('{') && line.includes('}')) {
            try {
              // Extract JSON from the line
              const jsonStart = line.indexOf('{');
              const jsonEnd = line.lastIndexOf('}') + 1;
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const jsonStr = line.slice(jsonStart, jsonEnd);
                const parsed = JSON.parse(jsonStr);
                
                // Check if this contains consultation data
                if (parsed.consultationData || parsed.symptoms || parsed.conversationStage) {
                  jsonData = parsed;
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        if (jsonData) {
          const consultationData = jsonData.consultationData || jsonData;
          
          return {
            symptoms: Array.isArray(consultationData.symptoms) ? consultationData.symptoms : [],
            conversationStage: consultationData.conversationStage || "In Progress",
            userMood: consultationData.userMood || "",
            supportOffered: Array.isArray(consultationData.supportOffered) ? consultationData.supportOffered : [],
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error parsing consultation data:", error);
      return null;
    }
  };

  const parseButtonData = (message) => {
    try {
      if (message.includes("Tool calls:") && 
          (message.includes("showAssessmentButton") || 
           message.includes("showBookingButton") || 
           message.includes("showSelfHelpButton"))) {
        
        const jsonStart = message.indexOf("{");
        const jsonEnd = message.lastIndexOf("}") + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = message.slice(jsonStart, jsonEnd);
          const data = JSON.parse(jsonStr);

          const buttonData = data.value?.buttonData || data.value || data.buttonData || data;
          
          let buttonType = "default";
          if (message.includes("showAssessmentButton")) buttonType = "assessment";
          else if (message.includes("showBookingButton")) buttonType = "booking";
          else if (message.includes("showSelfHelpButton")) buttonType = "selfhelp";

          return {
            type: buttonType,
            text: buttonData.text || getDefaultButtonText(buttonType),
            url: buttonData.url || getDefaultButtonUrl(buttonType),
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error parsing button data:", error);
      return null;
    }
  };

  const getDefaultButtonText = (type) => {
    switch (type) {
      case 'assessment': return 'Take Mental Health Assessment';
      case 'booking': return 'Book Session with Professional';
      case 'selfhelp': return 'Explore Self-Help Tools';
      default: return 'Learn More';
    }
  };

  const getDefaultButtonUrl = (type) => {
    switch (type) {
      case 'assessment': return 'https://consult.cadabams.com/assessment';
      case 'booking': return 'https://consult.cadabams.com/doctors-list';
      case 'selfhelp': return 'https://consult.cadabams.com/journey/all';
      default: return '#';
    }
  };

  const showNotification = (message, type = "info") => {
    console.log(`${type.toUpperCase()}: ${message}`);
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
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Cadabams MindTalk - Mental Health Support
                  </h1>
                  <p className="text-gray-600 mt-1">
                    Welcome, {userDetails?.name} • {userDetails?.mobile}
                  </p>
                </div>
                {leadData && (
                  <div className="text-sm text-orange-600">
                    Lead ID: {leadData.lead_id}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Chat Area */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border">
                  {/* Chat Header */}
                  <div className="border-b p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium">Dr. Riya</h3>
                          <p className="text-sm text-gray-500">
                            Status: {getCallStatus()}
                          </p>
                        </div>
                      </div>
                      {lastUpdateTime && (
                        <span className="text-xs text-gray-500">
                          Last update: {lastUpdateTime}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Messages Area */}
                  <div 
                    ref={transcriptContainerRef}
                    className="h-96 overflow-y-auto p-4 bg-gray-50"
                  >
                    {messages.length === 0 && !isCallActive && (
                      <div className="text-center text-gray-500 mt-20">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Start your mental health consultation to begin chatting with Dr. Riya</p>
                        <p className="text-sm mt-2">She's here to provide compassionate support and guidance</p>
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

                  {/* Call Controls */}
                  <div className="border-t p-4">
                    {isCallActive ? (
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          onClick={() => toggleMute(Role.USER)}
                        >
                          Toggle Mic
                        </button>
                        {showMuteSpeakerButton && (
                          <button
                            type="button"
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                            onClick={() => toggleMute(Role.AGENT)}
                          >
                            Toggle Speaker
                          </button>
                        )}
                        <button
                          type="button"
                          className="flex-1 flex items-center justify-center h-12 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          onClick={handleEndCallButtonClick}
                          disabled={!isCallActive}
                        >
                          <PhoneOffIcon className="w-5 h-5 mr-2" />
                          End Call
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full h-12 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:bg-gray-400"
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
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Appointment Status */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-orange-500" />
                    Appointment Status
                  </h3>
                  <AppointmentCard appointment={appointmentData?.appointment} />
                </div>

                {/* Consultation Notes */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold mb-4 text-orange-600 border-b border-orange-200 pb-2">
                    Consultation Progress
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-orange-600 mb-2">
                        Conversation Stage
                      </h4>
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <span className="text-sm">
                          {consultationData.conversationStage}
                        </span>
                      </div>
                    </div>

                    {consultationData.userMood && (
                      <div>
                        <h4 className="font-medium text-orange-600 mb-2">
                          Current Mood Assessment
                        </h4>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <span className="text-sm">
                            {consultationData.userMood}
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-orange-600 mb-2">
                        Reported Concerns
                      </h4>
                      <div className="space-y-2">
                        {consultationData.symptoms &&
                        consultationData.symptoms.length > 0 ? (
                          consultationData.symptoms.map((symptom, index) => (
                            <div
                              key={index}
                              className="bg-orange-50 p-3 rounded-lg border border-orange-200"
                            >
                              <div className="font-medium text-gray-900 mb-1">
                                {symptom.symptom}
                              </div>
                              {symptom.duration && (
                                <div className="text-sm text-gray-600">
                                  Duration: {symptom.duration}
                                </div>
                              )}
                              {symptom.severity && (
                                <div className="text-sm text-gray-600">
                                  Severity: {symptom.severity}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <div className="text-gray-500 text-sm italic bg-gray-50 p-3 rounded-lg">
                            No concerns reported yet
                          </div>
                        )}
                      </div>
                    </div>

                    {consultationData.supportOffered && consultationData.supportOffered.length > 0 && (
                      <div>
                        <h4 className="font-medium text-orange-600 mb-2">
                          Support Options Offered
                        </h4>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <div className="space-y-1">
                            {consultationData.supportOffered.map((support, index) => (
                              <div key={index} className="text-sm text-gray-700">
                                • {support}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Information */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
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
                  
                  <button
                    onClick={() => {
                      setShowUserForm(true);
                      setUserDetails(null);
                      setLeadData(null);
                      setAppointmentData(null);
                      setIsCallActive(false);
                      setMessages([]);
                      setActionButtons([]);
                      setConsultationData({
                        symptoms: [],
                        conversationStage: "Not started",
                        userMood: "",
                        supportOffered: [],
                      });
                    }}
                    className="w-full mt-4 px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
                  >
                    Switch User
                  </button>
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