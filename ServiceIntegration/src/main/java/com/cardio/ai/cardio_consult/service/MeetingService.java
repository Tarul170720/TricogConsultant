package com.cardio.ai.cardio_consult.service;

import com.cardio.ai.cardio_consult.service.dto.MeetingRequestDTO;
import com.google.api.services.calendar.model.TimePeriod;
import org.springframework.http.ResponseEntity;

import java.time.ZonedDateTime;
import java.util.List;

public interface MeetingService {

    public ResponseEntity<String> sendCalendarMeeting(MeetingRequestDTO meetingRequestDTO);

    public ResponseEntity<List<ZonedDateTime>> fetchAllAvailableSlots(String doctorEmail);
}
