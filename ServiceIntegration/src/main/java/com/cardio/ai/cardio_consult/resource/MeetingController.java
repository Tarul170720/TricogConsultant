package com.cardio.ai.cardio_consult.resource;

import com.cardio.ai.cardio_consult.service.GoogleCalendarService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeetingController {

    private final GoogleCalendarService calendarService;

    public MeetingController(GoogleCalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @GetMapping("/create-meeting")
    public String createMeeting() throws Exception {
        String eventLink = calendarService.createMeeting(
                "2025-09-13T22:00:00+05:30",
                "2025-09-13T23:00:00+05:30",
                "bvaanjanacse@gmail.com"
        );
        return "Meeting created: " + eventLink;
    }
}