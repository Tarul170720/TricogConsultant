package com.cardio.ai.cardio_consult.service.impl;

import com.cardio.ai.cardio_consult.entity.Doctor;
import com.cardio.ai.cardio_consult.repository.DoctorRepository;
import com.cardio.ai.cardio_consult.service.TelegramService;
import com.cardio.ai.cardio_consult.service.dto.TelegramMessageDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.Map;

@Service
public class TelegramServiceImpl implements TelegramService {

    private RestClient restClient;

    private static final String URL = "https://api.telegram.org/bot";

    @Value("${telegram.api.bot_token}")
    private String BOT_TOKEN;

    @Autowired
    private DoctorRepository doctorRepository;

    private static final String SEND_MESSAGE = "/sendMessage";

    @Override
    public ResponseEntity<String> sendTelegramNotification(TelegramMessageDTO messageDTO) {
        try {
            restClient = RestClient.builder().build();
            Map<String, Object> requestBody = new HashMap<>();
            Doctor doctor = doctorRepository.getReferenceById(1l);
            requestBody.put("chat_id", doctor.getChatId());
            requestBody.put("text", messageDTO.getMessage());
            ParameterizedTypeReference<Map<String, Object>> parameterizedTypeReference = new ParameterizedTypeReference<Map<String, Object>>() {
            };
            ResponseEntity<Map<String, Object>> responseEntity = restClient.post().uri(new URI(URL + BOT_TOKEN + SEND_MESSAGE)).body(requestBody).retrieve().toEntity(parameterizedTypeReference);
            return ResponseEntity.ok("notification sent");
        } catch (URISyntaxException e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
