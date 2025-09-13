package com.cardio.ai.cardio_consult.service.dto;

import java.time.ZonedDateTime;

public record MeetingRequestDTO(String userEmail, ZonedDateTime startTime) {
}
