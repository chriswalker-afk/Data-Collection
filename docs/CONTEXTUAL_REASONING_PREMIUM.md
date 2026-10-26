# Premium Contextual Reasoning — design and grading contract

## Audit
The legacy task presented four simultaneously visible multiple-choice fields with a correct choice always at index 0 for justification, limitation and improvement. A text draft was optional, yet completion reported a four-point model checklist. The draft itself was never scored. This format rewarded recognisable options more than sustained reasoning.

## Student workflow
Nine existing Edexcel 9MA0-aligned scenarios, three difficulty levels, every sampling method represented. The redesigned case file foregrounds its priority and three concise evidence facts.

**Write independently:** Students construct an original explanation from a blank response area before seeing any choices or a model. They cannot reveal the worked model with an empty response. Their prose is never auto-marked; after submitting they compare it with one defensible model and tick the criteria genuinely present.

**Build with guidance:** Four separate decisions—method, contextual justification, limitation, targeted improvement. Options are shuffled for each investigation once per round, while preserving the audited key. Earlier decisions may be revisited before checking. A final optional writing stage asks students to form a connected response from their choices. The system then reports only *model choices aligned*, with precise misconception feedback for wrong choices and an alternative perspective. Correct multiple-choice options are **never** described as an exam mark or a grade for the optional prose.

All nine cases received individual short coaching for the four dimensions and all 72 incorrect options have authored feedback. The original method/priority/model/tradeoff are retained; one rounding/nonresponse limitation was clarified.

## Scoring and privacy
The pre-existing progress schema and concept identifiers are unchanged. The first complete submission still records exactly one **non-mastery** practice answer (recordAnswer false) for the question's model-method concept. Neither a model match, a written self-check, a hint, nor a flagged case earns mastery. Repeated clicks cannot double-record.

End-of-round summaries distinguish guided work from independent responses. Guided wrong choices automatically flag the investigation. Students can also voluntarily flag a case, or self-identify missing written points. The resulting targeted review uses a fresh, **unscored** round: it changes neither answers, mastery, nor completed session count.

Drafts exist only in memory for the current page session, as in the previous activity. They are not uploaded or silently persisted; students can copy their own text. Changing guided/independent tracks during a case preserves the draft. New questions reset the draft and stage.

## Accessibility and testing
Native accessible radio and checkbox controls, logical fieldsets/legends, explicit instructions, keyboard-operable step navigation, focus to next step or feedback, live self-review counts, readable contrast, 320/390/768/1024/1280px layouts and reduced-motion treatment. Content validation checks keyed answer options and all case-specific misconception messages. Unit and Playwright checks cover shuffling, mathematical integrity, round summaries, no-answer-before-check, draft preservation, self-reflection, difficulty changes, progress exact-once, unscored revisits and site-wide regressions.

## Next
Perform a cross-game premium consistency and assessment integrity pass, then conduct a short classroom usability study. Consider gradual extension of the contextual case bank only after feedback identifies gaps.
