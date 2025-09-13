package com.cardio.ai.cardio_consult.resource;

import com.cardio.ai.cardio_consult.service.GoogleCalendarService;
import com.cardio.ai.cardio_consult.service.MeetingService;
import com.cardio.ai.cardio_consult.service.dto.MeetingRequestDTO;
import com.google.api.services.calendar.model.TimePeriod;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZonedDateTime;
import java.util.List;

@RestController
public class MeetingResource {

    @Autowired
    private MeetingService meetingService;

    @PostMapping("/create-meeting")
    public ResponseEntity<String> createMeeting(@RequestBody MeetingRequestDTO meetingRequestDTO) {
        return meetingService.sendCalendarMeeting(meetingRequestDTO);
    }

    @GetMapping("/available-slots")
    public ResponseEntity<List<ZonedDateTime>> fetchAvailableSlots(){
        return meetingService.fetchAllAvailableSlots();
    }
}