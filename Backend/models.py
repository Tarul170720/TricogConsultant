from sqlalchemy import Column, Integer, String, ForeignKey, JSON, ARRAY
from sqlalchemy.orm import relationship
from db import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(String, nullable=False)
    email = Column(String, unique=True, index=True)

    # ✅ relationship back to Consult
    consults = relationship("Consult", back_populates="patient", cascade="all, delete-orphan")


class Consult(Base):
    __tablename__ = "consults"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    # Store list of reported symptoms
    symptoms = Column(JSON, default=list)  # or Column(JSON) if your DB doesn’t support ARRAY

    # Dict of {symptom_key: [ {question, answer, doctor_note?}, ... ]}
    follow_up_answers = Column(JSON, default={})

    status = Column(String, default="in_progress")

    # ✅ urgency added
    urgency = Column(String, default="normal")  # normal | semi-urgent | urgent | very_urgent

    patient = relationship("Patient", back_populates="consults")


class SymptomRule(Base):
    __tablename__ = "symptom_rules"

    id = Column(Integer, primary_key=True, index=True)
    symptom_key = Column(String, unique=True, index=True, nullable=False)

    # List of follow-up questions for this symptom
    follow_up_questions = Column(ARRAY(String))

    # Base urgency if symptom is present
    urgency = Column(String, default="normal")  # normal | semi-urgent | urgent | very_urgent


class FollowUpRule(Base):
    __tablename__ = "followup_rules"

    id = Column(Integer, primary_key=True, index=True)

    # Must match SymptomRule.symptom_key
    symptom_key = Column(String, ForeignKey("symptom_rules.symptom_key"), nullable=False)

    # Regex to match follow-up question text
    question_pattern = Column(String, nullable=False)

    # Answers that trigger escalation
    trigger_values = Column(ARRAY(String), nullable=False)

    # Escalated urgency
    new_urgency = Column(String, nullable=False)  # high, medium, low OR normal | semi-urgent | urgent | very_urgent
