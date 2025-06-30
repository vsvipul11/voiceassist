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
  try {
    console.log('updateConsultationNotes called with:', params);
    
    // Dispatch event immediately but silently
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('consultationNotesUpdated', { 
        detail: params.consultationData 
      });
      window.dispatchEvent(event);
    }
    
    // Return a minimal response to avoid triggering agent speech
    return "Notes updated.";
  } catch (error) {
    console.error('Error in updateConsultationNotes:', error);
    return "Update failed.";
  }
};

const showAssessmentButtonTool = async (params: any) => {
  try {
    console.log('showAssessmentButton called with:', params);
    
    // Use setTimeout to dispatch event asynchronously
    setTimeout(() => {
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
    }, 0);
    
    return "Assessment button displayed successfully.";
  } catch (error) {
    console.error('Error in showAssessmentButton:', error);
    return "Failed to display assessment button.";
  }
};

const showBookingButtonTool = async (params: any) => {
  try {
    console.log('showBookingButton called with:', params);
    
    // Use setTimeout to dispatch event asynchronously
    setTimeout(() => {
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
    }, 0);
    
    return "Booking button displayed successfully.";
  } catch (error) {
    console.error('Error in showBookingButton:', error);
    return "Failed to display booking button.";
  }
};

const showSelfHelpButtonTool = async (params: any) => {
  try {
    console.log('showSelfHelpButton called with:', params);
    
    // Use setTimeout to dispatch event asynchronously
    setTimeout(() => {
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
    }, 0);
    
    // FIXED: Added missing return statement
    return "Self-help button displayed successfully.";
  } catch (error) {
    console.error('Error in showSelfHelpButton:', error);
    return "Failed to display self-help button.";
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
    
    // Register tools with error handling and async dispatch
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

    // Add additional logging to verify registration
    console.log('All tools registered:', {
      updateConsultationNotes: 'registered',
      showAssessmentButton: 'registered', 
      showBookingButton: 'registered',
      showSelfHelpButton: 'registered'
    });

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