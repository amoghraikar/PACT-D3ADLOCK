from abc import ABC, abstractmethod
from typing import Any
from app.modules.voice.matcher import match_segment
from app.modules.voice.parser import parse_segments


class Interpreter(ABC):
    @abstractmethod
    def interpret(self, text: str, language: str = "en", community_id: str = "comm-green-1") -> dict[str, Any]:
        """Interprets grocery order speech into structured items."""
        pass


class DeterministicInterpreter(Interpreter):
    """
    Deterministic rule-based grocery speech interpreter per F3.
    Matches products, units, and quantities against the caller's visible catalogue.
    Never calls an LLM. Never writes to the cart.
    """

    def interpret(self, text: str, language: str = "en", community_id: str = "comm-green-1") -> dict[str, Any]:
        segments = parse_segments(text, language)
        items = []

        for seg in segments:
            matched_item = match_segment(seg, community_id)
            items.append(matched_item)

        return {
            "language": language,
            "items": items,
        }


def get_interpreter() -> Interpreter:
    return DeterministicInterpreter()
