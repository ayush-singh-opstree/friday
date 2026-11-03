"""
seed.py — Populates the database with Meera Krishnamurthy's demo seed data.

Rich hackathon demo dataset:
- User: Meera Krishnamurthy (single demo user)
- Directory: 13 contacts (fintech, investors, partners, vendors, counsel, candidate)
- Threads: 9 relationship threads (deals, partnerships, legal, hiring)
- Sessions (Clubs): 12 capture sessions grouped under threads (2 live/in-progress)
- Captures: 35 notes / follow-ups / questions / decisions (most inside sessions)
- Commitments: 32 tracked commitments (15 mine + 17 theirs, mixed due dates)
- ThreadPerson links + Timeline events
- Recomputes Attention scores on exit

Run with:
    python seed.py
"""
import sys
import uuid
from datetime import datetime, timedelta

# Ensure UTF-8 console output so the status/emoji prints below don't crash on
# legacy Windows consoles (cp1252) or when stdout is redirected to a file.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

from app.config import (
    DEFAULT_DIGEST_TIME,
    DEFAULT_GOING_COLD_THRESHOLD_DAYS,
    DEMO_USER_EMAIL,
    DEMO_USER_ID,
    DEMO_USER_NAME,
)
from app.db import SessionLocal
from app.models import (
    Capture,
    CaptureSource,
    CaptureStatus,
    CaptureType,
    Club,
    Commitment,
    CommitmentOwnerType,
    CommitmentStatus,
    Person,
    Thread,
    ThreadPerson,
    ThreadStatus,
    TimelineEvent,
    TimelineEventType,
    User,
)
from app.services.attention_service import attention_service


def seed():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        print("🌱 Seeding database with Threadwise Demo data...")

        # 1. Upsert Demo User (Meera Krishnamurthy)
        user = db.query(User).filter(User.id == DEMO_USER_ID).first()
        if not user:
            user = User(
                id=DEMO_USER_ID,
                email=DEMO_USER_EMAIL,
                full_name=DEMO_USER_NAME,
                going_cold_threshold_days=DEFAULT_GOING_COLD_THRESHOLD_DAYS,
                digest_time=DEFAULT_DIGEST_TIME,
                digest_enabled=True,
                email_digest_enabled=False,
                notification_preferences={
                    "dailyDigest": True,
                    "commitmentDue": True,
                    "goingCold": True,
                    "preMeetingBrief": True,
                    "reengagementDigest": True,
                },
                created_at=now - timedelta(days=90),
                last_active_at=now,
            )
            db.add(user)
            db.commit()
            print(f"👤 Created user: {user.full_name} ({user.id})")
        else:
            print(f"👤 Found existing user: {user.full_name}")

        # Clean existing data so the seed run is idempotent
        db.query(TimelineEvent).filter(TimelineEvent.user_id == DEMO_USER_ID).delete()
        db.query(Commitment).filter(Commitment.user_id == DEMO_USER_ID).delete()
        db.query(Capture).filter(Capture.user_id == DEMO_USER_ID).delete()
        db.query(Club).filter(Club.user_id == DEMO_USER_ID).delete()
        db.query(ThreadPerson).delete()
        db.query(Thread).filter(Thread.user_id == DEMO_USER_ID).delete()
        db.query(Person).filter(Person.user_id == DEMO_USER_ID).delete()
        db.commit()

        # 2. Seed People (directory)
        people_defs = [
            {"var": "aditya", "name": "Aditya Joshi", "org": "Fintech Co.", "role": "CFO",
             "email": "aditya@fintechco.example.com", "phone": "+91 98200 10001",
             "linkedin": "https://linkedin.com/in/adityajoshi",
             "notes": "Prefers quick WhatsApp/Slack updates. Focused on compliance and speed."},
            {"var": "rahul", "name": "Rahul Verma", "org": "Horizon Ventures", "role": "Partner",
             "email": "rahul@horizonvc.example.com", "phone": "+91 98200 10002",
             "linkedin": "https://linkedin.com/in/rahulverma",
             "notes": "Met at ProdSummit. Looking for Series A pipeline metrics."},
            {"var": "kavya", "name": "Kavya Nair", "org": "Startup Y", "role": "Co-founder",
             "email": "kavya@startupy.example.com", "phone": "+91 98200 10003",
             "linkedin": "https://linkedin.com/in/kavyanair",
             "notes": "B2B integration partner exploration."},
            {"var": "priya", "name": "Priya Mehta", "org": "DesignCo", "role": "Head of Design",
             "email": "priya@designco.example.com", "phone": "+91 98200 10004",
             "linkedin": "https://linkedin.com/in/priyamehta",
             "notes": "Design sprint collaboration partner."},
            {"var": "rohit", "name": "Rohit Sharma", "org": "SharpAgency", "role": "Founder",
             "email": "rohit@sharpagency.example.com", "phone": "+91 98200 10005",
             "linkedin": "https://linkedin.com/in/rohitsharma",
             "notes": "External vendor for technical copy and landing pages."},
            {"var": "neha", "name": "Neha Gupta", "org": "Fintech Co.", "role": "CTO",
             "email": "neha@fintechco.example.com", "phone": "+91 98200 10006",
             "linkedin": "https://linkedin.com/in/nehagupta",
             "notes": "Technical decision-maker at Fintech Co. Owns payments infrastructure."},
            {"var": "tanya", "name": "Tanya Sethi", "org": "Fintech Co.", "role": "Procurement Manager",
             "email": "tanya@fintechco.example.com", "phone": "+91 98200 10007",
             "linkedin": "https://linkedin.com/in/tanyasethi",
             "notes": "Handles vendor onboarding, paperwork and invoicing."},
            {"var": "vikram", "name": "Vikram Rao", "org": "Startup Y", "role": "VP Engineering",
             "email": "vikram@startupy.example.com", "phone": "+91 98200 10008",
             "linkedin": "https://linkedin.com/in/vikramrao",
             "notes": "Deep in API integration details; prefers written specs."},
            {"var": "sara", "name": "Sara Khan", "org": "DesignCo", "role": "Product Lead",
             "email": "sara@designco.example.com", "phone": "+91 98200 10009",
             "linkedin": "https://linkedin.com/in/sarakhan",
             "notes": "Coordinates design-to-dev handoff with Priya."},
            {"var": "arjun", "name": "Arjun Iyer", "org": "BrightWave", "role": "Sales Director",
             "email": "arjun@brightwave.example.com", "phone": "+91 98200 10010",
             "linkedin": "https://linkedin.com/in/arjuniyer",
             "notes": "Inbound prospect evaluating us for a 90-day pilot."},
            {"var": "megha", "name": "Megha Patel", "org": "Patel & Associates", "role": "Corporate Counsel",
             "email": "megha@patellegal.example.com", "phone": "+91 98200 10011",
             "linkedin": "https://linkedin.com/in/meghapatel",
             "notes": "Handles our commercial contracts and compliance reviews."},
            {"var": "daniel", "name": "Daniel Chen", "org": "CloudPeak", "role": "Head of Growth",
             "email": "daniel@cloudpeak.example.com", "phone": "+91 98200 10012",
             "linkedin": "https://linkedin.com/in/danielchen",
             "notes": "Warm intro from Rahul; exploring a co-marketing angle."},
            {"var": "naina", "name": "Naina Reddy", "org": "Independent", "role": "Senior Product Designer",
             "email": "naina@independent.example.com", "phone": "+91 98200 10013",
             "linkedin": "https://linkedin.com/in/nainareddy",
             "notes": "Candidate for the senior design lead role; strong systems thinking."},
        ]

        people_map: dict[str, Person] = {}
        for p in people_defs:
            person = Person(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                full_name=p["name"],
                organisation=p["org"],
                role=p["role"],
                email=p["email"],
                phone=p.get("phone"),
                linked_in_url=p.get("linkedin"),
                notes=p["notes"],
                created_at=now - timedelta(days=60),
                updated_at=now - timedelta(days=5),
            )
            db.add(person)
            people_map[p["var"]] = person
        db.commit()
        print(f"👥 Seeded {len(people_map)} contacts in the directory.")

        # 3. Seed Threads
        threads_defs = [
            {"key": "fintech", "title": "Fintech Co. — Aditya", "days_ago": 10, "is_pinned": True,
             "desc": "Q3 expansion & payments flow redesign consultation",
             "persons": ["aditya", "neha", "tanya"]},
            {"key": "investor_z", "title": "Investor Z — Rahul", "days_ago": 22, "is_pinned": False,
             "desc": "Horizon Ventures Series A intro & metric sharing",
             "persons": ["rahul"]},
            {"key": "startup_y", "title": "Startup Y — Partnership", "days_ago": 18, "is_pinned": False,
             "desc": "Exploration of joint API integration and reseller channel",
             "persons": ["kavya", "vikram"]},
            {"key": "design_partner", "title": "Design Partner — Priya", "days_ago": 2, "is_pinned": False,
             "desc": "Figma component system and quarterly design reviews",
             "persons": ["priya", "sara"]},
            {"key": "agency", "title": "Agency Contract — Rohit", "days_ago": 6, "is_pinned": False,
             "desc": "Copywriting deliverables and landing page redesign",
             "persons": ["rohit"]},
            {"key": "brightwave", "title": "BrightWave — Pilot", "days_ago": 3, "is_pinned": False,
             "desc": "Inbound 90-day paid pilot evaluation for enterprise retail",
             "persons": ["arjun"]},
            {"key": "cloudpeak", "title": "CloudPeak — Co-marketing", "days_ago": 1, "is_pinned": False,
             "desc": "Joint webinar and integration listing with CloudPeak growth",
             "persons": ["daniel"]},
            {"key": "legal", "title": "Legal — Contracts", "days_ago": 21, "is_pinned": False,
             "desc": "MSA and vendor contract review with external counsel",
             "persons": ["megha"]},
            {"key": "hiring", "title": "Hiring — Senior Design Lead", "days_ago": 9, "is_pinned": False,
             "desc": "Closing a senior product designer for the core team",
             "persons": ["naina"]},
        ]

        thread_map: dict[str, Thread] = {}
        for td in threads_defs:
            t = Thread(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                title=td["title"],
                description=td["desc"],
                status=ThreadStatus.active,
                is_pinned=td["is_pinned"],
                going_cold_threshold_days=14,
                attention_score=0.0,
                last_interaction_at=now - timedelta(days=td["days_ago"]),
                created_at=now - timedelta(days=60),
                updated_at=now - timedelta(days=td["days_ago"]),
            )
            db.add(t)
            thread_map[td["key"]] = t

            # Link one or more people to the thread
            for pkey in td["persons"]:
                db.add(ThreadPerson(
                    thread_id=t.id,
                    person_id=people_map[pkey].id,
                    added_at=now - timedelta(days=50),
                ))

        db.commit()
        print(f"🧵 Seeded {len(thread_map)} relationship threads.")

        # 4. Seed Sessions (Clubs) — a capture session / meeting under a thread.
        #    ended_at = None means the session is still live / in progress.
        sessions_defs = [
            {"key": "fintech_kickoff", "tkey": "fintech", "name": "Q3 Kickoff Call", "start": 15, "end": 15},
            {"key": "fintech_deepdive", "tkey": "fintech", "name": "Payments Flow Deep-dive", "start": 2, "end": 2},
            {"key": "fintech_live", "tkey": "fintech", "name": "Staging Rollout Sync", "start": 0.03, "end": None},
            {"key": "investor_metrics", "tkey": "investor_z", "name": "Series A Metrics Review", "start": 22, "end": 22},
            {"key": "startup_scoping", "tkey": "startup_y", "name": "API Integration Scoping", "start": 18, "end": 18},
            {"key": "design_review3", "tkey": "design_partner", "name": "Design Review #3", "start": 2, "end": 2},
            {"key": "design_live", "tkey": "design_partner", "name": "Component Library Sync", "start": 0.02, "end": None},
            {"key": "agency_handoff", "tkey": "agency", "name": "Copy Draft Handoff", "start": 6, "end": 6},
            {"key": "brightwave_intro", "tkey": "brightwave", "name": "Intro Call with BrightWave", "start": 3, "end": 3},
            {"key": "cloudpeak_discovery", "tkey": "cloudpeak", "name": "Co-marketing Discovery", "start": 1, "end": 1},
            {"key": "legal_msa", "tkey": "legal", "name": "MSA Walkthrough", "start": 20, "end": 20},
            {"key": "hiring_portfolio", "tkey": "hiring", "name": "Portfolio Review — Naina", "start": 9, "end": 9},
        ]

        session_map: dict[str, Club] = {}
        for sd in sessions_defs:
            started = now - timedelta(days=sd["start"])
            club = Club(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                thread_id=thread_map[sd["tkey"]].id,
                name=sd["name"],
                started_at=started,
                ended_at=(now - timedelta(days=sd["end"])) if sd["end"] is not None else None,
                source=CaptureSource.extension,
                created_at=started,
                updated_at=started,
            )
            db.add(club)
            session_map[sd["key"]] = club
        db.commit()
        print(f"🎥 Seeded {len(session_map)} capture sessions.")

        # 5. Seed Captures (subthreads) — notes, follow-ups, questions, decisions.
        #    Each entry optionally links to a session (club) captured above.
        captures_data = [
            # Fintech Co.
            {"tkey": "fintech", "pkey": "aditya", "type": CaptureType.note, "session": "fintech_kickoff", "days_ago": 15,
             "content": "Budget approved for Q3 expansion — scope can include the payments flow redesign"},
            {"tkey": "fintech", "pkey": "aditya", "type": CaptureType.action, "session": "fintech_kickoff", "days_ago": 15,
             "content": "Send updated timeline by Friday — Aditya is blocked on this"},
            {"tkey": "fintech", "pkey": "neha", "type": CaptureType.note, "session": "fintech_kickoff", "days_ago": 15,
             "content": "Kickoff: aligned on Q3 payments-flow scope and success metrics"},
            {"tkey": "fintech", "pkey": "tanya", "type": CaptureType.follow_up, "session": "fintech_kickoff", "days_ago": 15,
             "content": "Collect vendor onboarding forms from procurement"},
            {"tkey": "fintech", "pkey": "aditya", "type": CaptureType.decision, "session": None, "days_ago": 12,
             "content": "Aditya confirmed Option B for payment flow. Documented in Notion."},
            {"tkey": "fintech", "pkey": "aditya", "type": CaptureType.note, "session": None, "days_ago": 10,
             "content": "Initial proposal shared — Aditya's reaction was positive, wants to move fast"},
            {"tkey": "fintech", "pkey": "aditya", "type": CaptureType.question, "session": None, "days_ago": 10,
             "content": "Do we need RBI compliance sign-off prior to the staging deploy?"},
            {"tkey": "fintech", "pkey": "neha", "type": CaptureType.question, "session": "fintech_deepdive", "days_ago": 2,
             "content": "Who owns the HSM key rotation schedule on their side?"},
            {"tkey": "fintech", "pkey": "neha", "type": CaptureType.decision, "session": "fintech_deepdive", "days_ago": 2,
             "content": "Chose sandbox-first rollout to de-risk the staging migration"},
            {"tkey": "fintech", "pkey": "neha", "type": CaptureType.follow_up, "session": "fintech_deepdive", "days_ago": 2,
             "content": "Share SOC2 report with their security team"},
            # Investor Z
            {"tkey": "investor_z", "pkey": "rahul", "type": CaptureType.note, "session": "investor_metrics", "days_ago": 22,
             "content": "Rahul interested in the product — asked to see metrics at Series A"},
            {"tkey": "investor_z", "pkey": "rahul", "type": CaptureType.question, "session": "investor_metrics", "days_ago": 22,
             "content": "Which north-star metric matters most pre-Series A — ARR or net retention?"},
            {"tkey": "investor_z", "pkey": "rahul", "type": CaptureType.decision, "session": "investor_metrics", "days_ago": 22,
             "content": "Agreed to share the Q3 metrics deck before the partner meeting"},
            {"tkey": "investor_z", "pkey": "rahul", "type": CaptureType.note, "session": None, "days_ago": 30,
             "content": "Coffee meeting — Rahul mentioned portfolio company BuildKit might be a potential client"},
            {"tkey": "investor_z", "pkey": "rahul", "type": CaptureType.note, "session": None, "days_ago": 45,
             "content": "Initial intro at ProdSummit — connected on LinkedIn"},
            # Startup Y
            {"tkey": "startup_y", "pkey": "kavya", "type": CaptureType.note, "session": "startup_scoping", "days_ago": 18,
             "content": "Met Kavya to discuss API integration specs"},
            {"tkey": "startup_y", "pkey": "vikram", "type": CaptureType.decision, "session": "startup_scoping", "days_ago": 18,
             "content": "Agreed on REST + webhooks over gRPC for the first integration"},
            {"tkey": "startup_y", "pkey": "vikram", "type": CaptureType.follow_up, "session": "startup_scoping", "days_ago": 18,
             "content": "Send sandbox API keys to Vikram"},
            {"tkey": "startup_y", "pkey": "kavya", "type": CaptureType.question, "session": None, "days_ago": 18,
             "content": "Is their technical lead available for a deep-dive next month?"},
            # Design Partner
            {"tkey": "design_partner", "pkey": "priya", "type": CaptureType.decision, "session": "design_review3", "days_ago": 2,
             "content": "Agreed on revised design token palette and typography scale"},
            {"tkey": "design_partner", "pkey": "priya", "type": CaptureType.note, "session": "design_review3", "days_ago": 2,
             "content": "Design review went very smoothly. Next milestone is component library sync."},
            {"tkey": "design_partner", "pkey": "sara", "type": CaptureType.follow_up, "session": "design_review3", "days_ago": 2,
             "content": "Ship updated Figma component library to Sara"},
            {"tkey": "design_partner", "pkey": "sara", "type": CaptureType.note, "session": "design_live", "days_ago": 0.02,
             "content": "Live: walking through the new 'Inventory' component states"},
            # Agency
            {"tkey": "agency", "pkey": "rohit", "type": CaptureType.note, "session": "agency_handoff", "days_ago": 6,
             "content": "Rohit sent first draft copy for the product landing pages"},
            {"tkey": "agency", "pkey": "rohit", "type": CaptureType.question, "session": "agency_handoff", "days_ago": 6,
             "content": "Do we localize the landing copy for the EU launch?"},
            # BrightWave
            {"tkey": "brightwave", "pkey": "arjun", "type": CaptureType.note, "session": "brightwave_intro", "days_ago": 3,
             "content": "BrightWave evaluating a 90-day paid pilot across 40 stores"},
            {"tkey": "brightwave", "pkey": "arjun", "type": CaptureType.question, "session": "brightwave_intro", "days_ago": 3,
             "content": "What does their procurement timeline look like?"},
            {"tkey": "brightwave", "pkey": "arjun", "type": CaptureType.note, "session": "brightwave_intro", "days_ago": 3,
             "content": "Arjun found us via the fintech case study — strong inbound signal"},
            # CloudPeak
            {"tkey": "cloudpeak", "pkey": "daniel", "type": CaptureType.note, "session": "cloudpeak_discovery", "days_ago": 1,
             "content": "CloudPeak open to a joint webinar + integration listing"},
            {"tkey": "cloudpeak", "pkey": "daniel", "type": CaptureType.follow_up, "session": "cloudpeak_discovery", "days_ago": 1,
             "content": "Draft co-marketing one-pager for Daniel"},
            {"tkey": "cloudpeak", "pkey": "daniel", "type": CaptureType.question, "session": "cloudpeak_discovery", "days_ago": 1,
             "content": "Who publishes the co-marketing blog — their team or ours?"},
            # Legal
            {"tkey": "legal", "pkey": "megha", "type": CaptureType.decision, "session": "legal_msa", "days_ago": 20,
             "content": "Standardize on 2-year MSAs with auto-renew clauses"},
            {"tkey": "legal", "pkey": "megha", "type": CaptureType.follow_up, "session": "legal_msa", "days_ago": 20,
             "content": "Megha to send redlined vendor MSA"},
            # Hiring
            {"tkey": "hiring", "pkey": "naina", "type": CaptureType.note, "session": "hiring_portfolio", "days_ago": 9,
             "content": "Naina's portfolio shows strong design-systems depth"},
            {"tkey": "hiring", "pkey": "naina", "type": CaptureType.decision, "session": "hiring_portfolio", "days_ago": 9,
             "content": "Move Naina to the final round with a systems-design exercise"},
        ]

        captured_map: list[Capture] = []
        for cd in captures_data:
            days_ago = cd["days_ago"]
            session_key = cd.get("session")
            c = Capture(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                thread_id=thread_map[cd["tkey"]].id,
                club_id=session_map[session_key].id if session_key else None,
                person_id=people_map[cd["pkey"]].id,
                type=cd["type"],
                content=cd["content"],
                source=CaptureSource.manual,
                status=CaptureStatus.filed,
                captured_at=now - timedelta(days=days_ago),
                created_at=now - timedelta(days=days_ago),
                updated_at=now - timedelta(days=days_ago),
            )
            db.add(c)
            captured_map.append(c)
        db.commit()
        print(f"📝 Seeded {len(captures_data)} captures.")

        # 6. Seed Commitments (tracked promises with owners + deadlines).
        commitments_data = [
            # Fintech Co.
            {"tkey": "fintech", "desc": "Send updated timeline to Aditya", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": -2, "session": None},
            {"tkey": "fintech", "desc": "Schedule design review meeting with payments team", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 1, "session": None},
            {"tkey": "fintech", "desc": "Confirm sandbox credentials for staging", "owner_type": CommitmentOwnerType.person,
             "owner_person": "neha", "due_in_days": 2, "session": "fintech_deepdive"},
            {"tkey": "fintech", "desc": "Share SOC2 report with Fintech security team", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 3, "session": "fintech_deepdive"},
            {"tkey": "fintech", "desc": "Finalize Q3 expansion budget with Tanya", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 6, "session": "fintech_kickoff"},
            {"tkey": "fintech", "desc": "Send initial NDA to Fintech Co.", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": -6, "session": None,
             "status": "completed", "completed_days_ago": 5},
            # Investor Z
            {"tkey": "investor_z", "desc": "Intro to Series A lead at Horizon portfolio", "owner_type": CommitmentOwnerType.person,
             "owner_person": "rahul", "due_in_days": None, "session": None},
            {"tkey": "investor_z", "desc": "Share Q3 metrics deck with Rahul", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 4, "session": "investor_metrics"},
            # Startup Y
            {"tkey": "startup_y", "desc": "Send sandbox API keys to Vikram", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": -1, "session": "startup_scoping"},
            {"tkey": "startup_y", "desc": "Provide integration test plan for the reseller channel", "owner_type": CommitmentOwnerType.person,
             "owner_person": "vikram", "due_in_days": 8, "session": None},
            # Design Partner
            {"tkey": "design_partner", "desc": "Deliver typography system specs", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 10, "session": None},
            {"tkey": "design_partner", "desc": "Ship updated Figma component library to Sara", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 6, "session": "design_review3"},
            # Agency
            {"tkey": "agency", "desc": "Review landing page draft copy from Rohit", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 5, "session": "agency_handoff"},
            {"tkey": "agency", "desc": "Kick off copywriting engagement", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": -4, "session": None,
             "status": "completed", "completed_days_ago": 3},
            # BrightWave
            {"tkey": "brightwave", "desc": "Send pilot pricing proposal to Arjun", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 4, "session": "brightwave_intro"},
            {"tkey": "brightwave", "desc": "Confirm procurement timeline", "owner_type": CommitmentOwnerType.person,
             "owner_person": "arjun", "due_in_days": 7, "session": "brightwave_intro"},
            # CloudPeak
            {"tkey": "cloudpeak", "desc": "Draft co-marketing one-pager for Daniel", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 2, "session": "cloudpeak_discovery"},
            {"tkey": "cloudpeak", "desc": "Intro the CloudPeak partnerships lead", "owner_type": CommitmentOwnerType.person,
             "owner_person": "daniel", "due_in_days": None, "session": "cloudpeak_discovery"},
            # Legal
            {"tkey": "legal", "desc": "Megha to send redlined MSA", "owner_type": CommitmentOwnerType.person,
             "owner_person": "megha", "due_in_days": 1, "session": "legal_msa"},
            {"tkey": "legal", "desc": "Sign the vendor MSA renewal", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 9, "session": "legal_msa"},
            # Hiring
            {"tkey": "hiring", "desc": "Schedule final round for Naina", "owner_type": CommitmentOwnerType.me,
             "owner_person": None, "due_in_days": 0, "session": "hiring_portfolio"},
            # ── Theirs: promises OTHERS made to me (owner_type = person) ──
            {"tkey": "fintech", "desc": "Aditya to send the updated compliance checklist", "owner_type": CommitmentOwnerType.person,
             "owner_person": "aditya", "due_in_days": 5, "session": "fintech_kickoff"},
            {"tkey": "fintech", "desc": "Tanya to return the signed vendor onboarding forms", "owner_type": CommitmentOwnerType.person,
             "owner_person": "tanya", "due_in_days": 3, "session": "fintech_kickoff"},
            {"tkey": "investor_z", "desc": "Rahul to confirm the partner meeting date", "owner_type": CommitmentOwnerType.person,
             "owner_person": "rahul", "due_in_days": 1, "session": "investor_metrics"},
            {"tkey": "startup_y", "desc": "Kavya to share the partnership term-sheet draft", "owner_type": CommitmentOwnerType.person,
             "owner_person": "kavya", "due_in_days": 6, "session": None},
            {"tkey": "design_partner", "desc": "Priya to finalize the design-token review notes", "owner_type": CommitmentOwnerType.person,
             "owner_person": "priya", "due_in_days": 2, "session": "design_review3"},
            {"tkey": "design_partner", "desc": "Sara to share the updated component inventory", "owner_type": CommitmentOwnerType.person,
             "owner_person": "sara", "due_in_days": -1, "session": "design_live"},
            {"tkey": "agency", "desc": "Rohit to send the revised landing page copy", "owner_type": CommitmentOwnerType.person,
             "owner_person": "rohit", "due_in_days": 4, "session": "agency_handoff"},
            {"tkey": "brightwave", "desc": "Arjun to share BrightWave's security requirements", "owner_type": CommitmentOwnerType.person,
             "owner_person": "arjun", "due_in_days": -3, "session": "brightwave_intro"},
            {"tkey": "cloudpeak", "desc": "Daniel to confirm the co-marketing webinar slot", "owner_type": CommitmentOwnerType.person,
             "owner_person": "daniel", "due_in_days": 5, "session": "cloudpeak_discovery"},
            {"tkey": "hiring", "desc": "Naina to complete the systems-design exercise", "owner_type": CommitmentOwnerType.person,
             "owner_person": "naina", "due_in_days": 7, "session": "hiring_portfolio"},
            {"tkey": "legal", "desc": "Megha to confirm the revised MSA redlines", "owner_type": CommitmentOwnerType.person,
             "owner_person": "megha", "due_in_days": 2, "session": "legal_msa"},
        ]

        commitments_map: list[Commitment] = []
        for cd in commitments_data:
            due = cd["due_in_days"]
            session_key = cd.get("session")
            is_completed = cd.get("status") == "completed"
            cm = Commitment(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                thread_id=thread_map[cd["tkey"]].id,
                club_id=session_map[session_key].id if session_key else None,
                description=cd["desc"],
                owner_type=cd["owner_type"],
                owner_person_id=people_map[cd["owner_person"]].id if cd["owner_person"] else None,
                status=CommitmentStatus.completed if is_completed else CommitmentStatus.open,
                completed_at=(now - timedelta(days=cd["completed_days_ago"])) if is_completed else None,
                completion_note="Done ahead of schedule." if is_completed else None,
                due_date=(now + timedelta(days=due)) if due is not None else None,
                created_at=now - timedelta(days=5),
                updated_at=now - timedelta(days=5),
            )
            db.add(cm)
            commitments_map.append(cm)
        db.commit()
        print(f"🎯 Seeded {len(commitments_data)} commitments.")

        # 7. Seed Timeline Events (enriched activity feed per thread)
        for key, t in thread_map.items():
            db.add(TimelineEvent(
                id=str(uuid.uuid4()), thread_id=t.id, user_id=DEMO_USER_ID,
                type=TimelineEventType.thread_created, reference_id=t.id,
                event_metadata={"title": t.title}, occurred_at=t.created_at,
            ))
        for link in db.query(ThreadPerson).all():
            db.add(TimelineEvent(
                id=str(uuid.uuid4()), thread_id=link.thread_id, user_id=DEMO_USER_ID,
                type=TimelineEventType.person_added, reference_id=link.person_id,
                event_metadata={}, occurred_at=link.added_at,
            ))
        for c in captured_map:
            db.add(TimelineEvent(
                id=str(uuid.uuid4()), thread_id=c.thread_id, user_id=DEMO_USER_ID,
                type=TimelineEventType.capture_added, reference_id=c.id,
                event_metadata={"type": c.type.value, "content": c.content[:120]},
                occurred_at=c.captured_at,
            ))
        for cm in commitments_map:
            db.add(TimelineEvent(
                id=str(uuid.uuid4()), thread_id=cm.thread_id, user_id=DEMO_USER_ID,
                type=TimelineEventType.commitment_created, reference_id=cm.id,
                event_metadata={"description": cm.description}, occurred_at=cm.created_at,
            ))
            if cm.status == CommitmentStatus.completed:
                db.add(TimelineEvent(
                    id=str(uuid.uuid4()), thread_id=cm.thread_id, user_id=DEMO_USER_ID,
                    type=TimelineEventType.commitment_completed, reference_id=cm.id,
                    event_metadata={"description": cm.description}, occurred_at=cm.completed_at,
                ))
        # A couple of generated summary / brief events for demo flavour
        for key in ("fintech", "investor_z", "design_partner"):
            t = thread_map[key]
            db.add(TimelineEvent(
                id=str(uuid.uuid4()), thread_id=t.id, user_id=DEMO_USER_ID,
                type=TimelineEventType.summary_generated, reference_id=None,
                event_metadata={"summary_type": "where_we_left_off"},
                occurred_at=now - timedelta(days=1),
            ))
        t = thread_map["fintech"]
        db.add(TimelineEvent(
            id=str(uuid.uuid4()), thread_id=t.id, user_id=DEMO_USER_ID,
            type=TimelineEventType.brief_opened, reference_id=None,
            event_metadata={}, occurred_at=now - timedelta(hours=6),
        ))
        db.commit()
        print("🕒 Seeded thread timeline events.")

        # 8. Recompute Attention Scores for all threads
        print("⚡ Calculating Attention Scores...")
        for key, t in thread_map.items():
            score = attention_service.recompute_thread(db, t.id, DEMO_USER_ID)
            print(f"   [{key.upper()}] '{t.title}' => Attention Score: {score}")

        db.commit()
        print("✅ Database seeding complete! Today view is ready for demo.")

    except Exception as exc:
        db.rollback()
        print(f"❌ Error during seeding: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

