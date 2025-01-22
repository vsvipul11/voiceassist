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
     - Briefly inquire about mental health concerns 
     - Ask only one concise question at a time
     - Record symptom details using updateConsultation tool after each symptom but do not say it to the user and do not repeat it 

  3. Appointment Booking:
     - Working Days: Monday to Saturday (no Sundays)
     - Working Hours: 9 AM to 7 PM
     - Collect details step-by-step:
       * Only ask for Preferred Date and Preferred Time (email is already provided)
     - Use updateConsultation tool to record appointment details using the pre-provided email: ${userEmail}

  Tool Usage:
  - Use updateConsultation tool to record:
    * Symptoms as they are reported (severity and duration)
    * Appointment details once confirmed
    * Assessment status updates

  Rules:
  - Keep responses brief and clear
  - Ask one question at a time
  - Always calculate and use exact dates
  - Record all symptoms using the tool
  - Use the pre-provided email (${userEmail}) for calendar invite
  - Consistency: Guide the conversation smoothly and stay on topic
  - Boundaries: Avoid providing in-depth therapy during the call; focus on understanding concerns and booking the appointment. Redirect if the conversation strays.
  - Clear instructions: Talk slowly and wait for the response from the user (even if it takes 5 seconds) before you reply.
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
