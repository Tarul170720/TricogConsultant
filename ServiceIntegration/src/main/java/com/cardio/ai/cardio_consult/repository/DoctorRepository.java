package com.cardio.ai.cardio_consult.repository;

import com.cardio.ai.cardio_consult.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {

}
