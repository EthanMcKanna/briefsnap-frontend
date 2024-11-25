import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Calendar, Clock, MapPin, Users, Link as LinkIcon } from 'lucide-react';

const EventTime = ({ start, end }) => {
  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (start.date) {
    return (
      <div className="flex items-center text-sm">
        <Clock className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
        <span className="text-gray-700 dark:text-gray-300">
          All day
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-sm">
      <Clock className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
      <span className="text-gray-700 dark:text-gray-300">
        {formatTime(start.dateTime)}
        {end?.dateTime && ` - ${formatTime(end.dateTime)}`}
      </span>
    </div>
  );
};

export default function CalendarEvents({ events }) {
  const sortedEvents = events?.sort((a, b) => 
    new Date(a.start.dateTime) - new Date(b.start.dateTime)
  ) || [];

  return (
    <Card className="w-full max-w-3xl border-gray-200 dark:border-gray-800 dark:bg-gray-800 mb-8">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2">
          <Calendar className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Today's Schedule
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {!sortedEvents.length ? (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Your schedule is clear for today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedEvents.map(event => (
              <div 
                key={event.id} 
                className="p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex flex-col space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {event.summary}
                    </h3>
                    {event.status === 'tentative' && (
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        Tentative
                      </span>
                    )}
                  </div>
                  
                  {event.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">
                      {event.description}
                    </p>
                  )}
                  
                  <div className="flex flex-col space-y-1.5 pt-2">
                    <EventTime 
                      start={event.start} 
                      end={event.end}
                    />
                    
                    {event.location && (
                      <div className="flex items-center text-sm">
                        <MapPin className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {event.location}
                        </span>
                      </div>
                    )}

                    {event.attendees?.length > 0 && (
                      <div className="flex items-center text-sm">
                        <Users className="h-4 w-4 mr-1.5 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                          {event.attendees.length} attendee{event.attendees.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {event.hangoutLink && (
                    <a
                      href={event.hangoutLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      <LinkIcon className="h-4 w-4 mr-1.5" />
                      Join video call
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}