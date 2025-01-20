'use client';

import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation'; 
import { startCall, endCall } from '@/lib/callFunctions';
import { CallConfig, SelectedTool } from '@/lib/types';
import demoConfig from './demo-config';
import { Role, Transcript, UltravoxExperimentalMessageEvent, UltravoxSessionStatus } from 'ultravox-client';
import CallStatus from './components/CallStatus';
import MicToggleButton from './components/MicToggleButton';
import { PhoneOffIcon } from 'lucide-react';
import ConsultationDetails from './components/OrderDetails';

interface Symptom {
  symptom: string;
  duration: string;
  severity: string;
}

interface Appointment {
  date: string;
  time: string;
}

interface ConsultationData {
  symptoms: Symptom[];
  assessmentStatus: string;
  appointment?: Appointment;
}

interface SearchParamsProps {
  showMuteSpeakerButton: boolean;
  modelOverride?: string;
  showDebugMessages: boolean;
  showUserTranscripts: boolean;
}

interface SearchParamsHandlerProps {
  children: (props: SearchParamsProps) => React.ReactNode;
}

const SearchParamsHandler: React.FC<SearchParamsHandlerProps> = ({ children }) => {
  const searchParams = useSearchParams();
  const showMuteSpeakerButton = searchParams.get('showSpeakerMute') === 'true';
  const showDebugMessages = searchParams.get('showDebugMessages') === 'true';
  const showUserTranscripts = searchParams.get('showUserTranscripts') === 'true';
  let modelOverride: string | undefined;
  
  if (searchParams.get('model')) {
    modelOverride = "fixie-ai/" + searchParams.get('model');
  }

  return children({ 
    showMuteSpeakerButton, 
    modelOverride, 
    showDebugMessages, 
    showUserTranscripts 
  });
};

const Home: React.FC = () => {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [agentStatus, setAgentStatus] = useState<string>('Not Connected');
  const [callTranscript, setCallTranscript] = useState<Transcript[] | null>([]);
  const [callDebugMessages, setCallDebugMessages] = useState<UltravoxExperimentalMessageEvent[]>([]);
  const [customerProfileKey, setCustomerProfileKey] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');
  const [consultationData, setConsultationData] = useState<ConsultationData>({
    symptoms: [],
    assessmentStatus: 'Not started'
  });
  const transcriptContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (transcriptContainerRef.current) {
      transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
    }
  }, [callTranscript, callDebugMessages]);

  useEffect(() => {
    if (callDebugMessages.length > 0) {
      setLastUpdateTime(new Date().toLocaleTimeString());
      
      const latestMessage = callDebugMessages[callDebugMessages.length - 1].message.message;
      
      if (latestMessage.includes('Tool calls:')) {
        try {
          // Extract the JSON string from the message
          const jsonStart = latestMessage.indexOf('{');
          const jsonEnd = latestMessage.lastIndexOf('}') + 1;
          if (jsonStart !== -1 && jsonEnd !== -1) {
            const jsonStr = latestMessage.slice(jsonStart, jsonEnd);
            const data = JSON.parse(jsonStr);
            
            if (data.consultationData) {
              console.log('Updating consultation data:', data.consultationData);
              setConsultationData(data.consultationData);
            }
          }
        } catch (error) {
          console.error('Error parsing consultation data:', error);
        }
      }
    }
  }, [callDebugMessages]);

  const handleStatusChange = useCallback((status: UltravoxSessionStatus | string | undefined) => {
    if(status) {
      setAgentStatus(status);
      setLastUpdateTime(new Date().toLocaleTimeString());
    } else {
      setAgentStatus('Not Connected');
    }
  }, []);

  const handleTranscriptChange = useCallback((transcripts: Transcript[] | undefined) => {
    if(transcripts) {
      setCallTranscript([...transcripts]);
      setLastUpdateTime(new Date().toLocaleTimeString());
    }
  }, []);

  const handleDebugMessage = useCallback((debugMessage: UltravoxExperimentalMessageEvent) => {
    setCallDebugMessages(prevMessages => [...prevMessages, debugMessage]);
    setLastUpdateTime(new Date().toLocaleTimeString());
  }, []);

  const clearCustomerProfile = useCallback(() => {
    setCustomerProfileKey(prev => prev ? `${prev}-cleared` : 'cleared');
    setConsultationData({
      symptoms: [],
      assessmentStatus: 'Not started'
    });
  }, []);

  const getCallStatus = () => {
    if (!isCallActive) return 'Not started';
    if (agentStatus === 'Call started successfully') return 'In progress';
    return agentStatus;
  };

  const handleStartCallButtonClick = async (modelOverride?: string, showDebugMessages?: boolean) => {
    try {
      handleStatusChange('Starting call...');
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
        maxDuration: demoConfig.callConfig.maxDuration,
        timeExceededMessage: demoConfig.callConfig.timeExceededMessage
      };

      const paramOverride: { [key: string]: any } = {
        "callId": newKey
      };

      let cpTool: SelectedTool | undefined = demoConfig?.callConfig?.selectedTools?.find(
        tool => tool.toolName === "createProfile"
      );
      
      if (cpTool) {
        cpTool.parameterOverrides = paramOverride;
      }
      callConfig.selectedTools = demoConfig.callConfig.selectedTools;

      await startCall({
        onStatusChange: handleStatusChange,
        onTranscriptChange: handleTranscriptChange,
        onDebugMessage: handleDebugMessage
      }, callConfig, showDebugMessages);

      setIsCallActive(true);
      handleStatusChange('Call started successfully');
    } catch (error) {
      handleStatusChange(`Error starting call: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleEndCallButtonClick = async () => {
    try {
      handleStatusChange('Ending call...');
      await endCall();
      setIsCallActive(false);
      clearCustomerProfile();
      setCustomerProfileKey(null);
      handleStatusChange('Call ended successfully');
    } catch (error) {
      handleStatusChange(`Error ending call: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsHandler>
        {({ showMuteSpeakerButton, modelOverride, showDebugMessages, showUserTranscripts }) => (
          <div className="flex flex-col items-center justify-center">
            <div className="max-w-[1206px] mx-auto w-full py-5 pl-5 pr-[10px] border border-[#2A2A2A] rounded-[3px]">
              <div className="flex flex-col justify-center lg:flex-row">
                <div className="w-full lg:w-2/3">
                  <h1 className="text-2xl font-bold w-full">{demoConfig.title}</h1>
                  <div className="flex flex-col justify-between items-start h-full font-mono p-4">
                    {isCallActive ? (
                      <div className="w-full">
                        <div className="mb-5 relative">
                          <div 
                            ref={transcriptContainerRef}
                            className="h-[300px] p-2.5 overflow-y-auto relative bg-white"
                          >
                            {callDebugMessages.map((msg, index) => (
                              <div 
                                key={index} 
                                className="text-sm text-gray-600 py-2 font-mono"
                              >
                                {msg.message.message.replace("LLM response:", "Dr. Riya:")}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between space-x-4 p-4 w-full">
                          <MicToggleButton role={Role.USER}/>
                          {showMuteSpeakerButton && <MicToggleButton role={Role.AGENT}/>}
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
                          {callDebugMessages.map((msg, index) => (
                            <div 
                              key={index} 
                              className="text-sm text-gray-600 py-2 font-mono"
                            >
                              {msg.message.message.replace("LLM response:", "Dr. Riya:")}
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="w-full mt-4 h-10 bg-blue-500 text-white"
                          onClick={() => handleStartCallButtonClick(modelOverride, showDebugMessages)}
                        >
                          Start Call
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-[300px] ml-4">
                  <div className="border border-gray-200 rounded p-4">
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold mb-2">Call Status</h2>
                        <p className="text-gray-500">Status: {agentStatus}</p>
                      </div>
                      
                      <div>
                        <h2 className="text-xl font-semibold border-b border-red-500 pb-1 mb-4">Conversation Notes</h2>
                        
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-red-500 font-medium">Status</h3>
                            <p className="bg-red-50 p-2 mt-1">{getCallStatus()}</p>
                          </div>
                          
                          <div className="text-sm text-gray-500">
                            Last update: {lastUpdateTime || 'Not started'}
                          </div>
                          
                          <div>
                            <h3 className="text-red-500 font-medium">Reported Symptoms</h3>
                            {consultationData.symptoms && consultationData.symptoms.length > 0 ? (
                              <div className="mt-2 space-y-3">
                                {consultationData.symptoms.map((symptom, index) => (
                                  <div key={index} className="bg-red-50 p-3 rounded">
                                    <span className="font-medium text-gray-900">{symptom.symptom}</span>
                                    <div className="mt-1 text-sm text-gray-600">
                                      <div>Duration: {symptom.duration}</div>
                                      <div>Severity: {symptom.severity}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 italic mt-1">No symptoms reported yet</p>
                            )}
                          </div>

                          {consultationData.appointment && (
                            <div className="mt-4">
                              <h3 className="text-red-500 font-medium mb-2">Scheduled Video Consultation</h3>
                              <div className="bg-red-50 p-3 rounded">
                                <div className="text-gray-600">
                                  <div><span className="font-medium">Date:</span> {consultationData.appointment.date}</div>
                                  <div><span className="font-medium">Time:</span> {consultationData.appointment.time}</div>
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
    </Suspense>
  );
};

export default Home;
