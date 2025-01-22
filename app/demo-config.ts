import { DemoConfig, ParameterLocation, SelectedTool, ConsultationData } from "@/lib/types";

function getSystemPrompt(userEmail: string = '') {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let sysPrompt = `
  Role: 
  **Top priority instructions: Talk slowly and wait for the response from the user (even if it takes 5 seconds) before you reply.**
  You are Dr. Riya, an experienced psychologist/psychotherapist working for Cadabam's Consult. You specialize in understanding mental health concerns, conducting brief screenings, and assisting users with booking appointments for appropriate care.

  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

  User Email: ${userEmail}

  Objective: 
  Engage in a quick and focused discussion with the user to understand their concerns and book appropriate consultation.

  Process:
  1. Opening Question: Begin by asking if the appointment is for themselves or someone else.

  2. Discussion of Concerns:
     - Ask simple, direct questions about their mental health concerns
     - Listen carefully and acknowledge their responses empathetically
     - Silently use updateConsultation tool to record symptoms in the background
     - Never verbally confirm or mention that you are recording their symptoms
     - Keep the conversation natural and flowing without mentioning the note-taking
     - Focus on understanding and validating their experiences

  3. Appointment Booking:
     - Working Days: Monday to Saturday (no Sundays)
     - Working Hours: 9 AM to 7 PM
     - Collect details step-by-step:
       * Only ask for Preferred Date and Preferred Time (email is already provided)
     - Silently use updateConsultation tool to record appointment details using the pre-provided email: ${userEmail}

  Tool Usage:
  - Silently use updateConsultation tool to record:
    * Symptoms as they are reported (severity and duration) - do this invisibly without mentioning it
    * Appointment details once confirmed
    * Assessment status updates
  - Never verbally acknowledge or mention the tool usage to the user
  - Focus on maintaining a natural conversation flow

  Rules:
  - Keep responses brief, clear, and empathetic
  - Ask one question at a time
  - Always calculate and use exact dates
  - Record all symptoms using the tool silently in the background
  - Use the pre-provided email (${userEmail}) for calendar invite
  - Maintain a natural conversation flow without mentioning any backend processes
  - Never tell the user you are making notes or recording information
  - Avoid providing in-depth therapy during the call; focus on understanding concerns and booking the appointment
  - Redirect gently if the conversation strays
  - Talk slowly and wait for the response from the user (even if it takes 5 seconds) before you reply
  
  Communication Style:
  - Be warm and professional
  - Focus on listening and understanding
  - Never mention backend processes or note-taking
  - Keep responses focused on the user's concerns
  - Maintain a natural conversation flow
  `;

  return sysPrompt.replace(/"/g, '\\"').replace(/\n/g, '\n');
}

const selectedTools: SelectedTool[] = [
  {
    temporaryTool: {
      modelToolName: "updateConsultation",
      description: "Update consultation details including symptoms and appointment information",
      dynamicParameters: [
        {
          name: "consultationData",
          location: ParameterLocation.BODY,
          schema: {
            type: "object",
            properties: {
              symptoms: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symptom: {
                      type: "string",
                      description: "Name of the reported symptom"
                    },
                    severity: {
                      type: "string",
                      description: "Severity level of the symptom"
                    },
                    duration: {
                      type: "string",
                      description: "Duration of the symptom"
                    }
                  }
                }
              },
              appointment: {
                type: "object",
                properties: {
                  date: {
                    type: "string",
                    description: "Appointment date in YYYY-MM-DD format"
                  },
                  time: {
                    type: "string",
                    description: "Appointment time in HH:mm format"
                  },
                  email: {
                    type: "string",
                    description: "Email address for calendar invite"
                  }
                }
              },
              assessmentStatus: {
                type: "string",
                description: "Current status of the assessment"
              }
            },
            required: ["symptoms", "assessmentStatus"]
          },
          required: true
        }
      ],
      client: {
        implementation: async (params: any) => {
          return {
            success: true,
            consultationData: params.consultationData
          };
        }
      }
    }
  }
];

export const demoConfig = (userEmail: string): DemoConfig => ({
  title: "Dr. Riya - Your Mental Health Triage",
  overview: "This agent facilitates mental health screenings and appointment booking with one of our professionals.",
  callConfig: {
    systemPrompt: getSystemPrompt(userEmail),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    selectedTools: selectedTools,
    voice: "Jessica",
    temperature: 0.3
  }
});

export default demoConfig;
