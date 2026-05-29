from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.all_models import User, Lead, DevelopmentZone, Owner, Outreach, Negotiation, Offer, InternalListing, BuyerMatch, Investor
from app.services.real_estate_service import RealEstateService
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

router = APIRouter()

class SettingsRequest(BaseModel):
    mode: Optional[str] = None
    operator_email: Optional[str] = None
    resend_api_key: Optional[str] = None
    sendgrid_api_key: Optional[str] = None
    map_provider: Optional[str] = None
    is_active: Optional[bool] = None
    acquisition_mode: Optional[str] = None
    confidence_threshold: Optional[int] = None
    
    batchdata_api_key: Optional[str] = None
    propstream_api_key: Optional[str] = None
    clearbit_api_key: Optional[str] = None
    peopledatalabs_api_key: Optional[str] = None
    whitepages_api_key: Optional[str] = None
    regrid_api_key: Optional[str] = None
    attom_api_key: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    status: str

class OfferRequest(BaseModel):
    amount: float
    offer_type: str = "cash"

class OutreachRequest(BaseModel):
    style: str

class SimulateReplyRequest(BaseModel):
    reply_text: str

@router.get("/summary")
def get_real_estate_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Fetches aggregate KPIs, latest logs, zones, and leads for dashboard overview.
    Auto-seeds mock database if this is the first execution.
    """
    if db.query(Lead).count() == 0:
        RealEstateService.seed_initial_data(db)
    
    leads = db.query(Lead).all()
    zones = db.query(DevelopmentZone).all()
    logs = RealEstateService.get_logs(db, limit=15)
    settings = RealEstateService.get_settings(db)
    
    # Calculate stats
    total_leads = len(leads)
    active_outreach = sum(1 for l in leads if l.status == "Outreach Sent")
    negotiations = sum(1 for l in leads if l.status in ["Seller Responded", "Negotiation", "Offer Generated"])
    under_contract = sum(1 for l in leads if l.status == "Under Contract")
    closed_deals = sum(1 for l in leads if l.status == "Closed")
    
    total_acreage = sum(l.acreage for l in leads if l.acreage)
    total_spread = sum(l.wholesale_spread for l in leads if l.status != "Closed")
    
    # Format leads briefly for overview table
    formatted_leads = []
    for l in leads:
        formatted_leads.append({
            "id": l.id,
            "address": l.address,
            "latitude": l.latitude,
            "longitude": l.longitude,
            "acreage": l.acreage,
            "zoning": l.zoning,
            "status": l.status,
            "arv": l.arv,
            "resale_value": l.resale_value,
            "wholesale_spread": l.wholesale_spread,
            "score": l.scores.get("Overall Score", 0) if l.scores else 0,
            "scores": l.scores,
            "source": l.source
        })
        
    formatted_zones = []
    for z in zones:
        formatted_zones.append({
            "id": z.id,
            "name": z.name,
            "location": z.location,
            "latitude": z.latitude,
            "longitude": z.longitude,
            "description": z.description,
            "scores": z.scores,
            "indicators": z.indicators
        })
        
    listings = db.query(InternalListing).all()
    buyer_matches = db.query(BuyerMatch).all()
    
    formatted_listings = []
    for lst in listings:
        formatted_listings.append({
            "id": lst.id,
            "lead_id": lst.lead_id,
            "address": lst.lead.address if lst.lead else "Unknown Address",
            "parcel_summary": lst.parcel_summary,
            "acreage": lst.acreage,
            "zoning": lst.zoning,
            "estimated_roi": lst.estimated_roi,
            "development_potential": lst.development_potential,
            "acquisition_score": lst.acquisition_score,
            "suggested_resale_value": lst.suggested_resale_value,
            "investor_target_type": lst.investor_target_type,
            "created_at": lst.created_at.isoformat()
        })
        
    formatted_matches = []
    for bm in buyer_matches:
        formatted_matches.append({
            "id": bm.id,
            "listing_id": bm.listing_id,
            "buyer_id": bm.buyer_id,
            "buyer_name": bm.buyer.name if bm.buyer else "Unknown Investor",
            "buyer_email": bm.buyer.email if bm.buyer else "",
            "address": bm.listing.lead.address if bm.listing and bm.listing.lead else "Unknown Address",
            "match_score": bm.match_score,
            "matched_criteria": bm.matched_criteria,
            "outreach_status": bm.outreach_status,
            "created_at": bm.created_at.isoformat()
        })

    return {
        "kpis": {
            "total_leads": total_leads,
            "active_outreach": active_outreach,
            "negotiations": negotiations,
            "under_contract": under_contract,
            "closed_deals": closed_deals,
            "total_acreage": round(total_acreage, 1),
            "total_spread": total_spread
        },
        "settings": {
            "mode": settings.mode,
            "operator_email": settings.operator_email,
            "map_provider": settings.map_provider,
            "is_active": settings.is_active,
            "has_resend_key": bool(settings.resend_api_key),
            "has_sendgrid_key": bool(settings.sendgrid_api_key),
            "acquisition_mode": settings.acquisition_mode,
            "confidence_threshold": settings.confidence_threshold,
            
            "batchdata_api_key": settings.batchdata_api_key,
            "propstream_api_key": settings.propstream_api_key,
            "clearbit_api_key": settings.clearbit_api_key,
            "peopledatalabs_api_key": settings.peopledatalabs_api_key,
            "whitepages_api_key": settings.whitepages_api_key,
            "regrid_api_key": settings.regrid_api_key,
            "attom_api_key": settings.attom_api_key
        },
        "leads": formatted_leads,
        "zones": formatted_zones,
        "internal_listings": formatted_listings,
        "buyer_matches": formatted_matches,
        "logs": [
            {
                "id": log.id,
                "agent_name": log.agent_name,
                "log_level": log.log_level,
                "message": log.message,
                "created_at": log.created_at.isoformat()
            } for log in logs
        ]
    }

@router.get("/leads")
def list_leads(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Returns list of all active property leads."""
    leads = db.query(Lead).order_by(Lead.created_at.desc()).all()
    return [{
        "id": l.id,
        "address": l.address,
        "latitude": l.latitude,
        "longitude": l.longitude,
        "acreage": l.acreage,
        "zoning": l.zoning,
        "utility_access": l.utility_access,
        "road_access": l.road_access,
        "terrain": l.terrain,
        "flood_risk": l.flood_risk,
        "source": l.source,
        "status": l.status,
        "arv": l.arv,
        "rehab_cost": l.rehab_cost,
        "wholesale_spread": l.wholesale_spread,
        "resale_value": l.resale_value,
        "scores": l.scores,
        "notes": l.notes,
        "created_at": l.created_at.isoformat()
    } for l in leads]

@router.get("/leads/{id}")
def get_lead_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Fetches full data graph for a single lead (owners, outreach logs, negotiations, offers)."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    owners = db.query(Owner).filter(Owner.lead_id == id).all()
    outreaches = db.query(Outreach).filter(Outreach.lead_id == id).all()
    negs = db.query(Negotiation).filter(Negotiation.lead_id == id).all()
    offers = db.query(Offer).filter(Offer.lead_id == id).all()
    
    return {
        "lead": {
            "id": lead.id,
            "address": lead.address,
            "latitude": lead.latitude,
            "longitude": lead.longitude,
            "acreage": lead.acreage,
            "zoning": lead.zoning,
            "utility_access": lead.utility_access,
            "road_access": lead.road_access,
            "terrain": lead.terrain,
            "flood_risk": lead.flood_risk,
            "source": lead.source,
            "status": lead.status,
            "arv": lead.arv,
            "rehab_cost": lead.rehab_cost,
            "wholesale_spread": lead.wholesale_spread,
            "resale_value": lead.resale_value,
            "scores": lead.scores,
            "notes": lead.notes
        },
        "owners": [{
            "id": o.id,
            "name": o.name,
            "mailing_address": o.mailing_address,
            "llc_ownership": o.llc_ownership,
            "business_records": o.business_records,
            "contact_email": o.contact_email,
            "contact_phone": o.contact_phone,
            "source": o.source,
            "confidence_score": o.confidence_score,
            "source_count": o.source_count,
            "verification_timestamp": o.verification_timestamp.isoformat() if o.verification_timestamp else None,
            "contact_classification": o.contact_classification,
            "data_sources": o.data_sources,
            "intelligence_labels": o.intelligence_labels
        } for o in owners],
        "outreach": [{
            "id": o.id,
            "channel": o.channel,
            "subject": o.subject,
            "content": o.content,
            "sent_at": o.sent_at.isoformat(),
            "response_received": o.response_received,
            "response_content": o.response_content,
            "response_at": o.response_at.isoformat() if o.response_at else None,
            "style": o.style,
            "status": o.status
        } for o in outreaches],
        "negotiations": [{
            "id": n.id,
            "detected_motivation": n.detected_motivation,
            "detected_urgency": n.detected_urgency,
            "recommended_offer_range_min": n.recommended_offer_range_min,
            "recommended_offer_range_max": n.recommended_offer_range_max,
            "proposed_strategy": n.proposed_strategy,
            "created_at": n.created_at.isoformat()
        } for n in negs],
        "offers": [{
            "id": o.id,
            "amount": o.amount,
            "offer_type": o.offer_type,
            "content": o.content,
            "status": o.status,
            "created_at": o.created_at.isoformat()
        } for o in offers]
    }

@router.put("/leads/{id}/status")
def update_lead_status(
    id: int,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Manually move lead stage in pipeline CRM."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    old_status = lead.status
    lead.status = req.status
    db.commit()
    
    RealEstateService.log_activity(
        db, "CRM", "INFO", 
        f"Manually moved property #{id} ({lead.address.split(',')[0]}) from stage '{old_status}' to '{req.status}'."
    )
    return {"success": True, "status": lead.status}

@router.post("/leads/{id}/generate-offer")
def generate_offer(
    id: int,
    req: OfferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate purchase agreement offer for owner."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
        
    content = (
        f"AGREEMENT FOR PURCHASE AND SALE OF REAL ESTATE\n\n"
        f"Property Address: {lead.address}\n"
        f"Purchaser: {settings.PROJECT_NAME} Acquisitions\n"
        f"Purchase Price: ${req.amount:,.2f} Cash Close\n"
        f"Title Escrow: 100% Buyer Covered\n"
        f"Close Date: Within 14-21 Days after approval."
    )
    
    # Check if offer exists
    offer = db.query(Offer).filter(Offer.lead_id == id).first()
    if offer:
        offer.amount = req.amount
        offer.content = content
        offer.status = "Draft"
    else:
        offer = Offer(
            lead_id=id,
            amount=req.amount,
            offer_type=req.offer_type,
            content=content,
            status="Draft"
        )
        db.add(offer)
        
    lead.status = "Offer Generated"
    db.commit()
    
    RealEstateService.log_activity(
        db, "Negotiation Agent", "INFO", 
        f"Generated new formal contract offer for {lead.address.split(',')[0]} at ${req.amount:,.2f} cash."
    )
    return {"success": True, "offer_id": offer.id, "amount": offer.amount}

@router.post("/leads/{id}/send-outreach")
def send_outreach(
    id: int,
    req: OutreachRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Sends outreach template (simulation/real Resend) to owner."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    owner = db.query(Owner).filter(Owner.lead_id == id).first()
    if not lead or not owner:
        raise HTTPException(status_code=404, detail="Lead or Owner details missing")
        
    if owner.name in ["No Verified Contact Found", "NO VERIFIED CONTACT FOUND"] or not owner.contact_email:
        raise HTTPException(status_code=400, detail="Cannot send outreach: Owner email is unverified or missing.")
        
    subject = f"Direct Inquiry: property at {lead.address.split(',')[0]}"
    content = (
        f"Hi {owner.name},\n\n"
        f"I'm with the Acquisition team. We're looking for land lots around {lead.address.split(',')[1].strip()} and "
        f"would like to offer a direct purchase deal. We can buy as-is and close fast. Please reply if interested.\n\n"
        f"Thanks,\nAcquisitions Officer"
    )
    
    res = RealEstateService.send_outbound_email(db, owner.contact_email, subject, content)
    
    outreach = Outreach(
        lead_id=lead.id,
        owner_id=owner.id,
        channel="email",
        subject=subject,
        content=content,
        style=req.style,
        status="sent"
    )
    db.add(outreach)
    lead.status = "Outreach Sent"
    db.commit()
    
    RealEstateService.log_activity(
        db, "Outreach Agent", "INFO", 
        f"Sent '{req.style}' outreach campaign to owner {owner.name} ({owner.contact_email}) using {res['service']}."
    )
    return {"success": True, "service": res["service"]}

@router.post("/leads/{id}/simulate-reply")
def simulate_reply(
    id: int,
    req: SimulateReplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Simulate a response from property owner to test negotiation agents."""
    lead = db.query(Lead).filter(Lead.id == id).first()
    outreach = db.query(Outreach).filter(Outreach.lead_id == id).order_by(Outreach.sent_at.desc()).first()
    if not lead or not outreach:
        raise HTTPException(status_code=400, detail="Cannot simulate reply without prior outreach sent")
        
    outreach.response_received = True
    outreach.response_content = req.reply_text
    outreach.response_at = datetime.now(timezone.utc)
    outreach.status = "replied"
    lead.status = "Seller Responded"
    
    # Negotiation Agent executes analysis
    motivation = "High" if any(x in req.reply_text.lower() for x in ["liens", "taxes", "sell fast", "offload", "inheritance"]) else "Medium"
    urgency = "High" if any(x in req.reply_text.lower() for x in ["liens", "foreclose", "quick", "immediate"]) else "Medium"
    
    min_range = round(lead.resale_value * 0.45, -3)
    max_range = round(lead.resale_value * 0.70, -3)
    proposed_strategy = f"Seller motivation is {motivation}. Recommend offering initial purchase contract at ${min_range:,.0f} and covering all escrows."
    
    neg = Negotiation(
        lead_id=lead.id,
        outreach_id=outreach.id,
        detected_motivation=motivation,
        detected_urgency=urgency,
        recommended_offer_range_min=min_range,
        recommended_offer_range_max=max_range,
        proposed_strategy=proposed_strategy
    )
    db.add(neg)
    db.commit()
    
    RealEstateService.log_activity(
        db, "Negotiation Agent", "INFO", 
        f"Seller response processed. Urgency: {urgency}. Recommended offer strategy uploaded."
    )
    return {"success": True}

@router.post("/run-agent")
def run_autonomous_agent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Triggers one step in the autonomous acquisition engine pipeline."""
    result = RealEstateService.execute_autonomous_cycle(db)
    return {
        "success": True, 
        "message": f"Cycle ran successfully. Found lead at {result['address']}.",
        "lead_id": result["lead_id"],
        "lead_status": result["status"]
    }

@router.post("/report")
def generate_manual_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generates daily report email immediately to operator."""
    res = RealEstateService.send_daily_lead_report(db)
    return {"success": True, "sent_to": res["sent_to"], "service": res["service"]}

@router.get("/settings")
def get_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Retrieve settings."""
    cfg = RealEstateService.get_settings(db)
    return {
        "mode": cfg.mode,
        "operator_email": cfg.operator_email,
        "resend_api_key": cfg.resend_api_key,
        "sendgrid_api_key": cfg.sendgrid_api_key,
        "map_provider": cfg.map_provider,
        "is_active": cfg.is_active,
        "acquisition_mode": cfg.acquisition_mode,
        "confidence_threshold": cfg.confidence_threshold,
        
        "batchdata_api_key": cfg.batchdata_api_key,
        "propstream_api_key": cfg.propstream_api_key,
        "clearbit_api_key": cfg.clearbit_api_key,
        "peopledatalabs_api_key": cfg.peopledatalabs_api_key,
        "whitepages_api_key": cfg.whitepages_api_key,
        "regrid_api_key": cfg.regrid_api_key,
        "attom_api_key": cfg.attom_api_key
    }

@router.post("/settings")
def update_settings(
    req: SettingsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update settings configurations."""
    cfg = RealEstateService.save_settings(db, req.model_dump(exclude_unset=True))
    return {"success": True}
