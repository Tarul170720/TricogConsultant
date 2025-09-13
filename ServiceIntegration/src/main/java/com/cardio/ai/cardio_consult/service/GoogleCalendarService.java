package com.cardio.ai.cardio_consult.service;

import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.*;
import java.util.*;

@Service
public class GoogleCalendarService {

    private static final Logger log = LoggerFactory.getLogger(GoogleCalendarService.class);

    private final Calendar calendar;

    public GoogleCalendarService(Calendar calendar) {
        this.calendar = calendar;
    }

    public String createMeeting(String userEmail, String organizerEmail, TimePeriod timePeriod) throws IOException {
        Event event = new Event()
                .setSummary("Cardiology consult")
                .setDescription("consult with doctor for " + userEmail + " via CardioConsult");

        EventDateTime start = new EventDateTime()
                .setDateTime(timePeriod.getStart())
                .setTimeZone(TimeZone.getDefault().getID());
        event.setStart(start);
        EventDateTime end = new EventDateTime()
                .setDateTime(timePeriod.getEnd())
                .setTimeZone(TimeZone.getDefault().getID());
        event.setEnd(end);

        List<EventAttendee> attendees = new ArrayList<>();
        attendees.add(new EventAttendee().setEmail(userEmail));
        attendees.add(new EventAttendee().setEmail(organizerEmail).setOrganizer(true));
        event.setAttendees(attendees);

        ConferenceData conferenceData = new ConferenceData()
                .setCreateRequest(new CreateConferenceRequest()
                        .setRequestId(UUID.randomUUID().toString()) // unique per request
                        .setConferenceSolutionKey(
                                new ConferenceSolutionKey().setType("hangoutsMeet")
                        )
                );

        event.setConferenceData(conferenceData);

        event = calendar.events()
                .insert("primary", event)
                .setConferenceDataVersion(1)   // required for Meet link
                .setSendUpdates("all")         // notify attendees
                .execute();

        return event.getHtmlLink();
    }

    public Optional<TimePeriod> findNextAvailableSlot(String email) throws IOException {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        ZonedDateTime startSearch = now.plusHours(1).withMinute(0);   // search starting 1h from now
        ZonedDateTime endSearch = now.plusHours(3);     // search within next 8 hours

        FreeBusyRequest request = new FreeBusyRequest()
                .setTimeMin(new DateTime(Date.from(startSearch.toInstant())))
                .setTimeMax(new DateTime(Date.from(endSearch.toInstant())));

        List<FreeBusyRequestItem> items = new ArrayList<>();
        items.add(new FreeBusyRequestItem().setId(email));
        request.setItems(items);
        FreeBusyResponse response = calendar.freebusy().query(request).execute();

        // Build busy slots per attendee
        List<List<TimePeriod>> busyLists = new ArrayList<>();

        var calendarBusy = response.getCalendars().get(email).getBusy();
        busyLists.add(calendarBusy);

        // Scan in 15-min increments from startSearch to endSearch
        ZonedDateTime slotStart = now.plusHours(1);
        while (slotStart.isBefore(endSearch)) {
            ZonedDateTime slotEnd = slotStart.plusMinutes(15);

            boolean allFree = true;
            for (List<TimePeriod> busyPeriods : busyLists) {
                for (TimePeriod busy : busyPeriods) {
                    ZonedDateTime busyStart = ZonedDateTime.ofInstant(
                            Instant.ofEpochMilli(busy.getStart().getValue()), ZoneId.systemDefault());
                    ZonedDateTime busyEnd = ZonedDateTime.ofInstant(
                            Instant.ofEpochMilli(busy.getEnd().getValue()), ZoneId.systemDefault());
                    if (slotStart.isAfter(busyEnd) || slotEnd.isBefore(busyStart)) {
                        allFree = false;
                        break;
                    }
                }
                if (!allFree) break;
            }
            if (allFree) {
                TimePeriod freeSlot = new TimePeriod()
                        .setStart(new DateTime(Date.from(slotStart.toInstant())))
                        .setEnd(new DateTime(Date.from(slotEnd.toInstant())));
                return Optional.of(freeSlot);
            }
            slotStart = slotStart.plusMinutes(15);
        }
        return Optional.empty(); // no common slot found
    }

    public List<ZonedDateTime> findOrganizerSlots(LocalDate date,
                                               String organizerEmail) throws IOException {

        LocalTime workStart = LocalTime.of(10, 0);
        LocalTime workEnd = LocalTime.of(17, 30);
        ZonedDateTime dayStart = ZonedDateTime.of(date, workStart, ZoneId.systemDefault());
        ZonedDateTime dayEnd   = ZonedDateTime.of(date, workEnd, ZoneId.systemDefault());

        // Request busy times only for the organizer
        FreeBusyRequest request = new FreeBusyRequest()
                .setTimeMin(new DateTime(Date.from(dayStart.toInstant())))
                .setTimeMax(new DateTime(Date.from(dayEnd.toInstant())));

        List<FreeBusyRequestItem> items = new ArrayList<>();
        items.add(new FreeBusyRequestItem().setId(organizerEmail));
        request.setItems(items);

        FreeBusyResponse response = calendar.freebusy().query(request).execute();

        List<TimePeriod> busyPeriods = response.getCalendars()
                .get(organizerEmail)
                .getBusy();

        List<ZonedDateTime> availableSlots = new ArrayList<>();
        ZonedDateTime slotStart = dayStart;

        // Walk in 15-min steps
        while (!slotStart.plusMinutes(15).isAfter(dayEnd)) {
            ZonedDateTime slotEnd = slotStart.plusMinutes(15);

            ZonedDateTime finalSlotStart = slotStart;
            boolean isFree = busyPeriods.stream().noneMatch(busy -> {
                ZonedDateTime busyStart = Instant.ofEpochMilli(busy.getStart().getValue())
                        .atZone(ZoneId.systemDefault());
                ZonedDateTime busyEnd = Instant.ofEpochMilli(busy.getEnd().getValue())
                        .atZone(ZoneId.systemDefault());

                // overlap check
                return !(slotEnd.isBefore(busyStart) || finalSlotStart.isAfter(busyEnd));
            });

            if (isFree) {
                availableSlots.add(slotStart);
            }

            slotStart = slotStart.plusMinutes(15);
        }

        return availableSlots;
    }
}
