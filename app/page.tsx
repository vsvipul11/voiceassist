
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


// @ts-ignore
import {
 CallConfig,
 ConsultationData,
 SearchParamsHandlerProps,
 SearchParamsProps,
} from "@/lib/types";


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


const showNotification = (message: string, type: "success" | "error") => {
 // alert(message);
 console.log("got the error");
};


// Separate client component for handling search params
const SearchParamsContent: React.FC<SearchParamsHandlerProps> = ({
 children,
}) => {
 const searchParams = useSearchParams();
 const showMuteSpeakerButton = searchParams.get("showSpeakerMute") === "true";
 const showDebugMessages = searchParams.get("showDebugMessages") === "true";
 const showUserTranscripts =
   searchParams.get("showUserTranscripts") === "true";
 let modelOverride: string | undefined;


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


const SearchParamsHandler: React.FC<SearchParamsHandlerProps> = (props) => {
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


const Home: React.FC = () => {
 const [isCallActive, setIsCallActive] = useState<boolean>(false);
 const [isCallStarting, setIsCallStarting] = useState<boolean>(false);
 const [agentStatus, setAgentStatus] = useState<string>("Not Connected");
 const [callTranscript, setCallTranscript] = useState<Transcript[] | null>([]);
 const [callDebugMessages, setCallDebugMessages] = useState<
   UltravoxExperimentalMessageEvent[]
 >([]);
 const [customerProfileKey, setCustomerProfileKey] = useState<string | null>(
   null
 );
 const [lastUpdateTime, setLastUpdateTime] = useState<string>("");
 const [consultationData, setConsultationData] = useState<ConsultationData>({
   symptoms: [],
   assessmentStatus: "Not started",
 });
 const transcriptContainerRef = useRef<HTMLDivElement>(null);
 const calendarService = useMemo(() => CalComService.getInstance(), []);


 const [isBookingInProgress, setIsBookingInProgress] = useState(false);


 useEffect(() => {
   console.log("Calendar service initialized with test configuration");
 }, []);


 // Inside your useEffect where appointment creation is handled:
 useEffect(() => {
   if (callDebugMessages.length > 0) {
     const latestMessage =
       callDebugMessages[callDebugMessages.length - 1].message.message;
     setLastUpdateTime(new Date().toLocaleTimeString());


     const parsedData = parseConsultationData(latestMessage);
     if (parsedData) {
       console.log("Updating consultation data:", parsedData);


       setConsultationData((prevData) => {
         const newData = {
           ...prevData,
           symptoms: parsedData.symptoms || prevData.symptoms,
           assessmentStatus:
             parsedData.assessmentStatus || prevData.assessmentStatus,
           appointment: parsedData.appointment
             ? {
                 date: parsedData.appointment.date || "TBD",
                 time: parsedData.appointment.time || "TBD",
                 email: parsedData.appointment.email,
                 name: parsedData.responses?.name || "Patient", // Get name from responses
               }
             : prevData.appointment,
         };


         // Only create booking if not already in progress and all required data is present
         if (
           !isBookingInProgress &&
           newData.appointment?.date &&
           newData.appointment?.time &&
           newData.appointment?.email &&
           newData.appointment.date !== "TBD" &&
           newData.appointment.time !== "TBD"
         ) {
           setIsBookingInProgress(true); // Prevent duplicate calls


           calendarService
             .createEvent(
               newData.appointment.date,
               newData.appointment.time,
               newData.appointment.email,
               parsedData.responses?.name || "Patient" // Use name from LLM response
             )
             .then((booking) => {
               console.log("Test booking created:", booking);


               // Get the meeting URL if available
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
               setIsBookingInProgress(false); // Reset flag regardless of success/failure
             });
         }


         return newData;
       });
     }
   }
 }, [callDebugMessages, calendarService]);

 useEffect(() => {
   if (transcriptContainerRef.current) {
     transcriptContainerRef.current.scrollTop =
       transcriptContainerRef.current.scrollHeight;
   }
 }, [callTranscript, callDebugMessages]);


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
   if (isCallStarting || isCallActive) return;


   try {
     setIsCallStarting(true);
     handleStatusChange("Starting call...");
     setCallTranscript(null);
     setCallDebugMessages([]);
     clearCustomerProfile();


     const newKey = `call-${Date.now()}`;
     setCustomerProfileKey(newKey);


     let callConfig: CallConfig = {
       systemPrompt: demoConfig.callConfig.systemPrompt,
       model: modelOverride || demoConfig.callConfig.model,
       languageHint: demoConfig.callConfig.languageHint,
       voice: demoConfig.callConfig.voice,
       temperature: demoConfig.callConfig.temperature,
       selectedTools: demoConfig.callConfig.selectedTools,
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


 return (
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
                 {demoConfig.title}
               </h1>
               <div className="flex flex-col justify-between items-start h-full font-mono p-4">
                 {isCallActive ? (
                   <div className="w-full">
                     {/* <div className="mb-5 relative">
                       <div
                         ref={transcriptContainerRef}
                         className="h-[300px] p-2.5 overflow-y-auto relative bg-white"
                       >
                         {callDebugMessages.map((msg, index) => (
                           <div
                             key={index}
                             className="text-sm text-gray-600 py-2 font-mono"
                           >
                             {msg.message.message.replace(
                               "LLM response:",
                               "Dr. Riya:"
                             )}
                           </div>
                         ))}
                       </div>
                     </div> */}
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
                         <PhoneOffIcon
                           width={24}
                           className="brightness-0 invert"
                         />
                         <span className="ml-2">End Call</span>
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className="w-full">
                     <div className="h-[300px] p-2.5 overflow-y-auto relative bg-white">
                       {callDebugMessages.map((msg, index) => (
                         <div
                           key={index}
                           className="text-sm text-gray-600 py-2 font-mono"
                         >
                           {msg.message.message.replace(
                             "LLM response:",
                             "Dr. Riya:"
                           )}
                         </div>
                       ))}
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
                       disabled={isCallStarting}
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
                     <h2 className="text-xl font-semibold mb-2">
                       Call Status
                     </h2>
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
                             consultationData.symptoms.map(
                               (symptom, index) => (
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
                               )
                             )
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
                                 <span className="font-medium">Date:</span>
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
                                 <span className="font-medium">Time:</span>
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
                               {consultationData.appointment.email && (
                                 <div>
                                   <span className="font-medium">Email:</span>
                                   {consultationData.appointment.email}
                                 </div>
                               )}
                               {consultationData.appointment.date !== "TBD" &&
                                 consultationData.appointment.time !==
                                   "TBD" && (
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
                                     Calendar invite sent with video
                                     consultation link
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
 );
};


export default Home;
