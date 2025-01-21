// src/components/CalendarEventHandler.tsx
import React, { useState } from 'react';
import { GoogleCalendarService } from '@/lib/GoogleCalendarService';

interface CalendarEventHandlerProps {
    date: string;
    time: string;
    email: string;
    onSuccess: () => void;
    onError: (error: string) => void;
}

export const CalendarEventHandler: React.FC<CalendarEventHandlerProps> = ({
    date,
    time,
    email,
    onSuccess,
    onError
}) => {
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateEvent = async () => {
        setIsCreating(true);
        const calendarService = GoogleCalendarService.getInstance();

        try {
            await calendarService.createEvent(date, time, email);
            onSuccess();
        } catch (error) {
            onError(error instanceof Error ? error.message : 'Failed to create calendar event');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <button
            onClick={handleCreateEvent}
            disabled={isCreating}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
            {isCreating ? 'Creating event...' : 'Schedule Consultation'}
        </button>
    );
};