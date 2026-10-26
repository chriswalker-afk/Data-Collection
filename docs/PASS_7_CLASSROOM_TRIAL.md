# Pass 7 — Classroom trial readiness and learning-journey audit

**Status:** Implemented, automated checks pending until PR verification. **A real classroom trial has not been conducted.** The site and this kit make a classroom trial possible; no fabricated observations or outcomes are presented.

## Purpose

Determine whether independent Year 12 students can: (1) choose a suitable starting activity, (2) interpret the instructions without teacher rescue, (3) progress from recall to sampling application, (4) explain and evaluate their choices, and (5) identify a useful next revision step.

This pass focuses on **student experience rather than adding another game**. All ten original activities and their Edexcel-aligned mathematical banks remain. The original `sampling-arcade-progress-v1` and `sampling-arcade-exam-v1` keys remain intact. Any saved Exam Lab paper without a difficulty value is treated as Mixed progression; the selected question IDs, answers, drafts and flags are not changed.

## Implemented changes

| Classroom friction | Pass 7 response | What to check in class |
| --- | --- | --- |
| Ten equally prominent games can leave students unsure where to start | Four short purpose-based links (understand, retrieve, apply, explain) plus one progress-grounded suggestion. Types of data and mixed-topic routes never send students into sampling-only games | Can a student pick an appropriate activity within a few moments without teacher instruction? |
| No clear next step after completing a round | Optional, method-aware next-activity suggestion below the score. Existing Replay and Back controls stay | Can they articulate what the next activity develops? |
| Mixed Exam Lab questions can begin too difficult for students needing fluency | Three level choices: Build confidence (Foundation/Developing), Mixed progression (all), Stretch (Developing/Extension). Every 4/8/12 paper retains one/two/three questions of each skill type, with easier questions first | Is the level appropriate? Can a student change to a more useful level on their next paper? |
| Hard to share actionable observations without accounts | Optional short feedback form for clarity, challenge, feedback quality and one change. Downloads an anonymous text file **only after a click** | Do students give specific, actionable feedback without personal information? |
| Potential for practice progress being overinterpreted | Student language stresses that recommendations are not grades, self-reviewed writing is not auto-marked, hinted numeric answers are not independent mastery | Do students understand the difference between progress and teacher-assessed performance? |
| Exam Lab report lacks a distinct next task | Explains whether to revisit saved questions independently or try a longer/different-level paper; direct link to classroom feedback | Can students use the report to decide what to revise next? |

### How level selection works

- **Build confidence:** only authored Foundation/Developing tasks.
- **Mixed progression:** every authored difficulty is eligible.
- **Stretch:** Developing/Extension tasks only.
- Papers contain 4/8/12 questions, evenly across allocations, systematic calculations, procedures and evaluation. Standard and full papers still include both a sampling-inference question and a method-critique question.
- Questions are sorted by authored difficulty within the paper. Questions of the same authored level remain shuffled.
- The selected level is saved with the paper in the existing v1 schema as an optional field. Older saved papers load as Mixed progression without losing writing.
- These levels describe **teaching scaffolding, not Pearson grade boundaries**.

## Teacher-run classroom trial (suggested 20–30 minutes)

### Before pupils arrive

Use the site at https://chriswalker-afk.github.io/Data-Collection/ in a browser with a reliable internet connection. Ask pupils to use their own devices if possible. Do **not** reset anyone's existing local progress without consent. Decide in advance how any voluntarily shared feedback text files will be collected according to your school's procedures. Avoid names in shared observations and do not upload students' writing to public GitHub issues.

Have a range of confidence levels represented. You can invite a few pupils to describe what they are thinking as they navigate, without giving away the answers.

### Suggested student tasks

1. **Find your starting point.** Select Sampling. Read the four short routes and the suggested next step. Choose an activity that matches your immediate goal and explain why you picked it.
2. **Recall and apply.** Attempt a brief retrieval activity (Match Up or Missing Words), then try Which Method? or Build the Method. Note where guidance clarifies the method versus where it merely reveals the answer.
3. **Exam application.** Open Exam Lab and select a suitable difficulty before starting a Quick (four-question) paper. Work without hints first; reveal a hint only if necessary. Write a contextual justification/evaluation and compare it with the model.
4. **Review and decide.** Examine the report. Explain why numerical parts can be checked automatically while written checklist ticks are self-review, not official marks. Find what you would practise next.
5. **Optional feedback.** Return home (or use Share short feedback), open the classroom feedback form and download a text response. Decide whether to share it with your teacher.

### Teacher observation sheet (aggregate, not a pupil tracker)

Record counts across the group rather than identifying pupils.

| Observation | Independent | Needed in-site hint | Needed teacher intervention |
| --- | ---: | ---: | ---: |
| Located a useful starting activity | | | |
| Understood the sampling question instructions | | | |
| Distinguished a method from a similar method | | | |
| Completed a numerical question | | | |
| Wrote a contextual justification and limitation | | | |
| Identified a sensible next practice step | | | |

Also record, without pupil identifiers: most common confusing instruction; any unclear mathematical model; activity and authored difficulty level when a problem occurred; navigation/keyboard/mobile issue; suggestion for a targeted fix.

An *independent* response should mean the student completed that task without hints or teacher prompts. A self-reviewed written response must never be counted as fully correct solely because the student ticked all model points.

### Short teacher debrief

Ask: Which task was most useful for preparing for an exam? Did the level label match the challenge you experienced? Where did you get stuck? Did a hint help you learn or just expose the next step? Were the model answers clear about method, bias and generalisation? Which one change would help you use the site on your own?

## Privacy and evidence limitations

- The built-in feedback form **does not transmit, track, persist or automatically send** answers; it creates an optional local text download. Pupils can also choose not to complete it.
- The app requests no name, student ID, class or email. The comment field is limited to 350 characters. Pupils are told not to enter personal details.
- Existing game progress and Exam Lab drafts remain in their original browser-local stores.
- The guidance suggestion is a small transparent rule based on local practice history. It is **not a predictive ability score or automated marking**.
- The trial should include keyboard-only and 320px/390px mobile checks, as well as an offline/disconnected or storage-blocked check if practical. A downloaded report cannot sync between devices automatically.
- **No real student observation data was available during implementation**, so claims that students improved or preferred a route would be unsupported.

## Acceptance and follow-up

Automated tests cover the paper-level bank filters and balance, older stored papers, recommendation mapping, completion links, feedback download (without network transmission), form keyboard operation, local progress preservation, narrow layouts and original games. All PR tests must pass before merging.

In **Pass 8**, use aggregated, voluntarily shared classroom feedback to identify and prioritise actual usability issues. Resist adding games or tracking based solely on hypothetical user behaviour.
