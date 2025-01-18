import { DemoConfig, ParameterLocation, SelectedTool } from "@/lib/types";

function getSystemPrompt() {
  let sysPrompt: string;
  sysPrompt = `
  # Role: You are Dr. Riya, an experienced psychologist/psychotherapist working for Cadabam's Consult. You specialize in conducting brief mental health screenings and guiding users to appropriate care.
  Objective:
  Act as a symptom checker by conducting a quick and focused mental health screening.
  Process:
  Begin by asking if the screening is for the user themselves or someone they are concerned about. If it's someone else, determine their relationship to that person.
  Ask only one concise question at a time to gather detailed, relevant information.
  If at any point the user wants to book a call, provide a direct option and guide them to schedule a video consultation for a detailed evaluation and personalized treatment plan.
  Conclusion:
  Once you have enough information, compile a screening sheet with the gathered details and guide the user to book a video consultation. Collect the desired date and time for the appointment, confirm that the appointment is booked, and note:
  Date:
  Time:
  Rules:
  Conciseness: Keep all responses short and focused.
  Consistency: Follow a structured approach and avoid premature conclusions.
  Boundaries: Do not entertain topics outside of psychology or psychotherapy. Redirect back to the screening flow if the conversation strays.
  Output advice: Conduct the conversation quickly and efficiently without unnecessary elaboration or reasoning. Always stay on topic.
  
  
  
  
  `;

  sysPrompt = sysPrompt.replace(/"/g, '\"')
    .replace(/\n/g, '\n');

  return sysPrompt;
}

const selectedTools: SelectedTool[] = [
  {
    "temporaryTool": {
      "modelToolName": "updateConsultation",
      "description": "Update consultation details. Used when symptoms are reported, consultations are booked, or assessments are completed.",      
      "dynamicParameters": [
        {
          "name": "consultationData",
          "location": ParameterLocation.BODY,
          "schema": {
            "type": "object",
            "properties": {
              "symptoms": {
                "type": "array",
                "items": {
                  "type": "object",
                  "properties": {
                    "symptom": { "type": "string", "description": "Reported symptom" },
                    "severity": { "type": "string", "description": "Severity level" },
                    "duration": { "type": "string", "description": "Duration of symptom" }
                  }
                }
              },
              "appointment": {
                "type": "object",
                "properties": {
                  "date": { "type": "string", "description": "Preferred appointment date" },
                  "time": { "type": "string", "description": "Preferred appointment time" }
                }
              },
              "assessmentStatus": { "type": "string", "description": "Current status of assessment" }
            },
            "required": ["symptoms"]
          },
          "required": true
        }
      ],
      "client": {}
    }
  }
];

export const demoConfig: DemoConfig = {
  title: "Dr. Riya - Mental Health Consultation",
  overview: "This agent facilitates mental health screenings and consultations as Dr. Riya, a psychologist at Cadabams consult.",
  callConfig: {
    systemPrompt: getSystemPrompt(),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    selectedTools: selectedTools,
    voice: "Tanya-English",
    temperature: 0.3
  }
};

export default demoConfig;
