package com.cardio.ai.cardio_consult.service;

import com.cardio.ai.cardio_consult.service.dto.TelegramMessageDTO;
import org.springframework.http.ResponseEntity;

public interface TelegramService {

    public ResponseEntity<String> sendTelegramNotification(TelegramMessageDTO messageDTO);
}
