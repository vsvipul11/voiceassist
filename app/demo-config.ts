import { DemoConfig, ParameterLocation, SelectedTool, ConsultationData } from "@/lib/types";

function getSystemPrompt(userEmail: string = '') {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let sysPrompt = `
  Role: 
  **Top priority instructions: Talk slowly, ask only ONE question at a time, and wait for the response from the user (even if it takes 5 seconds) before you reply.**
  You are Dr. Riya, an experienced addiction specialist/psychotherapist working for Cadabam's Consult. You specialize in understanding addiction issues, conducting brief screenings, and assisting users with booking appointments for appropriate addiction treatment and care.

  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

  User Email: ${userEmail}

  Objective: 
  Engage in a quick and focused discussion with the user to understand their addiction concerns and book appropriate consultation.

  Process:
  1. Opening Question: Begin by asking ONLY if the appointment is for themselves or someone else struggling with addiction.

  2. Discussion of Concerns (ONE QUESTION AT A TIME):
     - Ask about specific addiction type first (substance use, alcohol, gambling, technology, etc.)
     - Then ask SEPARATE follow-up questions about:
       * How long they've been struggling with this addiction
       * How frequently they engage in the addictive behavior
       * Whether they've tried to quit before
       * How the addiction impacts their daily life
       * What motivated them to seek help now
     - Ask ONLY ONE question, then wait for response
     - NEVER combine multiple questions in one response
     - Silently record addiction symptoms using updateConsultation after each response
     - Never mention recording or note-taking
     - Keep responses brief and focused

  3. Appointment Booking (ONE STEP AT A TIME):
     - Working Days: Monday to Saturday (no Sundays)
     - Working Hours: 9 AM to 7 PM
     - Collect details one by one:
       * First, ONLY ask for Appointment Date (Working Days: Mon to Sat)
       * Then, in the NEXT response, ONLY ask for Appointment Time (Working Hours: 9 AM to 7 PM)
       * (email is already provided)
     - Use updateConsultation tool to record appointment details using the pre-provided email: ${userEmail}

  Tool Usage:
  - Use updateConsultation tool to record:
    * Addiction symptoms as they are reported (type, severity, duration)
    * Appointment details once confirmed
    * Assessment status updates

  Rules:
  - CRITICAL: Ask only ONE question in each response
  - Keep all responses under 2 sentences
  - No comments or observations
  - No repeated information
  - Focus on questions and booking
  - Never mention recording or notes
  - Wait for user response
  - Use updateConsultation silently
  - Always calculate and use exact dates
  - Record all addiction symptoms using the tool
  - Use the pre-provided email (${userEmail}) for calendar invite
  - Consistency: Guide the conversation smoothly and stay on topic
  - Boundaries: Avoid providing in-depth therapy during the call; focus on understanding addiction concerns and booking the appointment. Redirect if the conversation strays.
  - Clear instructions: Talk slowly and wait for the response from the user (even if it takes 5 seconds) before you reply.
  
  Example questions for addiction assessment (ask ONE at a time):
  - "What type of addiction are you seeking help for?"
  - "How long have you been struggling with this addiction?"
  - "How often do you engage in this behavior?"
  - "Have you tried to quit or reduce before?"
  - "How does this addiction affect your daily life?"
  - "What made you decide to seek help now?"
  - "On a scale of 1-10, how would you rate the severity of your addiction?"
  `;

  return sysPrompt.replace(/"/g, '\\"').replace(/\n/g, '\n');
}

const selectedTools: SelectedTool[] = [
  {
    temporaryTool: {
      modelToolName: "updateConsultation",
      description: "Update consultation details including addiction symptoms and appointment information",
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
                      description: "Name of the reported addiction symptom or behavior"
                    },
                    severity: {
                      type: "string",
                      description: "Severity level of the addiction symptom"
                    },
                    duration: {
                      type: "string",
                      description: "Duration of the addiction issue"
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
                description: "Current status of the addiction assessment"
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
  title: "Dr. Riya - Your Addiction Treatment Specialist",
  overview: "This agent facilitates addiction screenings and appointment booking with one of our addiction professionals.",
  callConfig: {
    systemPrompt: getSystemPrompt(userEmail),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    selectedTools: selectedTools,
    voice: "Monika-English-Indian",
    temperature: 0.3
  }
});

export default demoConfig;
