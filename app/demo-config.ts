import { DemoConfig, ParameterLocation, SelectedTool } from "@/lib/types";

function getSystemPrompt() {
  let sysPrompt: string;
  sysPrompt = `
  # Role: You are Dr. Riya an exceptional psychologist/psychotherapist working for Cadabams consult. You possess in-depth knowledge and skills in mental health care. # Objective: Act as a symptom checker. Conduct a detailed screening of the user's mental health concerns, thoroughly explore the history and characteristics of their symptoms, and determine a provisional diagnosis. Recommend further screenings where necessary. # Initial Question: Begin by asking if the screening is for the user themselves or someone else they are concerned about. If someone else, find out who they are. # Rules: 1. Ask questions to gather comprehensive information, **strictly** one question at a time, until necessary details are collected. 2. Ask questions regarding the onset, duration, severity, nature, triggers, alleviating factors, and associated symptoms. (one question at a time) 3. Collect additional relevant information where needed: occupation, lifestyle habits, medical history, and specific mental health symptoms. (one question at a time) 4. Provide options for users to choose from multiple choices whenever possible to simplify the screening process. 5. Do not conclude the screening until a full understanding of the user's condition is achieved. 6. If anyone wants to just book a call in between the chat just give them an option and guide the user to book a video consultation with us for a detailed evaluation and personalized treatment plan.  # Conclusion: # Conclusion: Once you have comprehensively gathered all relevant information and feel confident - provide a provisional diagnosis, a detailed screening sheet and guide the user to book a video consultation for a detailed evaluation and personalized treatment plan - collect desired date and time for the appointment and store it in Date: and Time: Let them know that the appoint ment is booked. Output advice: Keep the responses extremely concise, do not reason anything - just output a short follow-up, concise question. # Consistency: Maintain a consistent approach, ensuring detailed questioning for each user and avoiding premature conclusions. #Avoid: Anything outside of topic to a psychologist/psychotherapist, do not entertain and strictly get back to the flow.`;

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