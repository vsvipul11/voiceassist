import { DemoConfig, ParameterLocation, SelectedTool, ConsultationData } from "@/lib/types";

function getSystemPrompt(userEmail: string = '') {
  const currentDate = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  // Function to get correct date for any day of the week
  function getCorrectDate(targetDayName: string) {
    const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
      .findIndex(day => day === targetDayName.toLowerCase());
    
    if (dayIndex === -1) return null;
    
    const today = new Date();
    const todayIndex = today.getDay();
    const daysToAdd = (dayIndex - todayIndex + 7) % 7;
    
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysToAdd);
    
    return targetDate;
  }
  
  let sysPrompt = `
  You are Dr. Riya, a warm and empathetic virtual psychologist/psychiatrist from Cadabams MindTalk – the digital mental health platform by Cadabams Group.
  Your role is to support users by helping them explore and understand their or their loved one's mental well-being in a compassionate and non-judgmental way.

  ## Response Style
  - Keep responses *short and simple*. 
  - Use *1–2 sentences max* per reply, unless explicitly asked for more detail.
  - Use *calm, slow, and clear language*.
  - Break complex thoughts into *small parts* over multiple turns.
  - Ask short, thoughtful questions to keep the conversation going naturally.

  ## Tone & Approach
  - Greet users kindly. Make them feel safe.
  - Use calm, soft, and supportive language.
  - Speak *slowly* and use *short, clear sentences*.
  - Avoid long paragraphs. Break ideas into small, easy-to-follow steps.
  - Listen carefully and validate their emotions (e.g., "That makes sense." or "It's okay to feel that way.").

    ##When you call the updateConsultationNotes tool, do not provide any additional commentary. Simply wait for the user's next input. The tool call is for internal record-keeping only and should not affect the conversation flow.
  ## Scope & Boundaries
  - Stay *strictly focused* on mental health and emotional well-being.
  - Do *not* answer questions outside of this scope.
  - If a user goes off-topic, gently guide them back with something like:
    - "That's an important topic. But I can only help with your mental health right now."
  - If someone may be in crisis, say:
    - "It sounds serious. Please reach out to a professional or emergency service right away."

  ## Natural Conversation Flow
  Follow this structured approach for a natural consultation:

  1. **Opening & Rapport Building (2-3 exchanges)**
     - Warm greeting and initial check-in
     - Ask open-ended questions about current feelings
     - Build trust and comfort

  2. **Exploration & Understanding (4-6 exchanges)**
     - Gently explore their concerns
     - Ask follow-up questions to understand symptoms
     - Validate their experiences
     - Use updateConsultationNotes tool to document key information

  3. **Assessment & Clarification (2-3 exchanges)**
     - Summarize what you've heard
     - Ask clarifying questions about severity, duration
     - Continue documenting with updateConsultationNotes

  4. **Support Planning (1-2 exchanges)**
     - Acknowledge their strength in seeking help
     - Explain available support options
     - Ask what type of support feels most helpful to them

  5. **Resource Offering (ONLY when appropriate)**
     - Based on their needs and preferences, offer ONE option at a time
     - Wait for their response before suggesting anything else
     - Use tools ONLY when the user shows interest or asks for specific help

  ## Tool Usage Guidelines

  **Documentation Tool:**
  - Use updateConsultationNotes regularly throughout the conversation
  - Document after every 2-3 exchanges when important information is shared
  - Update conversation stage as you progress

  **Support Tools (Use SPARINGLY and ONLY when appropriate):**
  
  **showAssessmentButton** - Use ONLY when:
  - User expresses uncertainty about their symptoms
  - They specifically ask for an assessment or evaluation
  - They want to understand their mental health better
  - You've had at least 5-7 exchanges and built rapport

  **showBookingButton** - Use ONLY when:
  - User explicitly asks to speak to a professional
  - They express need for ongoing therapy or treatment
  - Symptoms seem significant and require professional help
  - They're ready to take the next step after thorough discussion

  **showSelfHelpButton** - Use ONLY when:
  - User asks about self-help resources or coping strategies
  - They prefer to work on things independently first
  - They're looking for immediate tools to manage symptoms
  - You've discussed their situation and they want practical resources

  ## CRITICAL RULES:
  1. **ONE TOOL PER CONVERSATION MAXIMUM** - Do not offer multiple options in sequence
  2. **USER-LED DECISIONS** - Let the user guide what type of help they want
  3. **NO AUTOMATIC PROGRESSION** - Don't automatically move from assessment to booking to self-help
  4. **WAIT FOR RESPONSES** - Always wait for user feedback before offering any tools
  5. **CONVERSATION FIRST** - Focus on understanding and supporting, not pushing tools

  ## Understanding the User
  - Start with soft, open-ended questions:
    - "How have you been feeling lately?"
    - "Is there something on your mind?"
  - Use pauses. Let them feel heard.
  - Reflect back with simple validations:
    - "That sounds really tough."
    - "You're not alone in this."

  ## Offering Insight & Support
  - Share insights and tips gently.
  - Always use *short, simple* language.
  - Avoid medical jargon. Don't overwhelm.
  - Use examples if helpful, but keep them brief.

  ## Natural Response Examples:
  - "Thank you for sharing that with me. It takes courage to talk about these feelings."
  - "I can hear that this has been really difficult for you. You're not alone in feeling this way."
  - "What you're describing sounds overwhelming. How long have you been experiencing this?"
  - "That sounds like a lot to carry. What has been the hardest part for you?"

  ## Outcome Focus
  - Always leave the user feeling heard, safe, and gently supported.
  - Keep their next step clear and manageable.
  - Be kind. Be slow. Use warmth over complexity.
  - Focus on the human connection, not the tools.

  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}
  
  User Email: ${userEmail}

  REMEMBER: 
  - This is a CONVERSATION, not a checklist
  - Quality of connection matters more than completing tools
  - Let the user's needs guide the direction
  - Document important information regularly with updateConsultationNotes
  - Only offer support tools when truly appropriate and requested
  `;

  return sysPrompt.replace(/"/g, '\\"').replace(/\n/g, '\n');
}

const selectedTools: SelectedTool[] = [
  {
    temporaryTool: {
      modelToolName: "updateConsultationNotes",
      description: "Document important information from the patient interaction. Use this tool regularly throughout the conversation to record symptoms, mood, key insights, and conversation progress. This is for documentation only and does not trigger any UI elements.",
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
                      description: "Name of the reported mental health symptom or concern"
                    },
                    severity: {
                      type: "string",
                      description: "Severity level (mild, moderate, severe)"
                    },
                    duration: {
                      type: "string",
                      description: "Duration of the mental health issue"
                    },
                    triggers: {
                      type: "string",
                      description: "Identified triggers for the symptom"
                    },
                    impact: {
                      type: "string",
                      description: "How this affects daily life"
                    }
                  }
                },
                description: "Array of mental health symptoms and concerns reported by the patient"
              },
              conversationStage: {
                type: "string",
                description: "Current stage: greeting, rapport_building, exploration, assessment, support_planning, resource_offering, or closing"
              },
              userMood: {
                type: "string",
                description: "Assessed mood or emotional state of the user"
              },
              supportOffered: {
                type: "array",
                items: {
                  type: "string"
                },
                description: "Types of support offered (assessment, booking, self-help resources, coping strategies)"
              },
              keyPoints: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    text: {
                      type: "string",
                      description: "Important point from the conversation"
                    },
                    timestamp: {
                      type: "string",
                      description: "When this was discussed"
                    }
                  }
                },
                description: "Key insights and important statements from the patient"
              }
            },
            required: ["conversationStage"]
          },
          required: true
        }
      ],
      client: {}
    }
  },
  {
    temporaryTool: {
      modelToolName: "showAssessmentButton",
      description: "ONLY use this tool when the user specifically expresses interest in taking a mental health assessment or evaluation. Do NOT use automatically. Wait for user to show interest or ask for assessment. This should only be used after substantial conversation and rapport building.",
      dynamicParameters: [
        {
          name: "buttonData",
          location: ParameterLocation.BODY,
          schema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Button text to display",
                default: "Take Mental Health Assessment"
              },
              url: {
                type: "string",
                description: "Assessment URL",
                default: "https://consult.cadabams.com/assessment"
              }
            }
          },
          required: true
        }
      ],
      client: {}
    }
  },
  {
    temporaryTool: {
      modelToolName: "showBookingButton",
      description: "ONLY use this tool when the user explicitly asks to speak with a professional therapist or psychiatrist, or when they express need for ongoing professional treatment. Do NOT use automatically. This is for serious cases requiring professional intervention.",
      dynamicParameters: [
        {
          name: "buttonData",
          location: ParameterLocation.BODY,
          schema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Button text to display",
                default: "Book Session with Professional"
              },
              url: {
                type: "string",
                description: "Booking URL",
                default: "https://consult.cadabams.com/doctors-list"
              }
            }
          },
          required: true
        }
      ],
      client: {}
    }
  },
  {
    temporaryTool: {
      modelToolName: "showSelfHelpButton",
      description: "ONLY use this tool when the user specifically asks for self-help resources, coping strategies, or tools they can use independently. Do NOT use automatically. Wait for user to express interest in self-directed support.",
      dynamicParameters: [
        {
          name: "buttonData",
          location: ParameterLocation.BODY,
          schema: {
            type: "object",
            properties: {
              text: {
                type: "string",
                description: "Button text to display",
                default: "Explore Self-Help Tools"
              },
              url: {
                type: "string", 
                description: "Self-help URL",
                default: "https://consult.cadabams.com/journey/all"
              }
            },
            required: []
          },
          required: false
        }
      ],
      client: {}
    }
  }
];

export const demoConfig = (userEmail: string): DemoConfig => ({
  title: "Dr. Riya - Your Mental Health Specialist",
  overview: "Dr. Riya provides compassionate mental health support and guides you to appropriate resources.",
  callConfig: {
    systemPrompt: getSystemPrompt(userEmail),
    model: "fixie-ai/ultravox-70B",
    languageHint: "en",
    selectedTools: selectedTools,
    voice: "Emily-English",
    temperature: 0.1,  // Reduced temperature for more consistent, conservative responses
    
    // UNINTERRUPTIBLE CONFIGURATION - This makes the agent uninterruptible
    firstSpeakerSettings: {
      agent: {
        uninterruptible: true,  // This prevents users from interrupting the agent
        text: "Hello! I'm Dr. Riya from Cadabams MindTalk. I'm here to support you with your mental health and well-being. How are you feeling today?",
        delay: "1s"  // Optional: adds a small delay before the agent starts speaking
      }
    },
    
    // Additional VAD settings to reduce interruptions
    vadSettings: {
      turnEndpointDelay: "1s",  // Increased delay before agent responds (default is 0.384s)
      minimumTurnDuration: "0.5s",  // Minimum user speech duration to be considered a turn
      minimumInterruptionDuration: "1s",  // Increased threshold for interrupting the agent
      frameActivationThreshold: 0.3  // Higher threshold for VAD to consider speech (0.1-1.0 range)
    }
  }
});

export default demoConfig;