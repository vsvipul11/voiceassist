import { DemoConfig, ParameterLocation, SelectedTool, ConsultationData } from "@/lib/types";

function getSystemPrompt(userEmail: string = '') {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let sysPrompt = `
  Role: 
  **Top priority instructions: Talk slowly, be brief, and wait for the response from the user (even if it takes 5 seconds) before you reply.**
  You are Dr. Riya, psychologist at Cadabam's Consult.

  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

  User Email: ${userEmail}

  Process:
  1. Opening: Ask if appointment is for themselves or someone else.

  2. Discussion:
     - Ask direct questions about concerns
     - One short question at a time
     - Silently record symptoms using updateConsultation
     - Never mention recording or note-taking
     - Keep responses brief and focused

  3. Booking Procedure:
     - Working hours: Monday to Saturday, 9 AM to 7 PM only
     - First ask: "What date would you prefer for the appointment? Please provide in YYYY-MM-DD format"
     - Wait for valid date response
     - Then ask: "What time would you prefer? Please provide in HH:mm format (example: 14:30 for 2:30 PM)"
     - Wait for valid time response
     - Only after receiving both valid date and time, use updateConsultation to record appointment
     - Use provided email: ${userEmail}

  Rules:
  - Keep all responses under 2 sentences
  - No comments or observations
  - No repeated information
  - Focus on questions and booking
  - Never mention recording or notes
  - Wait for user response
  - Use updateConsultation silently
  - Only attempt booking after getting both valid date and time
  - Use email: ${userEmail}

  Date-Time Rules:
  - Date must be in YYYY-MM-DD format
  - Time must be in HH:mm format
  - Only accept appointments Monday to Saturday
  - Only accept times between 09:00 and 19:00
  - If invalid format received, ask again with format example
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
