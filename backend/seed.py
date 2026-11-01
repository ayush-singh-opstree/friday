"""
seed.py — Populates the database with Meera Krishnamurthy's demo seed data.

Strictly follows docs/10_pitch_playbook.md Seed Data Specification:
- User: Meera Krishnamurthy
- 5 Contacts: Aditya Joshi, Rahul Verma, Kavya Nair, Priya Mehta, Rohit Sharma
- 5 Threads:
    1. Fintech Co. — Aditya (Critical, Score ~85, 1 overdue, 1 due soon)
    2. Investor Z — Rahul (Going Cold, 22 days since contact)
    3. Startup Y — Partnership (Going Cold, 18 days since contact)
    4. Design Partner — Priya (Active, low urgency, 2 days ago)
    5. Agency Contract — Rohit (Active, medium, 6 days ago)
- Captures, Commitments, ThreadPerson links, and Timeline events
- Recomputes Attention scores on exit

Run with:
    python seed.py
"""
import uuid
from datetime import datetime, timedelta

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

        # Clean existing thread/people data for a fresh seed run
        db.query(TimelineEvent).filter(TimelineEvent.user_id == DEMO_USER_ID).delete()
        db.query(Commitment).filter(Commitment.user_id == DEMO_USER_ID).delete()
        db.query(Capture).filter(Capture.user_id == DEMO_USER_ID).delete()
        db.query(ThreadPerson).delete()
        db.query(Thread).filter(Thread.user_id == DEMO_USER_ID).delete()
        db.query(Person).filter(Person.user_id == DEMO_USER_ID).delete()
        db.commit()

        # 2. Seed People
        people_defs = [
            {
                "var": "aditya",
                "name": "Aditya Joshi",
                "org": "Fintech Co.",
                "role": "CFO",
                "email": "aditya@fintechco.example.com",
                "notes": "Prefers quick WhatsApp/Slack updates. Focused on compliance and speed.",
            },
            {
                "var": "rahul",
                "name": "Rahul Verma",
                "org": "Horizon Ventures",
                "role": "Partner",
                "email": "rahul@horizonvc.example.com",
                "notes": "Met at ProdSummit. Looking for Series A pipeline metrics.",
            },
            {
                "var": "kavya",
                "name": "Kavya Nair",
                "org": "Startup Y",
                "role": "Co-founder",
                "email": "kavya@startupy.example.com",
                "notes": "B2B integration partner exploration.",
            },
            {
                "var": "priya",
                "name": "Priya Mehta",
                "org": "DesignCo",
                "role": "Head of Design",
                "email": "priya@designco.example.com",
                "notes": "Design sprint collaboration partner.",
            },
            {
                "var": "rohit",
                "name": "Rohit Sharma",
                "org": "SharpAgency",
                "role": "Founder",
                "email": "rohit@sharpagency.example.com",
                "notes": "External vendor for technical copy and landing pages.",
            },
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
                notes=p["notes"],
                created_at=now - timedelta(days=60),
                updated_at=now - timedelta(days=5),
            )
            db.add(person)
            people_map[p["var"]] = person
        db.commit()
        print(f"👥 Seeded {len(people_map)} contacts.")

        # 3. Seed Threads
        threads_defs = [
            {
                "key": "fintech",
                "title": "Fintech Co. — Aditya",
                "desc": "Q3 expansion & payments flow redesign consultation",
                "days_ago": 10,
                "is_pinned": True,
                "person": "aditya",
            },
            {
                "key": "investor_z",
                "title": "Investor Z — Rahul",
                "desc": "Horizon Ventures Series A intro & metric sharing",
                "days_ago": 22,
                "is_pinned": False,
                "person": "rahul",
            },
            {
                "key": "startup_y",
                "title": "Startup Y — Partnership",
                "desc": "Exploration of joint API integration and reseller channel",
                "days_ago": 18,
                "is_pinned": False,
                "person": "kavya",
            },
            {
                "key": "design_partner",
                "title": "Design Partner — Priya",
                "desc": "Figma component system and quarterly design reviews",
                "days_ago": 2,
                "is_pinned": False,
                "person": "priya",
            },
            {
                "key": "agency",
                "title": "Agency Contract — Rohit",
                "desc": "Copywriting deliverables and landing page redesign",
                "days_ago": 6,
                "is_pinned": False,
                "person": "rohit",
            },
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

            # Link Person to Thread
            person = people_map[td["person"]]
            link = ThreadPerson(
                thread_id=t.id,
                person_id=person.id,
                added_at=now - timedelta(days=50),
            )
            db.add(link)

        db.commit()
        print(f"🧵 Seeded {len(thread_map)} relationship threads.")

        # 4. Seed Captures
        captures_data = [
            # Fintech Co.
            (
                "fintech",
                "aditya",
                CaptureType.note,
                "Budget approved for Q3 expansion — scope can include the payments flow redesign",
                15,
            ),
            (
                "fintech",
                "aditya",
                CaptureType.action,
                "Send updated timeline by Friday — Aditya is blocked on this",
                15,
            ),
            (
                "fintech",
                "aditya",
                CaptureType.decision,
                "Aditya confirmed Option B for payment flow. Documented in Notion.",
                12,
            ),
            (
                "fintech",
                "aditya",
                CaptureType.note,
                "Initial proposal shared — Aditya's reaction was positive, wants to move fast",
                10,
            ),
            (
                "fintech",
                "aditya",
                CaptureType.question,
                "Do we need RBI compliance sign-off prior to the staging deploy?",
                10,
            ),
            # Investor Z
            (
                "investor_z",
                "rahul",
                CaptureType.note,
                "Rahul interested in the product — asked to see metrics at Series A",
                22,
            ),
            (
                "investor_z",
                "rahul",
                CaptureType.note,
                "Coffee meeting — Rahul mentioned portfolio company BuildKit might be a potential client",
                30,
            ),
            (
                "investor_z",
                "rahul",
                CaptureType.note,
                "Initial intro at ProdSummit — connected on LinkedIn",
                45,
            ),
            # Startup Y
            (
                "startup_y",
                "kavya",
                CaptureType.note,
                "Met Kavya to discuss API integration specs",
                18,
            ),
            (
                "startup_y",
                "kavya",
                CaptureType.question,
                "Need to follow up if their technical lead is available next month",
                18,
            ),
            # Design Partner
            (
                "design_partner",
                "priya",
                CaptureType.decision,
                "Agreed on revised design token palette and typography scale",
                2,
            ),
            (
                "design_partner",
                "priya",
                CaptureType.note,
                "Design review went very smoothly. Next milestone is component library sync.",
                2,
            ),
            # Agency
            (
                "agency",
                "rohit",
                CaptureType.note,
                "Rohit sent first draft copy for the product landing pages",
                6,
            ),
        ]

        for tkey, pkey, ctype, content, days_ago in captures_data:
            c = Capture(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                thread_id=thread_map[tkey].id,
                person_id=people_map[pkey].id,
                type=ctype,
                content=content,
                source=CaptureSource.manual,
                status=CaptureStatus.filed,
                captured_at=now - timedelta(days=days_ago),
                created_at=now - timedelta(days=days_ago),
                updated_at=now - timedelta(days=days_ago),
            )
            db.add(c)
        db.commit()
        print(f"📝 Seeded {len(captures_data)} captures.")

        # 5. Seed Commitments
        commitments_data = [
            # Fintech Co. - 1 overdue, 1 due tomorrow
            {
                "tkey": "fintech",
                "desc": "Send updated timeline to Aditya",
                "owner_type": CommitmentOwnerType.me,
                "owner_person": None,
                "due_date": now - timedelta(days=2),  # OVERDUE
            },
            {
                "tkey": "fintech",
                "desc": "Schedule design review meeting with payments team",
                "owner_type": CommitmentOwnerType.me,
                "owner_person": None,
                "due_date": now + timedelta(days=1),  # DUE IN 1 DAY
            },
            # Investor Z - 1 open with no due date
            {
                "tkey": "investor_z",
                "desc": "Intro to Series A lead at Horizon portfolio",
                "owner_type": CommitmentOwnerType.person,
                "owner_person": "rahul",
                "due_date": None,
            },
            # Design Partner - 1 open due in 10 days
            {
                "tkey": "design_partner",
                "desc": "Deliver typography system specs",
                "owner_type": CommitmentOwnerType.me,
                "owner_person": None,
                "due_date": now + timedelta(days=10),
            },
            # Agency - 1 open due in 5 days
            {
                "tkey": "agency",
                "desc": "Review landing page draft copy from Rohit",
                "owner_type": CommitmentOwnerType.me,
                "owner_person": None,
                "due_date": now + timedelta(days=5),
            },
        ]

        for cd in commitments_data:
            cm = Commitment(
                id=str(uuid.uuid4()),
                user_id=DEMO_USER_ID,
                thread_id=thread_map[cd["tkey"]].id,
                description=cd["desc"],
                owner_type=cd["owner_type"],
                owner_person_id=people_map[cd["owner_person"]].id if cd["owner_person"] else None,
                status=CommitmentStatus.open,
                due_date=cd["due_date"],
                created_at=now - timedelta(days=5),
                updated_at=now - timedelta(days=5),
            )
            db.add(cm)
        db.commit()
        print(f"🎯 Seeded {len(commitments_data)} commitments.")

        # 6. Recompute Attention Scores for all threads
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

