import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/Tabs';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Calendar, Clock, MapPin, Users, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import DOMPurify from 'dompurify';

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

function DayEvents({ events, date }) {
  const [expandedEvent, setExpandedEvent] = useState(null);

  const hasAdditionalDetails = (event) => {
    return event.description || event.location || event.attendees?.length > 0 || event.hangoutLink;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {isToday(date) ? 'Today' : format(date, 'EEEE, MMM d')}
      </h3>
      {events.map(event => (
        <div 
          key={event.id}
          className={`p-4 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${hasAdditionalDetails(event) ? 'cursor-pointer' : ''}`}
          style={{ borderLeft: `4px solid ${event.backgroundColor || '#4285f4'}` }}
          onClick={() => hasAdditionalDetails(event) && setExpandedEvent(expandedEvent === event.id ? null : event.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{event.summary}</h4>
                {hasAdditionalDetails(event) && (
                  expandedEvent === event.id ? 
                    <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
              <EventTime start={event.start} end={event.end} />
            </div>
          </div>

          {expandedEvent === event.id && hasAdditionalDetails(event) && (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              {event.description && (
                <div 
                  className="text-sm text-gray-600 dark:text-gray-400 mb-2"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(event.description, {
                      ALLOWED_TAGS: ['b', 'br', 'i', 'em', 'strong'],
                      ALLOWED_ATTR: []
                    })
                  }}
                />
              )}
              
              <div className="space-y-2">
                {event.location && (
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(event.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <MapPin className="h-4 w-4 mr-1.5" />
                    {event.location}
                  </a>
                )}

                {event.attendees?.length > 0 && (
                  <div className="flex items-start">
                    <Users className="h-4 w-4 mr-1.5 mt-1 text-gray-500 dark:text-gray-400" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {event.attendees.map(attendee => (
                        <div key={attendee.email} className="flex items-center">
                          <span className={`w-2 h-2 rounded-full mr-1.5 ${
                            attendee.responseStatus === 'accepted' ? 'bg-green-500' :
                            attendee.responseStatus === 'declined' ? 'bg-red-500' :
                            attendee.responseStatus === 'tentative' ? 'bg-yellow-500' :
                            'bg-gray-500'
                          }`} />
                          {attendee.email}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {event.hangoutLink && (
                  <a
                    href={event.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <LinkIcon className="h-4 w-4 mr-1.5" />
                    Join video call
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function WeekView({ events }) {
  const weekStart = startOfWeek(new Date());
  const weekEnd = endOfWeek(weekStart);
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="space-y-6">
      {daysOfWeek.map(date => {
        const dayEvents = events.filter(event => 
          isSameDay(new Date(event.start.dateTime || event.start.date), date)
        );
        
        if (dayEvents.length === 0) return null;
        
        return (
          <DayEvents 
            key={date.toISOString()} 
            events={dayEvents}
            date={date}
          />
        );
      })}
    </div>
  );
}

export default function CalendarEvents({ events }) {
  const { calendarVisibility } = useAuth();
  const filteredEvents = events?.filter(event => 
    calendarVisibility[event.calendarId] !== false
  ) || [];

  const todayEvents = filteredEvents.filter(event => 
    isToday(new Date(event.start.dateTime || event.start.date))
  ).sort((a, b) => 
    new Date(a.start.dateTime || a.start.date) - new Date(b.start.dateTime || b.start.date)
  );

  return (
    <Card className="w-full max-w-3xl border-gray-200 dark:border-gray-800 dark:bg-gray-800 mb-8">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2">
          <Calendar className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Calendar
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">This Week</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today">
            {todayEvents.length === 0 ? (
              <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Your schedule is clear for today</p>
              </div>
            ) : (
              <DayEvents events={todayEvents} date={new Date()} />
            )}
          </TabsContent>

          <TabsContent value="week">
            <WeekView events={filteredEvents} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}