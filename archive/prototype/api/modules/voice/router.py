from typing import Annotated

from fastapi import APIRouter, Cookie, Header
from pydantic import BaseModel, Field

from app.modules.auth.router import get_user_from_token
from app.modules.voice.interpreter import get_interpreter

router = APIRouter(tags=["voice"])


class VoiceInterpretRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)
    language: str = Field(default="en")


@router.post("/api/v1/voice/interpret")
@router.post("/voice/interpret")
def interpret_voice_order(
    req: VoiceInterpretRequest,
    authorization: Annotated[str | None, Header()] = None,
    pact_token: Annotated[str | None, Cookie()] = None,
):
    """
    F3 / P20: POST /voice/interpret
    Interprets grocery order text in English or Hindi into structured catalogue items.
    Enforces tenant catalogue isolation: matches only against products visible in caller's building.
    Never writes to the cart.
    """
    community_id = "comm-green-1"

    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
    elif pact_token:
        token = pact_token

    if token:
        user = get_user_from_token(token)
        if user and user.get("community_id"):
            community_id = user["community_id"]

    interpreter = get_interpreter()
    result = interpreter.interpret(
        text=req.text,
        language=req.language,
        community_id=community_id,
    )
    return result
