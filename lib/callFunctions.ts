'use client';

import { UltravoxSession, UltravoxSessionStatus, Transcript, UltravoxExperimentalMessageEvent, Role } from 'ultravox-client';

let uvSession: UltravoxSession | null = null;
const debugMessages: Set<string> = new Set(["debug"]);

interface CallCallbacks {
  onStatusChange: (status: UltravoxSessionStatus | string | undefined) => void;
  onTranscriptChange: (transcripts: Transcript[] | undefined) => void;
  onDebugMessage?: (message: UltravoxExperimentalMessageEvent) => void;
}

interface JoinUrlResponse {
  joinUrl: string;
  callId?: string;
}

interface CallConfig {
  systemPrompt: string;
  model: string;
  languageHint: string;
  selectedTools: any[];
  voice: string;
  temperature: number;
  firstSpeakerSettings?: any;
  vadSettings?: any;
}

export function toggleMute(role: Role): void {
  if (uvSession) {
    // Toggle (user) Mic
    if (role == Role.USER) {
      uvSession.isMicMuted ? uvSession.unmuteMic() : uvSession.muteMic();
    }
    // Mute (agent) Speaker
    else {
      uvSession.isSpeakerMuted ? uvSession.unmuteSpeaker() : uvSession.muteSpeaker();
    }
  } else {
    console.error('uvSession is not initialized.');
  }
}

// Client tool implementations for mental health consultation
const updateConsultationNotesTool = async (params: any) => {
  console.log('updateConsultationNotes called with:', params);
  
  // Dispatch custom event with consultation data
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('consultationNotesUpdated', { 
      detail: params.consultationData 
    });
    window.dispatchEvent(event);
  }
  
  return "Consultation notes have been updated successfully.";
};

const showAssessmentButtonTool = async (params: any) => {
  console.log('showAssessmentButton called with:', params);
  
  // Dispatch custom event for assessment button
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('showActionButton', { 
      detail: {
        type: 'assessment',
        text: params.buttonData?.text || 'Take Mental Health Assessment',
        url: params.buttonData?.url || 'https://consult.cadabams.com/assessment'
      }
    });
    window.dispatchEvent(event);
  }
  
  return "Assessment button displayed successfully.";
};

const showBookingButtonTool = async (params: any) => {
  console.log('showBookingButton called with:', params);
  
  // Dispatch custom event for booking button
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('showActionButton', { 
      detail: {
        type: 'booking',
        text: params.buttonData?.text || 'Book Session with Professional',
        url: params.buttonData?.url || 'https://consult.cadabams.com/doctors-list'
      }
    });
    window.dispatchEvent(event);
  }
  
  return "Booking button displayed successfully.";
};

const showSelfHelpButtonTool = async (params: any) => {
  console.log('showSelfHelpButton called with:', params);
  
  // Dispatch custom event for self-help button
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('showActionButton', { 
      detail: {
        type: 'selfhelp',
        text: params.buttonData?.text || 'Explore Self-Help Tools',
        url: params.buttonData?.url || 'https://consult.cadabams.com/journey/all'
      }
    });
    window.dispatchEvent(event);
  }
  
};

async function createCall(callConfig: CallConfig, showDebugMessages?: boolean): Promise<JoinUrlResponse> {
  try {
    if (showDebugMessages) {
      console.log(`Using model ${callConfig.model}`);
    }

    const response = await fetch(`/api/ultravox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...callConfig }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    const data: JoinUrlResponse = await response.json();

    if (showDebugMessages) {
      console.log(`Call created. Join URL: ${data.joinUrl}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating call:', error);
    throw error;
  }
}

export async function startCall(callbacks: CallCallbacks, callConfig: CallConfig, showDebugMessages?: boolean): Promise<void> {
  try {
    const callData = await createCall(callConfig, showDebugMessages);
    const joinUrl = callData.joinUrl;

    if (!joinUrl) {
      console.error('Join URL is required');
      throw new Error('Failed to get join URL');
    }

    console.log('Joining call:', joinUrl);

    // Start up our Ultravox Session with debug messages enabled
    uvSession = new UltravoxSession({ experimentalMessages: debugMessages });

    // Register our client tools BEFORE joining the call
    console.log('Registering client tools...');
    
    uvSession.registerToolImplementation(
      "updateConsultationNotes",
      updateConsultationNotesTool
    );

    uvSession.registerToolImplementation(
      "showAssessmentButton",
      showAssessmentButtonTool
    );

    uvSession.registerToolImplementation(
      "showBookingButton", 
      showBookingButtonTool
    );

    uvSession.registerToolImplementation(
      "showSelfHelpButton",
      showSelfHelpButtonTool
    );

    if (showDebugMessages) {
      console.log('uvSession created:', uvSession);
      console.log('Tools registered successfully');
    }

    // Set up event listeners BEFORE joining
    uvSession.addEventListener('status', (event: any) => {
      console.log('Status event:', uvSession?.status);
      callbacks.onStatusChange(uvSession?.status);
    });

    uvSession.addEventListener('transcript', (event: any) => {
      console.log('Transcript event:', uvSession?.transcripts);
      callbacks.onTranscriptChange(uvSession?.transcripts);
    });

    uvSession.addEventListener('experimental_message', (msg: any) => {
      console.log('Debug message:', msg);
      callbacks?.onDebugMessage?.(msg);
    });

    // Now join the call
    await uvSession.joinCall(joinUrl);
    console.log('Call joined successfully. Session status:', uvSession.status);

  } catch (error) {
    console.error('Error starting call:', error);
    throw error;
  }
}

export async function endCall(): Promise<void> {
  console.log('Ending call...');

  if (uvSession) {
    try {
      await uvSession.leaveCall();
      console.log('Call left successfully');
    } catch (error) {
      console.error('Error leaving call:', error);
    }
    uvSession = null;
  }

  // Dispatch a custom event when the call ends
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('callEnded');
    window.dispatchEvent(event);
  }
}

export { uvSession };