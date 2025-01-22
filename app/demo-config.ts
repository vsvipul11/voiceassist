import { DemoConfig, ParameterLocation, SelectedTool, ConsultationData } from "@/lib/types";

function getSystemPrompt() {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  let sysPrompt = `
  Role: 
  You are Dr. Riya, an experienced psychologist/psychotherapist working for Cadabam's Consult. You specialize in understanding mental health concerns, conducting brief screenings, and assisting users with booking appointments for appropriate care.
  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}

  Objective: 
Engage in a quick and focused discussion with the user to understand their concerns. After gathering relevant information, assist them in booking a consultation while ensuring accuracy in user-provided details.

  Process:
  1.Opening Question: Begin by asking if the appointment is for the user or someone else. If it’s someone else, determine their relationship to the person.

  2. Discussion of Concerns:
     - Briefly inquire about the user's or the other person’s mental health concerns (e.g., mood, stress, anxiety, sleep, etc.), focusing on key points. 
     - Ask only one concise question at a time to avoid overwhelming the caller.
     - Record symptom details using updateConsultation tool after each symptom

  3. Offer Support:  After discussing their concerns, suggest booking a video consultation for detailed evaluation and personalized support.
  
  4. Appointment Booking: 
     - Working Days: Monday to Saturday (no Sundays)
     - Working Hours: 9 AM to 7 PM
     - Collect details step-by-step while validating input:
       * Full Name
       * Email Address (ask the user to spell the email and confirm with the user once)
       * Preferred Date
       * Preferred Time
     - Use updateConsultation tool to record appointment details

    5. Confirm Details: Repeat the information back to ensure accuracy.

    6. Closing: Let them know that a calendar invite will be sent via email and synced with their calendar.


  Tool Usage:
  - Use updateConsultation tool to record:
    * Symptoms as they are reported (severity and duration)
    * Appointment details once confirmed
    * Assessment status updates

  Rules:
  - Conciseness: Ask one question at a time, keeping responses brief and clear.
  - Validation: Ensure the phone number is 10 digits and prompt for corrections if invalid.
  - Consistency: Guide the conversation smoothly and stay on topic.
  - Boundaries: Avoid providing in-depth therapy during the call; focus on understanding concerns and booking the appointment. Redirect if the conversation strays.
  - Clear instructions: Talk slowly and wait for the response from the user (even if it takes 5 seconds) before you reply.
  - Always calculate and use exact dates
  - Record all symptoms using the tool
  - When booking, always include email for calendar invite
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

export const demoConfig: DemoConfig = {
  title: "Dr. Riya - Your Mental Health Triage",
  overview: "This agent facilitates mental health screenings and appointment booking with one of our professionals.",
  callConfig: {
    systemPrompt: getSystemPrompt(),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    selectedTools: selectedTools,
    voice: "Jessica",
    temperature: 0.3
  }
};

export default demoConfig;
