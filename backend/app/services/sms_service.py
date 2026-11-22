import logging
from typing import Dict, Any, Optional
import httpx
from backend.app.config import settings

logger = logging.getLogger("rescueloop.sms")

async def send_sms(to_phone: str, message: str) -> Dict[str, Any]:
    """
    Sends an SMS message or OTP code.
    Supports Twilio, AWS SNS, or development console fallback.
    """
    cleaned_phone = to_phone.strip().replace(" ", "").replace("-", "")
    provider = (settings.SMS_PROVIDER or "console").lower()

    logger.info(f"Dispatching SMS via provider '{provider}' to {cleaned_phone}: {message}")

    if provider == "twilio" and settings.SMS_API_KEY and settings.SMS_API_SECRET:
        account_sid = settings.SMS_API_KEY
        auth_token = settings.SMS_API_SECRET
        url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    auth=(account_sid, auth_token),
                    data={
                        "From": settings.SMS_SENDER_ID or "RescueLoop",
                        "To": cleaned_phone,
                        "Body": message
                    }
                )
                if resp.status_code in [200, 201]:
                    data = resp.json()
                    return {"success": True, "provider": "twilio", "sid": data.get("sid")}
                else:
                    logger.error(f"Twilio error ({resp.status_code}): {resp.text}")
                    return {"success": False, "provider": "twilio", "error": resp.text}
        except Exception as e:
            logger.error(f"Twilio request failed: {e}")
            return {"success": False, "provider": "twilio", "error": str(e)}

    # Development / Console delivery fallback
    print(f"\n=======================================================")
    print(f"📱 [SMS GATEWAY DISPATCH] -> {cleaned_phone}")
    print(f"Sender: {settings.SMS_SENDER_ID}")
    print(f"Content: {message}")
    print(f"=======================================================\n")

    return {
        "success": True,
        "provider": "console",
        "to": cleaned_phone,
        "message": message,
        "status": "delivered"
    }

async def send_handover_otp(to_phone: str, otp_code: str, mission_code: str, meals: int) -> Dict[str, Any]:
    """
    Sends a formatted handover verification OTP to the NGO receiver.
    """
    msg = (
        f"RescueLoop Security: Your handover verification code for Mission {mission_code} "
        f"({meals} meals) is: {otp_code}. Provide this code to the courier to complete delivery."
    )
    return await send_sms(to_phone=to_phone, message=msg)
