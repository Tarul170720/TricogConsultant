from pydantic import BaseModel
from datetime import datetime
from typing import List, Dict, Any, Optional
from typing import List, Optional

class SymptomBase(BaseModel):
    description: str

class SymptomCreate(SymptomBase):
    pass

class Symptom(SymptomBase):
    id: int
    class Config:
        orm_mode = True

class ConsultBase(BaseModel):
    notes: Optional[str] = None

class ConsultCreate(ConsultBase):
    patient_id: int

class Consult(ConsultBase):
    id: int
    symptoms: List[Symptom] = []
    class Config:
        orm_mode = True

class PatientBase(BaseModel):
    name: str
    email: str

class PatientCreate(PatientBase):
    pass

class PatientOut(PatientBase):
    id: int

    class Config:
        orm_mode = True

class PatientOut(BaseModel):
    id: int
    name: str
    age: Optional[str]
    email: str
    created_at: datetime
    class Config:
        orm_mode = True


class ConsultOut(BaseModel):
    id: int
    patient_id: int
    symptoms: List[str]
    follow_up_answers: Dict[str, Any]
    urgency: str
    status: str
    created_at: datetime
    class Config:
        orm_mode = True


class SymptomRuleOut(BaseModel):
    symptom: str
    questions: List[str]
    urgency: str


class FollowUpRuleOut(BaseModel):
    symptom_key: str
    question_pattern: str
    trigger_values: List[str]
    new_urgency: str