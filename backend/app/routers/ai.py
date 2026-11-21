from fastapi import APIRouter, Depends
from backend.app.models.schemas import AiIntakeRequest, AiIntakeResponse
from backend.app.agents.intake_agent import IntakeAgent

router = APIRouter(prefix="/ai", tags=["AI Copilot & Agents"])

@router.post("/intake-extract", response_model=AiIntakeResponse)
async def extract_donation_details(req: AiIntakeRequest):
    """
    Intake Copilot: Parses freeform natural language donor text
    into verified food handling parameters, shelf-life, and allergens.
    """
    return await IntakeAgent.extract_details(req.prompt)
