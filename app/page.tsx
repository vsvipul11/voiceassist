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
import { startCall, endCall } from "@/lib/callFunctions";
import {
  Role,
  Transcript,
  UltravoxExperimentalMessageEvent,
} from "ultravox-client";
import { PhoneOffIcon } from "lucide-react";
import { CalComService } from "@/lib/calComService";
import MicToggleButton from "./components/MicToggleButton";
import demoConfig from "./demo-config";

// Email popup component
const EmailPopup = ({ onSubmit }) => {
  const [email, setEmail] = useState("");
  const [isValid, setIsValid] = useState(false);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) {
      onSubmit(email);
    }
  };

  useEffect(() => {
    setIsValid(validateEmail(email));
  }, [email]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Welcome to Cadabam's Consult</h2>
        <p className="mb-4">Please enter your email address to continue:</p>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full p-2 border border-gray-300 rounded mb-4"
            required
          />
          <button
            type="submit"
            disabled={!isValid}
            className="w-full bg-blue-500 text-white p-2 rounded disabled:bg-gray-300"
          >
            Continue
          </button>
        </form>
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
        <div className="flex flex-col items-center justify-center">
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
  const [isCallActive, setIsCallActive] = useState(false);
  const [isCallStarting, setIsCallStarting] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Not Connected");
  const [callTranscript, setCallTranscript] = useState([]);
  const [callDebugMessages, setCallDebugMessages] = useState([]);
  const [customerProfileKey, setCustomerProfileKey] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [showEmailPopup, setShowEmailPopup] = useState(true);
  const [consultationData, setConsultationData] = useState({
    symptoms: [],
    assessmentStatus: "Not started",
  });
  const [isBookingInProgress, setIsBookingInProgress] = useState(false);
  
  const transcriptContainerRef = useRef(null);
  const calendarService = useMemo(() => CalComService.getInstance(), []);
  const demoConfigRef = useRef(null);

  useEffect(() => {
    if (userEmail) {
      demoConfigRef.current = demoConfig(userEmail);
    }
  }, [userEmail]);

  const handleEmailSubmit = (email) => {
    setUserEmail(email);
    setShowEmailPopup(false);
    demoConfigRef.current = demoConfig(email);
  };

  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript, callDebugMessages]);

  useEffect(() => {
    if (callDebugMessages.length > 0) {
      const latestMessage = callDebugMessages[callDebugMessages.length - 1].message.message;
      setLastUpdateTime(new Date().toLocaleTimeString());

      const parsedData = parseConsultationData(latestMessage);
      if (parsedData) {
        setConsultationData((prevData) => {
          const newData = {
            ...prevData,
            symptoms: parsedData.symptoms || prevData.symptoms,
            assessmentStatus: parsedData.assessmentStatus || prevData.assessmentStatus,
            appointment: parsedData.appointment
              ? {
                  date: parsedData.appointment.date || "TBD",
                  time: parsedData.appointment.time || "TBD",
                  email: userEmail,
                }
              : prevData.appointment,
          };

          if (
            !isBookingInProgress &&
            newData.appointment?.date &&
            newData.appointment?.time &&
            newData.appointment.date !== "TBD" &&
            newData.appointment.time !== "TBD"
          ) {
            setIsBookingInProgress(true);

            calendarService
              .createEvent(
                newData.appointment.date,
                newData.appointment.time,
                userEmail,
                "Patient"
              )
              .then((booking) => {
                console.log("Booking created:", booking);
                const meetingRef = booking.references?.find(
                  (ref) => ref.type === "google_meet_video"
                );
                const meetingUrl = meetingRef?.meetingUrl;

                showNotification(
                  `Appointment scheduled successfully!${
                    meetingUrl ? `\nMeeting link: ${meetingUrl}` : ""
                  }`,
                  "success"
                );
              })
              .catch((error) => {
                console.error("Failed to schedule appointment:", error);
                showNotification(
                  "Failed to schedule appointment. Please try again.",
                  "error"
                );
              })
              .finally(() => {
                setIsBookingInProgress(false);
              });
          }

          return newData;
        });
      }
    }
  }, [callDebugMessages, calendarService, userEmail]);

  const handleStatusChange = useCallback((status: string | undefined) => {
    if (status) {
      setAgentStatus(status);
      setLastUpdateTime(new Date().toLocaleTimeString());
    } else {
      setAgentStatus("Not Connected");
    }
  }, []);

  const handleTranscriptChange = useCallback(
    (transcripts: Transcript[] | undefined) => {
      if (transcripts) {
        setCallTranscript([...transcripts]);
        setLastUpdateTime(new Date().toLocaleTimeString());
      }
    },
    []
  );

  const handleDebugMessage = useCallback(
    (debugMessage: UltravoxExperimentalMessageEvent) => {
      // Store all messages for processing data, but only display conversation messages to users
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
    modelOverride?: string,
    showDebugMessages?: boolean
  ) => {
    if (isCallStarting || isCallActive || !demoConfigRef.current) return;

    try {
      setIsCallStarting(true);
      handleStatusChange("Starting call...");
      setCallTranscript(null);
      setCallDebugMessages([]);
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

  const parseConsultationData = (message: string) => {
    try {
      if (message.includes("Tool calls:")) {
        const jsonStart = message.indexOf("{");
        const jsonEnd = message.lastIndexOf("}") + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = message.slice(jsonStart, jsonEnd);
          const data = JSON.parse(jsonStr);

          console.log("Parsed consultation data:", data);

          const consultationData =
            data.value?.consultationData ||
            data.value ||
            data.consultationData ||
            data;

          return {
            symptoms: Array.isArray(consultationData.symptoms)
              ? consultationData.symptoms
              : [],
            assessmentStatus: consultationData.assessmentStatus || "In Progress",
            appointment: consultationData.appointment || undefined,
          };
        }
      }
      return null;
    } catch (error) {
      console.error("Error parsing consultation data:", error);
      return null;
    }
  };

  return (
    <>
      {showEmailPopup && <EmailPopup onSubmit={handleEmailSubmit} />}
      <SearchParamsHandler>
        {({
          showMuteSpeakerButton,
          modelOverride,
          showDebugMessages,
          showUserTranscripts,
        }) => (
          <div className="flex flex-col items-center justify-center">
            <div className="max-w-[1206px] mx-auto w-full py-5 pl-5 pr-[10px] border border-[#2A2A2A] rounded-[3px]">
              <div className="flex flex-col justify-center lg:flex-row">
                <div className="w-full lg:w-2/3">
                  <h1 className="text-2xl font-bold w-full">
                    {demoConfigRef.current?.title || "Dr. Riya - Your Mental Health Triage"}
                  </h1>
                  <div className="flex flex-col justify-between items-start h-full font-mono p-4">
                    {isCallActive ? (
                      <div className="w-full">
                        <div className="flex justify-between space-x-4 p-4 w-full">
                          <MicToggleButton role={Role.USER} />
                          {showMuteSpeakerButton && (
                            <MicToggleButton role={Role.AGENT} />
                          )}
                          <button
                            type="button"
                            className="flex-grow flex items-center justify-center h-10 bg-red-500 text-white"
                            onClick={handleEndCallButtonClick}
                            disabled={!isCallActive}
                          >
                            <PhoneOffIcon width={24} className="brightness-0 invert" />
                            <span className="ml-2">End Call</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full">
                        <div className="h-[300px] p-2.5 overflow-y-auto relative bg-white">
                          {callDebugMessages.map((msg, index) => {
                            const message = msg.message.message;
                            // Only display normal conversation messages, filter out technical details
                            if (!message.includes("Tool calls:") && 
                                !message.includes("FunctionCall") && 
                                !message.includes("invocation_id") &&
                                !message.includes("args=") &&
                                !message.includes("consultationData")) {
                              return (
                                <div key={index} className="text-sm text-gray-600 py-2 font-mono">
                                  {message.replace("LLM response:", "Dr. Riya:")}
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                        <button
                          type="button"
                          className="w-full mt-4 h-10 bg-blue-500 text-white disabled:bg-gray-400"
                          onClick={() =>
                            handleStartCallButtonClick(
                              modelOverride,
                              showDebugMessages
                            )
                          }
                          disabled={isCallStarting || !userEmail}
                        >
                          {isCallStarting ? "Starting Call..." : "Start Call"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-[300px] ml-4">
                  <div className="border border-gray-200 rounded p-4 sticky top-4">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-2">Call Status</h2>
                        <p className="text-gray-500">Status: {getCallStatus()}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Last update: {lastUpdateTime || "Not started"}
                        </p>
                      </div>

                      <div>
                        <h2 className="text-xl font-semibold border-b border-red-500 pb-1 mb-4">
                          Consultation Notes
                        </h2>

                        <div className="space-y-4">
                          <div>
                            <h3 className="text-red-500 font-medium">
                              Assessment Status
                            </h3>
                            <p className="bg-red-50 p-2 mt-1">
                              {consultationData.assessmentStatus}
                            </p>
                          </div>

                          <div>
                            <h3 className="text-red-500 font-medium">
                              Reported Symptoms
                            </h3>
                            <div className="mt-2 space-y-3">
                              {consultationData.symptoms &&
                              consultationData.symptoms.length > 0 ? (
                                consultationData.symptoms.map((symptom, index) => (
                                  <div
                                    key={index}
                                    className="bg-red-50 p-3 rounded"
                                  >
                                    <span className="font-medium text-gray-900">
                                      {symptom.symptom}
                                    </span>
                                    <div className="mt-1 text-sm text-gray-600">
                                      <div>Duration: {symptom.duration}</div>
                                      <div>Severity: {symptom.severity}</div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-gray-500 italic">
                                  No symptoms reported yet
                                </p>
                              )}
                            </div>
                          </div>

                          {consultationData.appointment && (
                            <div className="mt-4">
                              <h3 className="text-red-500 font-medium mb-2">
                                Scheduled Video Consultation
                              </h3>
                              <div className="bg-red-50 p-3 rounded">
                                <div className="text-gray-600">
                                  <div>
                                    <span className="font-medium">Date: </span>
                                    {consultationData.appointment.date === "TBD"
                                      ? "To be decided"
                                      : new Date(
                                          consultationData.appointment.date
                                        ).toLocaleDateString("en-US", {
                                          weekday: "long",
                                          year: "numeric",
                                          month: "long",
                                          day: "numeric",
                                        })}
                                  </div>
                                  <div>
                                    <span className="font-medium">Time: </span>
                                    {consultationData.appointment.time === "TBD"
                                      ? "To be decided"
                                      : new Date(
                                          `2000-01-01T${consultationData.appointment.time}`
                                        ).toLocaleTimeString("en-US", {
                                          hour: "numeric",
                                          minute: "2-digit",
                                          hour12: true,
                                        })}
                                  </div>
                                  {userEmail && (
                                    <div>
                                      <span className="font-medium">Email: </span>
                                      {userEmail}
                                    </div>
                                  )}
                                  {consultationData.appointment.date !== "TBD" &&
                                    consultationData.appointment.time !== "TBD" && (
                                      <div className="mt-2 text-sm text-green-600">
                                        <svg
                                          className="inline-block w-4 h-4 mr-1"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M5 13l4 4L19 7"
                                          />
                                        </svg>
                                        Calendar invite sent with video consultation
                                        link
                                      </div>
                                    )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </SearchParamsHandler>
    </>
  );
};

export default Home;
