package com.cardio.ai.cardio_consult.service;

import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.EventAttendee;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TimeZone;

@Service
public class GoogleCalendarService {

    private final Calendar calendar;

    public GoogleCalendarService(Calendar calendar) {
        this.calendar = calendar;
    }

    public String createMeeting(String startTime, String endTime, String userEmail) throws IOException {
        Event event = new Event()
                .setSummary("doc consult")
                .setDescription("consult");

        EventDateTime start = new EventDateTime()
                .setDateTime(new com.google.api.client.util.DateTime(startTime))
                .setTimeZone(TimeZone.getDefault().getID());
        event.setStart(start);

        EventDateTime end = new EventDateTime()
                .setDateTime(new com.google.api.client.util.DateTime(endTime))
                .setTimeZone(TimeZone.getDefault().getID());
        event.setEnd(end);

        List<EventAttendee> attendees = new ArrayList<>();
        attendees.add(new EventAttendee().setEmail(userEmail));
        attendees.add(new EventAttendee().setEmail("bvaameena@gmail.com"));

        event.setAttendees(attendees);

        event = calendar.events().insert("primary", event).setSendUpdates("all").execute();
        return event.getHtmlLink();
    }
}
