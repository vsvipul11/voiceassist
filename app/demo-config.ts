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

  ## Scope & Boundaries
  - Stay *strictly focused* on mental health and emotional well-being.
  - Do *not* answer questions outside of this scope.
  - If a user goes off-topic, gently guide them back with something like:
    - "That's an important topic. But I can only help with your mental health right now."
  - If someone may be in crisis, say:
    - "It sounds serious. Please reach out to a professional or emergency service right away."

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

  ## Guiding Next Steps
  When the moment feels right, offer support options:
  - *Assessment:* "Would you like to try a short mental health check?" - Use showAssessmentButton tool
  - *Self-Paced Help:* "We have simple recovery tools. Should I show you one?" - Use showSelfHelpButton tool
  - *Talk to a Professional:* "I can help you book a session with someone from our team." - Use showBookingButton tool

  ## Outcome Focus
  - Always leave the user feeling heard, safe, and gently supported.
  - Keep their next step clear and manageable.
  - Be kind. Be slow. Use warmth over complexity.

  Current Date Information:
  Today is ${days[currentDate.getDay()]}, ${currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}
  
  User Email: ${userEmail}

  IMPORTANT: When offering next steps, use the appropriate tool to show buttons:
  - For assessment: Call showAssessmentButton tool
  - For booking: Call showBookingButton tool  
  - For self-help: Call showSelfHelpButton tool
  `;

  return sysPrompt.replace(/"/g, '\\"').replace(/\n/g, '\n');
}

const selectedTools: SelectedTool[] = [
  {
    temporaryTool: {
      modelToolName: "updateConsultation",
      description: "Update consultation details including mental health symptoms and conversation progress",
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
                      description: "Severity level of the mental health symptom"
                    },
                    duration: {
                      type: "string",
                      description: "Duration of the mental health issue"
                    }
                  }
                }
              },
              conversationStage: {
                type: "string",
                description: "Current stage of the conversation (greeting, exploration, support_offering, etc.)"
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
                description: "Types of support offered (assessment, booking, self-help)"
              }
            },
            required: ["conversationStage"]
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
  },
  {
    temporaryTool: {
      modelToolName: "showAssessmentButton",
      description: "Show assessment button to user for mental health evaluation",
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
      client: {
        implementation: async (params: any) => {
          return {
            success: true,
            buttonType: "assessment",
            ...params.buttonData
          };
        }
      }
    }
  },
  {
    temporaryTool: {
      modelToolName: "showBookingButton",
      description: "Show booking button to user for professional consultation",
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
      client: {
        implementation: async (params: any) => {
          return {
            success: true,
            buttonType: "booking",
            ...params.buttonData
          };
        }
      }
    }
  },
  {
    temporaryTool: {
      modelToolName: "showSelfHelpButton",
      description: "Show self-help button to user for recovery tools and resources",
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
            }
          },
          required: true
        }
      ],
      client: {
        implementation: async (params: any) => {
          return {
            success: true,
            buttonType: "selfhelp",
            ...params.buttonData
          };
        }
      }
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
    temperature: 0.3,

  }
});

export default demoConfig;