from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_current_staff, get_current_user
from app.crud.crud_doctor import doctor
from app.schemas.doctor import Doctor, DoctorCreate, DoctorUpdate, DoctorWithAvailability, AvailabilityCreate
from app.schemas.user import User
from app.db.session import get_db

router = APIRouter()

@router.get("/", response_model=List[Doctor])
def read_doctors(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve doctors.
    """
    doctors = doctor.get_multi(db, skip=skip, limit=limit)
    return doctors

@router.post("/", response_model=Doctor)
def create_doctor(
    *,
    db: Session = Depends(get_db),
    doctor_in: DoctorCreate,
) -> Any:
    """
    Create new doctor.
    """
    existing_doctor = doctor.get_by_email(db, email=doctor_in.email)
    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The doctor with this email already exists.",
        )

    try:
        doctor_obj = doctor.create(db, obj_in=doctor_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate doctor entry or invalid data."
        )
    return doctor_obj

@router.get("/{id}", response_model=DoctorWithAvailability)
def read_doctor(
    *,
    db: Session = Depends(get_db),
    id: int,
) -> Any:
    """
    Get doctor by ID with availability.
    """
    doctor_obj = doctor.get_with_availability(db, id=id)
    if not doctor_obj:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor_obj

@router.put("/{id}", response_model=Doctor)
def update_doctor(
    *,
    db: Session = Depends(get_db),
    id: int,
    doctor_in: DoctorUpdate,
) -> Any:
    """
    Update a doctor.
    """
    doctor_obj = doctor.get(db, id=id)
    if not doctor_obj:
        raise HTTPException(status_code=404, detail="Doctor not found")

    if doctor_in.email and doctor_in.email != doctor_obj.email:
        existing_doctor = doctor.get_by_email(db, email=doctor_in.email)
        if existing_doctor and existing_doctor.id != id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered to another doctor."
            )

    try:
        doctor_obj = doctor.update(db, db_obj=doctor_obj, obj_in=doctor_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid data or duplicate entry."
        )
    return doctor_obj

@router.delete("/{id}", response_model=Doctor)
def delete_doctor(
    *,
    db: Session = Depends(get_db),
    id: int,
) -> Any:
    """
    Delete a doctor.
    """
    doctor_obj = doctor.get(db, id=id)
    if not doctor_obj:
        raise HTTPException(status_code=404, detail="Doctor not found")

    try:
        doctor_obj = doctor.remove(db, id=id)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete doctor with existing dependencies."
        )
    return doctor_obj

@router.post("/{id}/availability", response_model=DoctorWithAvailability)
def add_doctor_availability(
    *,
    db: Session = Depends(get_db),
    id: int,
    availability_in: AvailabilityCreate,
) -> Any:
    """
    Add availability for a doctor.
    """
    doctor_obj = doctor.get(db, id=id)
    if not doctor_obj:
        raise HTTPException(status_code=404, detail="Doctor not found")

    try:
        doctor_obj = doctor.add_availability(db, doctor_id=id, availability=availability_in)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid availability data or time conflict."
        )
    return doctor_obj

@router.get("/specialization/{specialization}", response_model=List[Doctor])
def get_doctors_by_specialization(
    *,
    db: Session = Depends(get_db),
    specialization: str,
) -> Any:
    """
    Get doctors by specialization.
    """
    doctors = doctor.get_by_specialization(db, specialization=specialization)
    if not doctors:
        return []
    return doctors
