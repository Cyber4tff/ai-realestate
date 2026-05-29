from app.core.database import SessionLocal
from app.services.real_estate_service import RealEstateService
from app.models.all_models import Lead, Owner, Outreach, AgentActivityLog

def main():
    db = SessionLocal()
    try:
        print("--- STARTING REALTIME AUTOMATION FILTER TEST ---")
        
        # Execute one autonomous cycle
        res = RealEstateService.execute_autonomous_cycle(db)
        print(f"\n[+] Cycle Execution Result:")
        print(f"    - Lead ID: #{res['lead_id']}")
        print(f"    - Address: {res['address']}")
        print(f"    - Pipeline Status: {res['status']}")
        print(f"    - Deal Score: {res['score']}/100")
        
        # Fetch the latest logs for this execution
        print("\n[+] Realtime Activity Logs:")
        logs = db.query(AgentActivityLog).order_by(AgentActivityLog.created_at.desc()).limit(10).all()
        for log in reversed(logs):
            print(f"    [{log.agent_name}] {log.message}")
            
        # Verify Resend email status
        outreach = db.query(Outreach).filter(Outreach.lead_id == res['lead_id']).first()
        if outreach:
            print(f"\n[+] Outreach Mail Status:")
            print(f"    - Subject: {outreach.subject}")
            print(f"    - Style: {outreach.style}")
            print(f"    - Mail State: {outreach.status}")
            print(f"    - Response Received: {outreach.response_received}")
            if outreach.response_received:
                print(f"    - Response Content: \"{outreach.response_content}\"")
                
    except Exception as e:
        print(f"\n[!] Automation error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
