from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    role = Column(String, default="trader") # admin, trader
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="user", cascade="all, delete-orphan")
    simulations = relationship("Simulation", back_populates="user", cascade="all, delete-orphan")
    broker_connections = relationship("BrokerConnection", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")

class Account(Base):
    __tablename__ = "accounts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    broker_type = Column(String, default="paper") # paper, alpaca, tradovate
    balance = Column(Float, nullable=False)
    starting_balance = Column(Float, nullable=False)
    leverage = Column(Float, default=1.0)
    status = Column(String, default="evaluation") # active, evaluation, passed, failed
    
    # Prop Firm Targets
    prop_firm_target = Column(Float, default=0.0) # 0 means no limit (e.g. personal account)
    prop_firm_max_drawdown = Column(Float, default=0.0)
    prop_firm_daily_drawdown = Column(Float, default=0.0)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="accounts")
    trades = relationship("Trade", back_populates="account", cascade="all, delete-orphan")
    risk_rules = relationship("RiskRules", uselist=False, back_populates="account", cascade="all, delete-orphan")

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    symbol = Column(String, nullable=False, index=True)
    side = Column(String, nullable=False) # BUY, SELL
    qty = Column(Float, nullable=False)
    entry_price = Column(Float, nullable=False)
    exit_price = Column(Float, nullable=True)
    entry_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    exit_time = Column(DateTime, nullable=True)
    pnl = Column(Float, default=0.0)
    commission = Column(Float, default=0.0)
    status = Column(String, default="OPEN") # OPEN, CLOSED
    signal_id = Column(Integer, ForeignKey("alert_logs.id"), nullable=True)
    
    account = relationship("Account", back_populates="trades")
    strategy = relationship("Strategy", back_populates="trades")
    alert_log = relationship("AlertLog")

class Strategy(Base):
    __tablename__ = "strategies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    pine_script = Column(Text, nullable=True)
    settings = Column(JSON, default=dict) # Key-value pairs for parameters
    version = Column(Integer, default=1)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="strategies")
    trades = relationship("Trade", back_populates="strategy")
    simulations = relationship("Simulation", back_populates="strategy")

class Simulation(Base):
    __tablename__ = "simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    strategy_id = Column(Integer, ForeignKey("strategies.id"), nullable=True)
    name = Column(String, nullable=False)
    parameters = Column(JSON, nullable=False) # inputs
    results = Column(JSON, nullable=False) # outputs
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="simulations")
    strategy = relationship("Strategy", back_populates="simulations")

class BrokerConnection(Base):
    __tablename__ = "broker_connections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    broker_name = Column(String, nullable=False) # alpaca, tradovate, paper
    api_key_encrypted = Column(String, nullable=True)
    secret_key_encrypted = Column(String, nullable=True)
    environment = Column(String, default="paper") # live, paper
    is_connected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="broker_connections")

class RiskRules(Base):
    __tablename__ = "risk_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False, unique=True)
    daily_drawdown_limit = Column(Float, default=0.0) # Cash value, 0 means no limit
    trailing_drawdown_limit = Column(Float, default=0.0) # Cash value
    max_contracts = Column(Integer, default=5)
    max_concurrent_trades = Column(Integer, default=3)
    cooldown_period_minutes = Column(Integer, default=5)
    last_trade_time = Column(DateTime, nullable=True)
    session_start_hour = Column(Integer, default=0) # 24h format (UTC)
    session_end_hour = Column(Integer, default=24)
    is_locked = Column(Boolean, default=False)
    
    account = relationship("Account", back_populates="risk_rules")

class AlertLog(Base):
    __tablename__ = "alert_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    payload = Column(JSON, nullable=False)
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    signature_valid = Column(Boolean, default=False)
    processed = Column(Boolean, default=False)
    error_message = Column(String, nullable=True)
    status = Column(String, default="PENDING") # SUCCESS, REJECTED, ERROR, PENDING

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False) # USER_LOGIN, STRATEGY_EDIT, RISK_LOCKED, TRADE_EXECUTED
    details = Column(Text, nullable=False)
    ip_address = Column(String, nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="audit_logs")

# === REAL ESTATE SYSTEM MODELS ===

class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    acreage = Column(Float, nullable=True)
    zoning = Column(String, nullable=True) # Agricultural, Residential, Commercial, etc.
    utility_access = Column(String, nullable=True) # Water, Power, None
    road_access = Column(String, nullable=True) # Paved, Dirt, No Access
    terrain = Column(String, nullable=True) # Flat, Sloped, Wooded
    flood_risk = Column(String, nullable=True) # Low, Medium, High
    source = Column(String, default="County Records") # County Records, FSBO, Tax Delinquent, etc.
    status = Column(String, default="Lead Found") # Lead Found, Analyzed, Owner Identified, Outreach Sent, Seller Responded, Offer Generated, Negotiation, Under Contract, Closed
    arv = Column(Float, default=0.0) # After Repair Value
    rehab_cost = Column(Float, default=0.0)
    wholesale_spread = Column(Float, default=0.0)
    resale_value = Column(Float, default=0.0)
    rental_potential = Column(Float, default=0.0)
    notes = Column(Text, nullable=True)
    scores = Column(JSON, nullable=True) # Profit Potential, Development Score, Seller Motivation, etc.
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    owners = relationship("Owner", back_populates="lead", cascade="all, delete-orphan")
    outreach_logs = relationship("Outreach", back_populates="lead", cascade="all, delete-orphan")
    negotiations = relationship("Negotiation", back_populates="lead", cascade="all, delete-orphan")
    offers = relationship("Offer", back_populates="lead", cascade="all, delete-orphan")

class DevelopmentZone(Base):
    __tablename__ = "development_zones"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    location = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    indicators = Column(JSON, nullable=True) # List of indicators (e.g. road expansion, utility permits)
    scores = Column(JSON, nullable=True) # Development Probability, Growth Momentum, Land Appreciation Potential, Investor Demand, Infrastructure Expansion
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Owner(Base):
    __tablename__ = "owners"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    name = Column(String, nullable=False)
    mailing_address = Column(String, nullable=True)
    llc_ownership = Column(String, nullable=True)
    business_records = Column(Text, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    source = Column(String, default="Public Records")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Upgraded OSINT columns
    confidence_score = Column(Integer, default=0) # 0 to 100
    source_count = Column(Integer, default=0)
    verification_timestamp = Column(DateTime, nullable=True)
    contact_classification = Column(String, default="No Contact Found") # Verified Email, Likely Email, Business Contact, Mailing Address Only, No Contact Found
    data_sources = Column(JSON, nullable=True) # e.g. ["County Assessor", "GIS Parcel Records"]
    intelligence_labels = Column(JSON, nullable=True) # e.g. ["LLC-Owned Parcel", "Absentee Owner"]
    
    lead = relationship("Lead", back_populates="owners")
    outreach_logs = relationship("Outreach", back_populates="owner", cascade="all, delete-orphan")

class Outreach(Base):
    __tablename__ = "outreach"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("owners.id"), nullable=False)
    channel = Column(String, default="email") # email, mail, phone
    subject = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    response_received = Column(Boolean, default=False)
    response_content = Column(Text, nullable=True)
    response_at = Column(DateTime, nullable=True)
    style = Column(String, default="cash_offer") # cash_offer, partnership_proposal, land_acquisition_inquiry, wholesale_offer, development_inquiry
    status = Column(String, default="sent") # sent, delivered, replied, bounced
    
    lead = relationship("Lead", back_populates="outreach_logs")
    owner = relationship("Owner", back_populates="outreach_logs")
    negotiations = relationship("Negotiation", back_populates="outreach", cascade="all, delete-orphan")

class Negotiation(Base):
    __tablename__ = "negotiations"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    outreach_id = Column(Integer, ForeignKey("outreach.id"), nullable=True)
    detected_motivation = Column(String, nullable=True) # High, Medium, Low
    detected_urgency = Column(String, nullable=True) # High, Medium, Low
    recommended_offer_range_min = Column(Float, default=0.0)
    recommended_offer_range_max = Column(Float, default=0.0)
    proposed_strategy = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    lead = relationship("Lead", back_populates="negotiations")
    outreach = relationship("Outreach", back_populates="negotiations")

class Offer(Base):
    __tablename__ = "offers"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    amount = Column(Float, nullable=False)
    offer_type = Column(String, default="cash") # cash, partnership, wholesale
    content = Column(Text, nullable=True)
    status = Column(String, default="Draft") # Draft, Sent, Accepted, Rejected
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    lead = relationship("Lead", back_populates="offers")

class AgentActivityLog(Base):
    __tablename__ = "agent_activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    agent_name = Column(String, nullable=False) # Scout Agent, Development Intelligence Agent, etc.
    log_level = Column(String, default="INFO") # INFO, WARNING, ERROR
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class RealEstateSettings(Base):
    __tablename__ = "real_estate_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String, default="Autonomous") # Manual, Assisted, Autonomous
    operator_email = Column(String, default="cyber4pf@gmail.com")
    resend_api_key = Column(String, default="")
    sendgrid_api_key = Column(String, default="")
    map_provider = Column(String, default="leaflet")
    is_active = Column(Boolean, default=True)
    last_run = Column(DateTime, nullable=True)
    acquisition_mode = Column(String, default="Fast Wholesale") # Fast Wholesale, Deep Value, Development Land, Rural Expansion, Long-Term Appreciation, High-Liquidity Flip
    confidence_threshold = Column(Integer, default=72)
    
    # Optional paid enrichment providers API keys
    batchdata_api_key = Column(String, default="")
    propstream_api_key = Column(String, default="")
    clearbit_api_key = Column(String, default="")
    peopledatalabs_api_key = Column(String, default="")
    whitepages_api_key = Column(String, default="")
    regrid_api_key = Column(String, default="")
    attom_api_key = Column(String, default="")

class Investor(Base):
    __tablename__ = "investors"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    location_preference = Column(String, nullable=True) # e.g. "Austin", "Dallas", "Phoenix"
    min_acreage = Column(Float, default=0.0)
    max_acreage = Column(Float, default=1000.0)
    zoning_preference = Column(String, nullable=True) # e.g. "Light Industrial (LI)", "Residential", "Commercial"
    development_interest = Column(String, default="Warehouse/Logistics") # Logistics, Residential subdivision, Retail
    investment_history = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class InternalListing(Base):
    __tablename__ = "internal_listings"
    
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False)
    parcel_summary = Column(Text, nullable=False)
    acreage = Column(Float, nullable=False)
    zoning = Column(String, nullable=False)
    estimated_roi = Column(Float, default=0.0) # ROI percentage
    development_potential = Column(String, nullable=True) # High, Medium, Low
    acquisition_score = Column(Integer, default=0)
    suggested_resale_value = Column(Float, default=0.0)
    investor_target_type = Column(String, default="Institutional Builder") # Institutional Builder, Land Flipper, Speculative Fund
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    lead = relationship("Lead")

class BuyerMatch(Base):
    __tablename__ = "buyer_matches"
    
    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("internal_listings.id"), nullable=False)
    buyer_id = Column(Integer, ForeignKey("investors.id"), nullable=False)
    match_score = Column(Integer, default=0)
    matched_criteria = Column(JSON, nullable=True) # e.g. ["location", "zoning"]
    outreach_status = Column(String, default="Queued") # Queued, Sent, Responded
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    listing = relationship("InternalListing")
    buyer = relationship("Investor")
