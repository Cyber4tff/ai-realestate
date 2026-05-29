from app.core.database import SessionLocal, engine, Base
from app.services.real_estate_service import RealEstateService

def main():
    # Make sure all tables are created on a clean database run
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Seeding data clears and populates the database tables with our upgraded metrics
        RealEstateService.seed_initial_data(db)
        
        # Update settings specifically with Resend API key and Acquisition Modes
        settings = RealEstateService.get_settings(db)
        settings.resend_api_key = "re_NMApTjvD_49yBFPcQraRReHFTeCXqLKNY"
        settings.operator_email = "cyber4pf@gmail.com"
        settings.mode = "Autonomous"
        settings.acquisition_mode = "Fast Wholesale"
        settings.confidence_threshold = 72
        db.commit()
        db.refresh(settings)
        print(f"Database tables initialized and updated successfully. Operator: {settings.operator_email}, Targeting Mode: {settings.acquisition_mode}, Threshold: {settings.confidence_threshold}")
    except Exception as e:
        print(f"Error seeding keys: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()
