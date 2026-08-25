# ProfAI

A voice-driven AI tutor that adapts how it explains things to the student in
front of it.

## Overview

Most tutoring tools explain a concept the same way every time, then repeat
themselves when a student is lost. ProfAI tracks how the student is actually
doing and changes its approach — switching to an analogy, slowing down, or
moving to audio — rather than restating the same explanation louder.

It runs as a web app alongside a Chrome extension that picks up the page a
student is reading, so questions can be asked in context instead of copied
into a separate tab.

## How it adapts

Each student carries a profile that the tutor writes back to as it learns more
about them:

```python
profile = {
    'preferredLearningStyle':   'visual',   # visual | auditory | kinesthetic | mixed
    'conceptualUnderstanding':  7,          # 1-10
    'practicalSkills':          6,          # 1-10
    'preferredPace':            'medium',   # slow | medium | fast
    'responseToEncouragement':  8,          # 1-10
}
```

Those fields are separated on purpose. A student can grasp a concept well and
still not be able to apply it, so conceptual understanding and practical skill
are tracked independently and pull the explanation in different directions —
a high conceptual and low practical score gets worked examples rather than
more theory.

Learning style changes the form an explanation takes, not just its wording.
Visual learners get diagrams, step-by-step breakdowns and colour-coded
structure; auditory learners get verbal explanation, spoken responses and
sound metaphors; kinesthetic learners get hands-on exercises and
learning-by-doing; mixed learners get the approach varied by topic.

Sitting on top of that, sentiment analysis reads each message for confusion,
frustration and engagement. That is what triggers a change of approach rather
than a repeat: detected confusion switches tactic, and `responseToEncouragement`
decides how much the tone shifts with it. Conversation patterns feed back into
comprehension estimates and topic mastery, which drive what gets recommended
next.

## Tech Stack

Frontend

- React
- TypeScript
- Tailwind CSS
- Framer Motion

Backend

- Python
- Firebase for auth and data

Extension

- Chrome extension for in-page context
