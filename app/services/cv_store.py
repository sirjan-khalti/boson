import os
import shutil
from fastapi import UploadFile

from app.core.exceptions import BadRequestError
from app.core.utils import generate_uuid

UPLOAD_DIR = "static/cvs"
MAX_SIZE = 10 * 1024 * 1024  # 10MB

def save_cv(file: UploadFile) -> str:
    """
    Saves the uploaded CV file to the local static directory and returns the filename.
    Only PDF files up to 10MB are allowed.
    """
    # Enforce strict PDF extension check
    if not file.filename.lower().endswith(".pdf"):
        raise BadRequestError("Only PDF files are supported.")

    # Enforce size limit check
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)  # reset pointer
    if size > MAX_SIZE:
        raise BadRequestError("File too large. Maximum supported size is 10MB.")

    # Ensure directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate unique, safe filename using UUID and force .pdf extension
    unique_filename = f"cv_{generate_uuid()}.pdf"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return unique_filename
