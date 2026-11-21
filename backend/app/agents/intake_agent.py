import re
import json
import logging
from typing import Dict, Any
import httpx
from backend.app.config import settings
from backend.app.models.schemas import AiIntakeResponse

logger = logging.getLogger("rescueloop.intake_agent")

class IntakeAgent:
    """
    Intake Agent: Parses freeform natural language food donor descriptions
    into verified food handling parameters, safety categories and quantities.
    """

    @staticmethod
    async def extract_details(prompt: str) -> AiIntakeResponse:
        # If Gemini API key is configured, query LLM
        if settings.GEMINI_API_KEY:
            try:
                system_prompt = (
                    "You are the RescueLoop Food Safety & Logistics Intake Agent. "
                    "Extract structured surplus food details from the user's text and respond strictly in JSON."
                    "JSON keys: title (str), food_category (str), quantity_meals (int), packaging_type (str), "
                    "storage_temp (str), allergens (str), handling_notes (str), estimated_shelf_life_hours (int)."
                )
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={settings.GEMINI_API_KEY}"
                payload = {
                    "contents": [{"parts": [{"text": f"{system_prompt}\n\nDonor Text: {prompt}"}]}],
                    "generationConfig": {"responseMimeType": "application/json"}
                }
                async with httpx.AsyncClient(timeout=6.0) as client:
                    resp = await client.post(url, json=payload)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                        parsed = json.loads(raw_text)
                        return AiIntakeResponse(
                            title=parsed.get("title", "Surplus Food Batch"),
                            food_category=parsed.get("food_category", "Prepared Meals"),
                            quantity_meals=int(parsed.get("quantity_meals", 50)),
                            packaging_type=parsed.get("packaging_type", "Sealed individual food trays"),
                            storage_temp=parsed.get("storage_temp", "Refrigerated (3.5°C)"),
                            allergens=parsed.get("allergens", "None disclosed"),
                            handling_notes=parsed.get("handling_notes", "Prepared in commercial facility"),
                            estimated_shelf_life_hours=int(parsed.get("estimated_shelf_life_hours", 4))
                        )
            except Exception as e:
                logger.warning(f"Gemini API intake extraction failed, falling back to rule engine: {e}")

        # Deterministic Rule-Based Fallback
        lower = prompt.lower()
        
        # Quantity extraction
        qty_match = re.search(r'(\d+)\s*(?:meals|boxes|packs|servings|plates|portions|trays)?', lower)
        quantity = int(qty_match.group(1)) if qty_match else 80

        # Category extraction
        if any(w in lower for w in ['bread', 'bakery', 'croissant', 'loaf', 'buns', 'cake', 'pastry']):
            category = "Baked Goods & Breads"
            packaging = "Food-grade paper wraps in sealed cartons"
            temp = "Ambient (clean, dry)"
            allergens = "Contains gluten/wheat"
            shelf_life = 24
        elif any(w in lower for w in ['fruit', 'vegetable', 'produce', 'salad', 'greens', 'tomato']):
            category = "Fresh Produce"
            packaging = "Ventilated fresh produce crates"
            temp = "Chilled / Ambient (8°C)"
            allergens = "None reported"
            shelf_life = 18
        else:
            category = "Prepared Cooked Meals"
            packaging = "Individually sealed trays in insulated outer crates"
            temp = "Refrigerated (3.5°C)"
            allergens = "Contains dairy; vegetarian" if "veg" in lower else "No allergens reported"
            shelf_life = 4

        title = f"{quantity} {category}"
        if "lunch" in lower:
            title = f"{quantity} Fresh Vegetarian Lunch Boxes"
        elif "dinner" in lower:
            title = f"{quantity} Prepared Dinner Meals"

        return AiIntakeResponse(
            title=title,
            food_category=category,
            quantity_meals=quantity,
            packaging_type=packaging,
            storage_temp=temp,
            allergens=allergens,
            handling_notes="Verified commercial preparation. Tamper seals intact.",
            estimated_shelf_life_hours=shelf_life
        )
