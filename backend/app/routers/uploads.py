import os
import uuid
import shutil
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Optional

from backend.app.config import settings
from backend.app.auth.dependencies import get_current_user
from backend.app.models.entities import User

router = APIRouter(prefix="/uploads", tags=["File & Photo Evidence Uploads"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

@router.post("")
async def upload_evidence_file(
    file: UploadFile = File(...),
    mission_id: Optional[str] = Form(None),
    category: str = Form("inspection"),  # inspection, pickup_evidence, handover_evidence, food_photo
    current_user: User = Depends(get_current_user)
):
    """
    Uploads food inspection or delivery proof photo evidence securely.
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = upload_dir / unique_filename

    total_bytes = 0
    with open(dest_path, "wb") as out_file:
        while True:
            chunk = await file.read(1024 * 1024)
            if not chunk:
                break
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_SIZE_BYTES:
                out_file.close()
                if dest_path.exists():
                    os.remove(dest_path)
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="File exceeds maximum size limit of 10 MB"
                )
            out_file.write(chunk)

    return {
        "success": True,
        "filename": unique_filename,
        "original_filename": file.filename,
        "category": category,
        "mission_id": mission_id,
        "size_bytes": total_bytes,
        "url": f"/uploads/{unique_filename}",
        "uploader_id": current_user.id
    }
