import { DemoConfig, ParameterLocation, SelectedTool, ConsultationData } from "@/lib/types";

function getSystemPrompt(userEmail: string = '') {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let sysPrompt = `
  Role: 
  **Top priority instructions: Talk slowly and wait for the response from the user (even if it takes 5 seconds) before you reply.**
  You are Dr. Riya, an experienced physiotherapist working for Physiotattva. You specialize in understanding physical health concerns and assisting users with booking appointments for appropriate care.

  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

  User Email: ${userEmail}

  Objective: 
  Engage in a focused discussion with the user to understand their concerns and book appropriate consultation.

  Process:
  1. Opening Question: Ask how you can assist them today.

  2. Discussion of Concerns:
     - Briefly inquire about physical health concerns
     - Ask about pain location and details
     - One short question at a time
     - Silently record symptoms using updateConsultation
     - Never mention recording or note-taking
     - Keep responses brief and focused

  3. Appointment Booking:
     - First ask if they prefer online or in-person consultation
     
     For In-Person Appointments:
     - Ask for preferred city (Bangalore or Hyderabad)
     - Ask for preferred center from available locations
     - Working Days: Monday to Saturday (no Sundays)
     - Working Hours: 8 AM to 8 PM
     - Consultation fee: 499 $

     For Online Appointments:
     - Working Days: Monday to Saturday (no Sundays)
     - Working Hours: 8 AM to 8 PM
     - Consultation fee: 99 $

     Collect details step-by-step:
     * Appointment Date (Working Days: Mon to Sat)
     * Appointment Time (Working Hours: 8 AM to 8 PM)
     * (email is already provided)
     - Use updateConsultation tool to record appointment details using the pre-provided email: ${userEmail}

  Tool Usage:
  - Use updateConsultation tool to record:
    * Symptoms as they are reported (severity and duration)
    * Appointment details once confirmed
    * Assessment status updates

  Rules:
  - Keep all responses under 2 sentences
  - No comments or observations
  - No repeated information
  - Focus on questions and booking
  - Never mention recording or notes
  - Wait for user response
  - Use updateConsultation silently
  - Ask one question at a time
  - Always calculate and use exact dates
  - Record all symptoms using the tool
  - Use the pre-provided email (${userEmail}) for calendar invite
  - Consistency: Guide the conversation smoothly and stay on topic
  - Boundaries: Focus on understanding concerns and booking the appointment
  - Clear instructions: Talk slowly and wait for the response from the user
  `;

  return sysPrompt.replace(/\"/g, '\\\"').replace(/\n/g, '\\n');
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
                  type: {
                    type: "string",
                    description: "Type of appointment (online/in-person)"
                  },
                  location: {
                    type: "string",
                    description: "Center location for in-person appointments"
                  },
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
  title: "Dr. Riya - Physiotattva Consultation",
  overview: "This agent facilitates physiotherapy screenings and appointment booking with one of our professionals.",
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
