// src/lib/GoogleCalendarService.ts
export class GoogleCalendarService {
    private static instance: GoogleCalendarService;
    private gapi: any;
    private initialized: boolean = false;
    private initializationPromise: Promise<void> | null = null;
  
    private constructor() {}
  
    static getInstance(): GoogleCalendarService {
      if (!GoogleCalendarService.instance) {
        GoogleCalendarService.instance = new GoogleCalendarService();
      }
      return GoogleCalendarService.instance;
    }
  
    async init(): Promise<void> {
      if (this.initialized) return;
      
      // If already initializing, return the existing promise
      if (this.initializationPromise) {
        return this.initializationPromise;
      }
  
      this.initializationPromise = new Promise((resolve, reject) => {
        // Check if gapi is already loaded
        if ((window as any).gapi) {
          this.initializeGapi(resolve, reject);
        } else {
          // Load the Google API client library
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = () => this.initializeGapi(resolve, reject);
          script.onerror = (error) => {
            console.error('Failed to load Google API script:', error);
            reject(error);
          };
          document.body.appendChild(script);
        }
      });
  
      try {
        await this.initializationPromise;
        this.initialized = true;
      } catch (error) {
        this.initializationPromise = null;
        throw error;
      }
  
      return this.initializationPromise;
    }
  
    private initializeGapi(resolve: (value: void) => void, reject: (reason?: any) => void): void {
      const gapi = (window as any).gapi;
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
            scope: 'https://www.googleapis.com/auth/calendar.events'
          });
          this.gapi = gapi;
          resolve();
        } catch (error) {
          console.error('Failed to initialize Google API client:', error);
          reject(error);
        }
      });
    }
  
    async createEvent(date: string, time: string, email: string): Promise<any> {
      // Try to initialize if not already initialized
      if (!this.initialized) {
        try {
          await this.init();
        } catch (error) {
          console.error('Failed to initialize Google Calendar service:', error);
          throw new Error('Unable to initialize calendar service. Please try again.');
        }
      }
  
      try {
        // Ensure user is signed in
        if (!this.gapi.auth2.getAuthInstance().isSignedIn.get()) {
          await this.gapi.auth2.getAuthInstance().signIn();
        }
  
        // Combine date and time for event
        const startDateTime = new Date(`${date}T${time}`);
        const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000); // 1 hour duration
  
        const event = {
          'summary': 'Mental Health Consultation - Cadabam\'s Consult',
          'description': 'Video consultation with Dr. Riya',
          'start': {
            'dateTime': startDateTime.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          'end': {
            'dateTime': endDateTime.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
          },
          'attendees': [
            {'email': email}
          ],
          'reminders': {
            'useDefault': false,
            'overrides': [
              {'method': 'email', 'minutes': 24 * 60},
              {'method': 'popup', 'minutes': 30}
            ]
          },
          'conferenceData': {
            'createRequest': {
              'requestId': `consultation-${Date.now()}`,
              'conferenceSolutionKey': {
                'type': 'hangoutsMeet'
              }
            }
          }
        };
  
        const request = await this.gapi.client.calendar.events.insert({
          'calendarId': 'primary',
          'resource': event,
          'sendUpdates': 'all',
          'conferenceDataVersion': 1
        });
  
        return request.result;
      } catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
      }
    }
  }