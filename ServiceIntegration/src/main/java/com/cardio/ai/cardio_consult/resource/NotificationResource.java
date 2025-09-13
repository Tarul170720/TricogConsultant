package com.cardio.ai.cardio_consult.resource;

import com.cardio.ai.cardio_consult.service.GoogleCalendarService;
import com.cardio.ai.cardio_consult.service.TelegramService;
import com.cardio.ai.cardio_consult.service.dto.TelegramMessageDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notification")
public class NotificationResource {

    @Autowired
    TelegramService telegramService;

    @Autowired
    GoogleCalendarService calendarService;

    @PostMapping("/send")
    public ResponseEntity<String> sendTelegramNotification(@RequestBody TelegramMessageDTO messageDTO){
        return telegramService.sendTelegramNotification(messageDTO);
    }
}
