EVALUATION_SCHEMA = {
    "summary": "",
    "match_score": 0,
    "criteria_scores": [
        {
            "criteria": "",
            "weight": 0,
            "score": 0,
            "reason": "specific reason as to why that score given in short",
        }
    ],
    "strengths": [],
    "weaknesses": [],
}

DEFAULT_SCORING_CRITERIA = [
    {
        "criteria": "Relevant Experience",
        "weight": 25,
        "description": (
            "Evaluate how closely the candidate’s experience aligns "
            "with the role requirements, responsibilities, domain, "
            "and expected impact level. Score relative to the seniority "
            "of the role. Internship and entry-level roles should not "
            "be penalized for limited experience if the candidate shows "
            "strong relevance, initiative, ownership, or learning potential."
        ),
    },
    {
        "criteria": "Years of Relevant Experience",
        "weight": 20,
        "description": (
            "Evaluate the candidate’s total relevant experience relative "
            "to the role level and expectations. Use role-adjusted scoring: "
            "for internships and junior roles, smaller durations of highly "
            "relevant experience can still score well; for mid-level and "
            "senior roles, greater depth, progression, and sustained impact "
            "are expected."
        ),
    },
    {
        "criteria": "Education & Qualifications",
        "weight": 15,
        "description": (
            "Relevant academic background, degrees, coursework, "
            "and qualifications aligned with the role requirements."
        ),
    },
    {
        "criteria": "Trainings & Certifications",
        "weight": 15,
        "description": (
            "Relevant certifications, workshops, trainings, "
            "bootcamps, and specialized learning credentials."
        ),
    },
    {
        "criteria": "Technical Knowledge",
        "weight": 10,
        "description": (
            "Evaluate technical stack alignment, tools, frameworks, "
            "platforms, methodologies, and domain-specific knowledge "
            "relevant to the role."
        ),
    },
    {
        "criteria": "Leadership & Strategic Ability",
        "weight": 10,
        "description": (
            "Leadership, ownership, initiative, collaboration, "
            "decision-making, strategic thinking, mentoring, "
            "or organizational contributions appropriate to the role level."
        ),
    },
    {
        "criteria": "Communication & Soft Skills",
        "weight": 5,
        "description": (
            "Communication clarity, teamwork, stakeholder interaction, "
            "documentation quality, collaboration, adaptability, "
            "and interpersonal effectiveness."
        ),
    },
]

EVALUATOR_PROMPT_TEMPLATE = """
You are an expert ATS evaluator and recruiter assistant.

Evaluate the candidate against the job description.

SCORING RULES:
- Total match_score MUST be calculated using weighted criteria
- Total score MUST be out of 100
- Each criterion score MUST respect its weight
- strengths maximum 5 items (minimum 2)
- weaknesses maximum 5 items (minimum 0)
- summary must be EXACTLY one short sentence
- Evaluation must be evidence-based from candidate data
- dont include unneccessary information
- be moderately lenient but not too much

RESPONSE RULES:
- Return ONLY valid JSON
- No markdown
- No explanations
- No extra keys
- Follow output schema EXACTLY

OUTPUT SCHEMA:
{evaluation_schema}

SCORING CRITERIA:
{scoring_criteria}

CANDIDATE:
{candidate_data}

JOB DESCRIPTION:
{job_description}
"""
