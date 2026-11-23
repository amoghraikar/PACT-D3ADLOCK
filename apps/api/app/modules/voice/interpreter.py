import uuid

from sqlalchemy.orm import Session

from app.modules.voice.matcher import match_segment
from app.modules.voice.parser import parse_segments
from app.schemas.voice import (
    InterpretedItem,
    VoiceInterpretationSummary,
    VoiceInterpretResponse,
)


class VoiceInterpreter:
    """
    Deterministic Multilingual Voice Order Interpreter.
    Interprets grocery requests in English (en-IN), Hindi (hi-IN), and Hinglish (Latin).
    Matches products and variants against the active database catalogue.
    Never modifies the cart during interpretation.
    """

    @staticmethod
    def interpret(
        db: Session,
        text: str,
        language: str = "en-IN",
        community_id: uuid.UUID | None = None,
    ) -> VoiceInterpretResponse:
        segments = parse_segments(text, language)
        items: list[InterpretedItem] = []

        total_paise = 0
        matched_count = 0
        clarification_count = 0
        unmatched_count = 0

        for seg in segments:
            matched_item = match_segment(db, seg, community_id)
            items.append(matched_item)

            if matched_item.status == "matched":
                matched_count += 1
                if matched_item.estimated_total_paise:
                    total_paise += matched_item.estimated_total_paise
            elif matched_item.needs_clarification:
                clarification_count += 1
            elif matched_item.status == "unmatched":
                unmatched_count += 1

        summary = VoiceInterpretationSummary(
            total_items=len(items),
            matched_count=matched_count,
            clarification_needed_count=clarification_count,
            unmatched_count=unmatched_count,
            estimated_total_paise=total_paise,
        )

        return VoiceInterpretResponse(
            transcript=text,
            language=language,
            items=items,
            summary=summary,
        )
