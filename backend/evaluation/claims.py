from __future__ import annotations

import re
from typing import List

from .models import Claim, PaymentState

_I = re.IGNORECASE

# Sentences that hedge, ask, or speak hypothetically make no factual claim.
_UNCERTAIN = re.compile(
    r"\b(?:can(?:'|’)?t|cannot|can not|could not|couldn(?:'|’)?t|unable to|not able to)\s+"
    r"(?:currently\s+|yet\s+)?(?:confirm|verify|determine|check|see|tell)\b"
    r"|\b(?:not sure|unsure|don(?:'|’)?t know)\b", _I)
_HYPOTHETICAL = re.compile(r"\b(?:if|once|unless|should|will|would|might|in case)\b", _I)

# Order matters: strong failure -> pending -> negated success -> success.
_RULES = [
    (PaymentState.FAILED, [
        r"\b(?:fail(?:ed|s|ure)?|declined|rejected|unsuccessful|denied)\b",
        # Negated transfer assertions must take precedence over 'was transferred'.
        r"\bno\s+(?:new\s+)?(?:money|funds|payment|amount)\s+"
        r"(?:was|were|has been|had been)\s+(?:transferred|sent|made|processed)\b",
        r"\b(?:no\s+new\s+(?:payment|transfer)\s+was\s+(?:made|processed)|"
        r"nothing\s+was\s+(?:transferred|sent))\b",
        r"\b(?:not\s+authori[sz]ed|unauthori[sz]ed|insufficient\s+(?:funds|balance))\b",
        r"\b(?:account(?:\s+details)?|beneficiary(?:\s+account)?(?:\s+details)?|"
        r"destination(?:\s+account)?)\s+(?:is|are|was|were)\s+invalid\b",
        r"\b(?:duplicate\s+(?:transaction|payment)|"
        r"transaction\s+(?:is|was|appears\s+to\s+be)\s+a\s+duplicate)\b",
        r"\b(?:cannot|can(?:'|’)?t|could\s+not|couldn(?:'|’)?t)\s+"
        r"(?:proceed|process|complete|send|accept)\b",
        r"\b(?:unable|wasn(?:'|’)t able|was not able)\s+to\s+(?:complete|process|send)\b",
        r"\b(?:frozen|closed|blocked|restricted)\b",
        r"\b(?:cannot\s+disclose|confidential|cannot\s+be\s+viewed|never\s+ask)\b",
    ]),
    (PaymentState.PENDING, [
        r"\b(?:pending|in progress|being processed|still processing|is processing|"
        r"awaiting|under review|on hold|reversal|under\s+investigation|dispute\s+case\s+is\s+open)\b",
        r"\bnot\b[^.?!]*\byet\b",
    ]),
    (PaymentState.FAILED, [
        r"(?:\bnot|n(?:'|’)t)\s+(?:be\s+|been\s+)?(?:completed|successful|processed|approved|"
        r"sent|go(?:ne)?\s+through|succeed(?:ed)?)\b",
    ]),
    (PaymentState.SUCCESS, [
        r"\b(?:was|has been|is|were|have been|got)\s+(?:successfully\s+|already\s+)?"
        r"(?:completed|processed|settled|approved|sent|successful|transferred|credited)\b",
        r"\bsuccessful(?:ly)?\b",
        r"\b(?:went through|has succeeded|succeeded|all done)\b",
        r"\bis\s+complete\b",
        r"\bavailable\s+balance\b",
    ]),
]
_COMPILED = [(state, [re.compile(p, _I) for p in pats]) for state, pats in _RULES]

_TXN_ID = re.compile(r"\bTXN[-_]?\d[A-Z0-9]*\b", _I)


def extract_claims(response: str) -> List[Claim]:
    claims: List[Claim] = []
    for sentence in re.split(r"(?<=[.!?])\s+|\n+", response.strip()):
        s = sentence.strip()
        if not s or s.endswith("?") or _UNCERTAIN.search(s) or _HYPOTHETICAL.search(s):
            continue
        for state, patterns in _COMPILED:
            if any(p.search(s) for p in patterns):
                claims.append(Claim(state, s))
                break
    return claims


def extract_transaction_ids(response: str) -> List[str]:
    return sorted({m.upper() for m in _TXN_ID.findall(response)})