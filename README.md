# EvorAI Competitor Claude Master Pack

A Claude Project system for reverse engineering, outcompeting, and building a stronger behavioural insight platform inspired by evorAI and Applied Behaviour Change.

## Purpose

This pack is designed for **long horizon work** inside a Claude Project. Rather than one giant prompt, it uses:
- One persistent project instruction
- Six specialist master documents loaded into project knowledge
- Short, single-purpose task prompts for day-to-day work

## Recommended Claude Project Setup

Create one Claude Project called: **EvorAI build lab**

### Project Knowledge Files

Upload these six documents into project knowledge as separate files:

| File | Role |
|---|---|
| `master_documents/company_reverse_engineering_engine.md` | Forensic product and strategy analyst |
| `master_documents/behavioural_science_intelligence_engine.md` | Behavioural science core |
| `master_documents/product_and_ux_architect.md` | Founding PM and UX strategist |
| `master_documents/technical_architecture_and_responsible_ai_lead.md` | Principal architect |
| `master_documents/evidence_evaluation_and_red_team_reviewer.md` | Internal critic |
| `master_documents/claude_prompt_systems_designer.md` | Prompt systems specialist |

### Project Instruction

Set the contents of `project_instruction.md` as your single Claude Project instruction.

## Repository Structure

```
/
├── README.md                          # This file
├── project_instruction.md             # Claude Project-level instruction
├── master_documents/                  # Six specialist knowledge files
│   ├── company_reverse_engineering_engine.md
│   ├── behavioural_science_intelligence_engine.md
│   ├── product_and_ux_architect.md
│   ├── technical_architecture_and_responsible_ai_lead.md
│   ├── evidence_evaluation_and_red_team_reviewer.md
│   └── claude_prompt_systems_designer.md
├── task_prompts/                      # Ten ready-to-use task prompts
│   ├── task_01_company_profile.md
│   ├── task_02_user_workflow.md
│   ├── task_03_behavioural_ontology.md
│   ├── task_04_architecture.md
│   ├── task_05_red_team_review.md
│   ├── task_06_competitor_comparison.md
│   ├── task_07_prompt_system.md
│   ├── task_08_prd.md
│   ├── task_09_feature_backlog.md
│   └── task_10_investor_narrative.md
├── templates/                         # Reusable output templates
│   ├── prd_template.md
│   └── architecture_template.md
├── evaluation_rubric.md               # Scoring rubric for all major outputs
└── working_documents/                 # Created over time during build
    └── .gitkeep
```

## Recommended Working Rhythm

| Chat | Task |
|---|---|
| 1 | Forensic company profile (Task 01) |
| 2 | Ideal user workflow and product spec (Task 02) |
| 3 | Behavioural ontology and evidence model (Task 03) |
| 4 | MVP and enterprise architecture (Task 04) |
| 5 | Red team everything (Task 05) |
| 6 | Convert to PRD, backlog, and messaging (Tasks 08-10) |

## What Not to Do

1. Do not rewrite the project instruction every chat
2. Do not upload one giant mixed document instead of separate specialist files
3. Do not ask for competitor analysis, architecture, PRD, UX, and GTM all in one message
4. Do not accept outputs that fail to separate evidence from inference
5. Do not let Claude speak in generic AI platform language without grounding it in user workflow and behavioural science

## Working Documents (create over time)

As you run tasks, store outputs in `working_documents/`:
- `feature_backlog.md`
- `competitive_landscape.md`
- `behavioural_ontology.md`
- `icp_and_pricing_hypotheses.md`
- `architecture_decisions_log.md`
- `prompt_eval_log.md`
