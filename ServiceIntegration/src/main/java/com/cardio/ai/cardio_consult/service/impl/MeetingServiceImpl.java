package com.cardio.ai.cardio_consult.service.impl;

import com.cardio.ai.cardio_consult.service.GoogleCalendarService;
import com.cardio.ai.cardio_consult.service.MeetingService;
import com.cardio.ai.cardio_consult.service.dto.MeetingRequestDTO;
import com.google.api.services.calendar.model.TimePeriod;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MeetingServiceImpl implements MeetingService {

    private static final Logger log = LoggerFactory.getLogger(MeetingServiceImpl.class);

    private final GoogleCalendarService calendarService;

    public MeetingServiceImpl(GoogleCalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @Value("${doctor.email}")
    private String doctorEmail;

    @Override
    public ResponseEntity<String> sendCalendarMeeting(MeetingRequestDTO meetingRequestDTO) {
        log.info("Sending calendar invite to user email: {}", meetingRequestDTO);
        try {
            String userEmail = meetingRequestDTO.userEmail();
            String meetLink = calendarService.createMeeting(userEmail, doctorEmail, meetingRequestDTO.startTime());
            return ResponseEntity.ok(meetLink);
        } catch (Exception e) {
            log.debug("Exception occured while creating meeting: {}", e.getMessage(), e);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public ResponseEntity<List<ZonedDateTime>> fetchAllAvailableSlots() {
        try {
            return ResponseEntity.ok(calendarService.findOrganizerSlots(LocalDate.now(), doctorEmail));
        } catch (IOException e) {
            log.debug("Exception occured while fetching meeting slots: {}", e.getMessage(), e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
