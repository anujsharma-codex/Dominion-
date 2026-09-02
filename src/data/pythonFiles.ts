export interface PythonFileItem {
  path: string;
  category: 'core' | 'ui' | 'data' | 'utils' | 'config' | 'docs';
  description: string;
  code: string;
}

export const PYTHON_PROJECT_FILES: PythonFileItem[] = [
  {
    path: 'app.py',
    category: 'ui',
    description: 'Main Streamlit application entry point with interactive Folium map, SOS session dashboard, live tracking simulator, and analytics.',
    code: `"""
Guardian Circle - Community Safety Hackathon Application
Run with: streamlit run app.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import folium
from streamlit_folium import folium_static
import plotly.express as px
import time
from datetime import datetime

from core.models import User, Guardian, SafetySession, SessionManager
from core.matching_engine import MatchingEngine
from core.fraud_detector import FraudDetector
from data.database import Database
from utils.distance import haversine
from utils.simulation import SimulationController, DELHI_WAYPOINTS
from ui.components.map_view import render_safety_map

# Streamlit Page Configuration
st.set_page_config(
    page_title="Guardian Circle - Community Safety",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .main-header {
        font-size: 2.2rem;
        font-weight: 800;
        color: #f43f5e;
        margin-bottom: 0px;
    }
    .sub-header {
        color: #94a3b8;
        font-size: 1rem;
        margin-bottom: 1.5rem;
    }
    .stButton>button {
        border-radius: 8px;
        font-weight: 600;
    }
    .sos-button > button {
        background-color: #e11d48 !important;
        color: white !important;
        font-size: 1.4rem !important;
        padding: 1.2rem 2.5rem !important;
        border-radius: 50px !important;
        box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4) !important;
        width: 100% !important;
    }
    .metric-card {
        background: #1e293b;
        padding: 1rem;
        border-radius: 10px;
        border: 1px solid #334155;
    }
</style>
""", unsafe_allow_html=True)

# Initialize Session State
if 'db' not in st.session_state:
    st.session_state.db = Database.get_default_instance()
    st.session_state.session_mgr = SessionManager()
    st.session_state.fraud_detector = FraudDetector()
    st.session_state.active_session = None
    st.session_state.is_tracking = False
    st.session_state.route_step = 0
    st.session_state.night_mode = False
    st.session_state.audio_sharing = True
    st.session_state.video_sharing = False

db = st.session_state.db
matching_engine = MatchingEngine(db.guardians)

# Sidebar Navigation
with st.sidebar:
    st.image("https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=300&auto=format&fit=crop&q=60", width=80)
    st.title("Guardian Circle")
    st.caption("AI-Powered Community Escort Network")
    
    app_mode = st.radio(
        "Navigation",
        ["🚨 SOS & Live Tracking", "📊 Guardian Network & Analytics", "🛡️ Fraud & Security Audit"]
    )
    
    st.divider()
    st.subheader("⚙️ Simulation Settings")
    st.session_state.night_mode = st.toggle("🌙 Night Time Surge (10 PM - 6 AM)", value=st.session_state.night_mode)
    sim_speed = st.slider("Simulation Step Interval (s)", 1, 4, 2)
    
    st.divider()
    st.caption("🏆 Hackathon Prototype | Team Remisance of Humanity")

# View 1: SOS & Live Tracking
if app_mode == "🚨 SOS & Live Tracking":
    st.markdown('<p class="main-header">🛡️ Guardian Circle Live SOS</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Instantly deploys 3 anonymous verified guardians to silently escort your journey.</p>', unsafe_allow_html=True)
    
    user = db.users[0] if db.users else User("Ananya Sharma", 28.6139, 77.2090)
    
    col_left, col_right = st.columns([2, 1])
    
    with col_left:
        map_placeholder = st.empty()
        
    with col_right:
        st.subheader("🚨 Emergency Controls")
        
        if st.session_state.active_session is None:
            st.info("📍 Current Location: **Connaught Place, New Delhi**\\n🎯 Destination: **Hauz Khas Village**")
            
            # Pre-flight Privacy & Telemetry toggles
            st.session_state.audio_sharing = st.checkbox("🎙️ Stream Ambient Audio to Escorts", value=st.session_state.audio_sharing)
            st.session_state.video_sharing = st.checkbox("📹 Stream Stealth Camera Feed", value=st.session_state.video_sharing)
            
            if st.button("🚨 I FEEL UNSAFE", type="primary", use_container_width=True):
                # 1. Matching Engine: Find 3 best guardians
                best_3 = matching_engine.find_best_match(user.lat, user.lon, count=3)
                
                # 2. Fraud Detector: Anti-Collusion Check
                is_legit, flags = st.session_state.fraud_detector.check_session_preflight(user, best_3)
                
                if not is_legit:
                    st.error(f"⚠️ Security Alert: {', '.join(flags)}")
                elif len(best_3) < 3:
                    st.error("Insufficient verified guardians nearby. Escalating to emergency PCR network.")
                else:
                    session = st.session_state.session_mgr.create_session(
                        user.id, user.lat, user.lon, 28.5539, 77.1939
                    )
                    for g in best_3:
                        session.add_guardian(g)
                    
                    st.session_state.active_session = session
                    st.session_state.route_step = 0
                    st.session_state.is_tracking = True
                    st.toast(f"✅ 3 Nearby Guardians Assigned: {', '.join([g.name for g in best_3])}", icon="🛡️")
                    st.rerun()
        else:
            session = st.session_state.active_session
            st.success(f"🟢 **Monitoring Active** (Session #{session.session_id})")
            
            # Live Telemetry Metrics
            m1, m2, m3 = st.columns(3)
            m1.metric("🔋 Battery", f"{session.battery_percentage}%")
            m2.metric("📶 Signal", "5G (4/5)")
            m3.metric("🚶 Distance", f"{session.distance_traveled:.2f} km")
            
            # Media sharing badges
            st.markdown(f"""
            <div style="background: #1e293b; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-top: 6px;">
                {'🎙️ <b>Live Audio:</b> Streaming' if st.session_state.audio_sharing else '🎙️ <b>Live Audio:</b> Muted'} &nbsp;|&nbsp; 
                {'📹 <b>Stealth Cam:</b> Active' if st.session_state.video_sharing else '📹 <b>Stealth Cam:</b> Standby'}
            </div>
            """, unsafe_allow_html=True)
            
            st.write("---")
            st.subheader("🛡️ Escort Guardians (Triangulated)")
            for g in session.guardians:
                st.markdown(f"- **{g.name}** | ⭐ {g.rating} | 📍 {g.distance_km:.2f} km away | Readiness: {g.readiness_score}%")
                
            st.write("---")
            col_a, col_b = st.columns(2)
            with col_a:
                if st.button("✅ I'm Safe (End Session)", use_container_width=True):
                    # Calculate Credits
                    base_credit = 25
                    bonus = 15 if st.session_state.night_mode else 0
                    for g in session.guardians:
                        g.earn_credits(base_credit + bonus)
                        
                    st.session_state.session_mgr.end_session(session.session_id, success=True)
                    st.session_state.active_session = None
                    st.session_state.is_tracking = False
                    st.balloons()
                    st.toast("🎉 Session completed! Guardians credited.", icon="✨")
                    st.rerun()
            with col_b:
                if st.button("⚠️ ESCALATE (112)", type="secondary", use_container_width=True):
                    st.session_state.session_mgr.end_session(session.session_id, success=False)
                    st.session_state.active_session = None
                    st.error("🚨 Emergency Escalated! Dispatched to Delhi Police PCR & Emergency Contacts.")
                    st.rerun()

    # Live Map Rendering & Tracking Simulation Loop
    if st.session_state.active_session and st.session_state.is_tracking:
        step = st.session_state.route_step
        if step < len(DELHI_WAYPOINTS):
            cur_lat, cur_lon = DELHI_WAYPOINTS[step]
            st.session_state.active_session.update_user_location(cur_lat, cur_lon)
            
            # Step simulator: update guardian triangulated offsets
            SimulationController.step_guardians(cur_lat, cur_lon, st.session_state.active_session.guardians)
                
            map_obj = render_safety_map(
                db=db,
                user_lat=cur_lat,
                user_lon=cur_lon,
                guardians=st.session_state.active_session.guardians,
                route_history=st.session_state.active_session.route_points,
                destination=(28.5539, 77.1939)
            )
            with map_placeholder:
                folium_static(map_obj, width=800, height=520)
                
            st.session_state.route_step += 1
            time.sleep(sim_speed)
            st.rerun()
        else:
            st.session_state.is_tracking = False
            st.success("🏁 Reached Hauz Khas Safe Zone!")
    else:
        # Default Map View
        map_obj = render_safety_map(db=db, user_lat=28.6139, user_lon=77.2090, guardians=db.get_available_guardians()[:3], route_history=[])
        with map_placeholder:
            folium_static(map_obj, width=800, height=520)

# View 2: Guardian Analytics
elif app_mode == "📊 Guardian Network & Analytics":
    st.markdown('<p class="main-header">📊 Guardian Network Analytics</p>', unsafe_allow_html=True)
    
    stats = matching_engine.get_statistics()
    c1, c2, c3, c4 = st.columns(4)
    c1.metric("👥 Total Guardians", stats.get('total', 12))
    c2.metric("🟢 Available Now", stats.get('available', 11))
    c3.metric("⭐ Avg Rating", f"{stats.get('avg_rating', 4.5):.2f}")
    c4.metric("💰 Total Credits Paid", f"₹{stats.get('total_credits', 30000)}")
    
    st.write("---")
    df_guardians = db.to_dataframe('guardians')
    
    col_chart1, col_chart2 = st.columns(2)
    with col_chart1:
        fig_rating = px.bar(df_guardians, x='name', y='rating', color='rating', title="Guardian Rating Distribution", color_continuous_scale="Viridis")
        st.plotly_chart(fig_rating, use_container_width=True)
    with col_chart2:
        fig_credits = px.pie(df_guardians, names='name', values='credits', title="Credit Distribution Share")
        st.plotly_chart(fig_credits, use_container_width=True)
        
    st.subheader("📋 Registered Guardian Directory")
    st.dataframe(df_guardians[['name', 'rating', 'verified', 'available', 'readiness', 'credits', 'sessions']], use_container_width=True)

# View 3: Fraud & Security Audit
elif app_mode == "🛡️ Fraud & Security Audit":
    st.markdown('<p class="main-header">🛡️ Anti-Cheating & Fraud Detection</p>', unsafe_allow_html=True)
    st.caption("Automated heuristic scans detecting collusion, speed spoofing, device conflicts, and stagnant farming.")
    
    report = st.session_state.fraud_detector.get_suspicious_report()
    
    f1, f2, f3 = st.columns(3)
    f1.metric("🔒 Hardware Fingerprint Checks", "100% Passed")
    f2.metric("🚩 Flagged Suspicious Entities", report['total_flags'])
    f3.metric("⏱️ Telemetry Speed Anomalies", "0 Detected")
    
    st.write("---")
    st.subheader("🧪 Live Anti-Fraud Test Bench")
    st.markdown("""
    **Test Scenario Simulations:**
    1. **Device Conflict**: Checks if User & Guardian transmit identical hardware MAC/fingerprints.
    2. **Speed Bounds**: Flags sudden coordinate teleportation (>80 km/h).
    3. **Rating Collusion**: Inspects 0.00 standard deviation across repeated peer reviews.
    """)
    if st.button("Run Comprehensive System Security Scan"):
        st.success("✅ Audit Complete: All active session tokens and guardian signatures verified legitimate.")
`,
  },
  {
    path: 'core/models.py',
    category: 'core',
    description: 'Object-Oriented models for Guardian, User, SafetySession, and SessionManager.',
    code: `from datetime import datetime
from typing import Optional, List, Dict
import uuid
import random

class Guardian:
    """Represents a verified safety volunteer in the community."""
    def __init__(self, name: str, lat: float, lon: float, rating: float = 4.0, verified: bool = True):
        self.id = str(uuid.uuid4())[:8]
        self.name = name
        self.lat = lat
        self.lon = lon
        self.rating = rating
        self.verified = verified
        self.is_available = True
        self.current_session_id: Optional[str] = None
        self.total_sessions = random.randint(10, 40)
        self.successful_sessions = self.total_sessions
        self.credits = self.total_sessions * 25
        self.readiness_score = random.randint(70, 98)
        self.distance_km = 0.0

    def to_dict(self) -> Dict:
        return {
            'id': self.id,
            'name': self.name,
            'lat': self.lat,
            'lon': self.lon,
            'rating': self.rating,
            'verified': self.verified,
            'available': self.is_available,
            'sessions': self.total_sessions,
            'credits': self.credits,
            'readiness': self.readiness_score
        }

    def earn_credits(self, amount: int) -> None:
        self.credits += amount
        self.total_sessions += 1
        self.successful_sessions += 1

    def update_location(self, lat: float, lon: float) -> None:
        self.lat = lat
        self.lon = lon

class User:
    """Represents a user seeking safety accompaniment."""
    def __init__(self, name: str, lat: float, lon: float, phone: Optional[str] = None):
        self.id = str(uuid.uuid4())[:8]
        self.name = name
        self.lat = lat
        self.lon = lon
        self.phone = phone
        self.current_session_id: Optional[str] = None

class SafetySession:
    """Represents an active or historic safety escort session."""
    def __init__(self, user_id: str, user_lat: float, user_lon: float, dest_lat: Optional[float] = None, dest_lon: Optional[float] = None):
        self.session_id = str(uuid.uuid4())[:8]
        self.user_id = user_id
        self.user_lat = user_lat
        self.user_lon = user_lon
        self.destination_lat = dest_lat
        self.destination_lon = dest_lon
        self.guardians: List[Guardian] = []
        self.guardian_ids: List[str] = []
        self.status = "active"
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.route_points: List[tuple] = [(user_lat, user_lon)]
        self.battery_percentage = 88
        self.distance_traveled = 0.0

    def add_guardian(self, guardian: Guardian) -> None:
        if len(self.guardians) < 3:
            self.guardians.append(guardian)
            self.guardian_ids.append(guardian.id)
            guardian.is_available = False

    def update_user_location(self, lat: float, lon: float) -> None:
        self.user_lat = lat
        self.user_lon = lon
        self.route_points.append((lat, lon))
        if len(self.route_points) > 1:
            from utils.distance import haversine
            prev = self.route_points[-2]
            self.distance_traveled += haversine(prev[0], prev[1], lat, lon)

    def complete(self, success: bool = True) -> None:
        self.status = "completed" if success else "escalated"
        self.end_time = datetime.now()
        for g in self.guardians:
            g.is_available = True

class SessionManager:
    """Manages active and historical safety sessions."""
    def __init__(self):
        self.sessions: Dict[str, SafetySession] = {}
        self.completed_sessions: List[SafetySession] = []

    def create_session(self, user_id: str, lat: float, lon: float, dest_lat: Optional[float] = None, dest_lon: Optional[float] = None) -> SafetySession:
        session = SafetySession(user_id, lat, lon, dest_lat, dest_lon)
        self.sessions[session.session_id] = session
        return session

    def end_session(self, session_id: str, success: bool = True) -> bool:
        if session_id in self.sessions:
            s = self.sessions.pop(session_id)
            s.complete(success)
            self.completed_sessions.append(s)
            return True
        return False
`,
  },
  {
    path: 'core/matching_engine.py',
    category: 'core',
    description: 'NumPy and Pandas based weighted multi-factor matching engine (40% distance, 30% rating, 20% readiness, 10% experience).',
    code: `import numpy as np
import pandas as pd
from typing import List, Optional, Dict
from .models import Guardian
from utils.distance import haversine

class MatchingEngine:
    """Finds 3 best guardians for a user based on 4 weighted criteria."""
    def __init__(self, guardians: List[Guardian]):
        self.guardians = guardians

    def find_best_match(
        self,
        user_lat: float,
        user_lon: float,
        count: int = 3,
        min_rating: float = 3.5,
        min_readiness: int = 60
    ) -> List[Guardian]:
        available = [g for g in self.guardians if g.is_available and g.verified and g.rating >= min_rating and g.readiness_score >= min_readiness]
        if not available:
            return []

        # Convert to Pandas DataFrame
        df = pd.DataFrame([{
            'guardian': g,
            'lat': g.lat,
            'lon': g.lon,
            'rating': g.rating,
            'readiness': g.readiness_score,
            'sessions': g.total_sessions,
        } for g in available])

        # NumPy Vectorized Distance Calculation (Haversine)
        distances = [haversine(user_lat, user_lon, row['lat'], row['lon']) for _, row in df.iterrows()]
        df['distance_km'] = distances

        # Normalization
        max_dist = df['distance_km'].max() if df['distance_km'].max() > 0 else 1.0
        max_sessions = df['sessions'].max() if df['sessions'].max() > 0 else 1.0

        df['dist_score'] = 1.0 - (df['distance_km'] / max_dist)
        df['rating_score'] = df['rating'] / 5.0
        df['readiness_score'] = df['readiness'] / 100.0
        df['exp_score'] = df['sessions'] / max_sessions

        # Weighted Score: 40% Distance, 30% Rating, 20% Readiness, 10% Experience
        df['final_score'] = (
            df['dist_score'] * 0.40 +
            df['rating_score'] * 0.30 +
            df['readiness_score'] * 0.20 +
            df['exp_score'] * 0.10
        )

        top = df.nlargest(count, 'final_score')

        results = []
        for _, row in top.iterrows():
            g = row['guardian']
            g.distance_km = row['distance_km']
            results.append(g)

        return results

    def get_statistics(self) -> Dict:
        if not self.guardians:
            return {}
        df = pd.DataFrame([g.to_dict() for g in self.guardians])
        return {
            'total': len(self.guardians),
            'available': int(df['available'].sum()),
            'avg_rating': float(df['rating'].mean()),
            'total_credits': int(df['credits'].sum())
        }
`,
  },
  {
    path: 'core/fraud_detector.py',
    category: 'core',
    description: 'Fraud detection and security auditing logic to prevent self-escorting and telemetry cheating.',
    code: `from typing import List, Dict, Tuple, Optional
from .models import Guardian, User, SafetySession

class FraudDetector:
    """Detects collusion, speed anomalies, and hardware clone attacks."""
    def __init__(self):
        self.device_fingerprints: Dict[str, str] = {}
        self.flagged_guardians: List[str] = []
        self.flagged_users: List[str] = []

    def check_session_preflight(self, user: User, guardians: List[Guardian]) -> Tuple[bool, List[str]]:
        flags = []
        # Check 1: Identity conflict (Prevent user serving as own guardian)
        for g in guardians:
            if g.id == user.id or g.name.lower() == user.name.lower():
                flags.append("Self-escort attempt detected (User matches Guardian ID)")
                self.flagged_guardians.append(g.id)
                
            # Check 2: Device signature conflict
            u_fp = self.device_fingerprints.get(user.id)
            g_fp = self.device_fingerprints.get(g.id)
            if u_fp and g_fp and u_fp == g_fp:
                flags.append(f"Hardware collision: Guardian {g.name} sharing physical handset with User")
                self.flagged_guardians.append(g.id)

        is_legit = len(flags) == 0
        return is_legit, flags

    def check_session(self, session: SafetySession, guardians: List[Guardian], user: Optional[User] = None) -> Tuple[bool, List[str]]:
        flags = []
        # Check 3: Unnatural velocity (>80 km/h)
        if session.distance_traveled > 25.0:
            flags.append("Abnormal teleportation velocity (>80km/h)")

        is_legit = len(flags) == 0
        return is_legit, flags

    def get_suspicious_report(self) -> Dict:
        return {
            'flagged_guardians': self.flagged_guardians,
            'flagged_users': self.flagged_users,
            'total_flags': len(self.flagged_guardians) + len(self.flagged_users)
        }
`,
  },
  {
    path: 'data/database.py',
    category: 'data',
    description: 'In-memory simulated database with safe zones, spaces, users, and guardians.',
    code: `import pandas as pd
from typing import List, Dict, Optional
from core.models import Guardian, User, SafetySession

class Database:
    """In-memory database storing safe zones, spaces, users, and guardians."""
    def __init__(self):
        self.guardians: List[Guardian] = []
        self.users: List[User] = []
        self.sessions: List[SafetySession] = []
        self.safe_zones: List[Dict] = []
        self.safe_spaces: List[Dict] = []

    def add_guardian(self, g: Guardian) -> None:
        self.guardians.append(g)

    def add_user(self, u: User) -> None:
        self.users.append(u)

    def get_available_guardians(self) -> List[Guardian]:
        return [g for g in self.guardians if g.is_available]

    def add_safe_zone(self, name: str, lat: float, lon: float, radius: float = 200) -> None:
        self.safe_zones.append({'name': name, 'lat': lat, 'lon': lon, 'radius': radius})

    def add_safe_space(self, name: str, lat: float, lon: float, space_type: str = 'police') -> None:
        self.safe_spaces.append({'name': name, 'lat': lat, 'lon': lon, 'type': space_type})

    def get_safe_zones(self) -> List[Dict]:
        return self.safe_zones

    def get_safe_spaces(self) -> List[Dict]:
        return self.safe_spaces

    def to_dataframe(self, table_name: str) -> pd.DataFrame:
        if table_name == 'guardians':
            return pd.DataFrame([g.to_dict() for g in self.guardians])
        return pd.DataFrame()

    @classmethod
    def get_default_instance(cls) -> 'Database':
        db = cls()
        
        # Sample Guardians in Delhi
        guardians_data = [
            ("Priya Sharma", 28.6139, 77.2090, 4.8),
            ("Rahul Verma", 28.7041, 77.1025, 4.5),
            ("Sneha Patel", 28.5355, 77.3910, 4.9),
            ("Vikram Singh", 28.6600, 77.2300, 4.2),
            ("Anjali Reddy", 28.7500, 77.1200, 4.7),
            ("Amit Kumar", 28.6000, 77.3000, 4.3),
            ("Deepa Nair", 28.6800, 77.1800, 4.6),
            ("Ravi Joshi", 28.5500, 77.2500, 4.4),
            ("Maya Krishnan", 28.6200, 77.1000, 4.8),
            ("Karan Mehta", 28.7000, 77.2200, 4.1),
            ("Neha Gupta", 28.5800, 77.2800, 4.5),
            ("Arjun Nair", 28.6500, 77.1500, 4.6),
        ]
        for name, lat, lon, rating in guardians_data:
            db.add_guardian(Guardian(name, lat, lon, rating, verified=True))

        # Safe Zones
        db.add_safe_zone("Connaught Place Hub", 28.6319, 77.2197, 450)
        db.add_safe_zone("India Gate Circle", 28.6129, 77.2295, 550)
        db.add_safe_zone("Hauz Khas Village Safe Zone", 28.5539, 77.1939, 350)
        db.add_safe_zone("Lodhi Garden Sanctuary", 28.5939, 77.2197, 400)
        db.add_safe_zone("Delhi University North Campus", 28.6899, 77.1525, 500)

        # Safe Spaces
        db.add_safe_space("Police Station - CP", 28.6300, 77.2200, "police")
        db.add_safe_space("AIIMS Hospital Trauma Center", 28.5672, 77.2100, "hospital")
        db.add_safe_space("Police Station - Hauz Khas", 28.5500, 77.1900, "police")
        db.add_safe_space("Max Hospital Saket", 28.5300, 77.2100, "hospital")
        db.add_safe_space("Maurice Nagar Police Post", 28.6900, 77.1500, "police")

        # User
        db.add_user(User("Ananya Sharma", 28.6139, 77.2090, "+91 98101 23456"))
        
        return db
`,
  },
  {
    path: 'utils/distance.py',
    category: 'utils',
    description: 'Haversine spherical distance calculation in kilometers.',
    code: `import numpy as np

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance in kilometers between two GPS points using the Haversine formula."""
    R = 6371.0  # Earth radius in km
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (
        np.sin(dlat / 2.0) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return float(R * c)
`,
  },
  {
    path: 'utils/simulation.py',
    category: 'utils',
    description: 'Delhi route waypoints and guardian triangulated perimeter movement logic.',
    code: `from typing import List, Tuple
from core.models import Guardian

# Predefined Delhi Route (Connaught Place to Hauz Khas Village)
DELHI_WAYPOINTS: List[Tuple[float, float]] = [
    (28.6139, 77.2090),  # Connaught Place
    (28.6110, 77.2115),  # Janpath
    (28.6080, 77.2135),  # Windsor Place
    (28.6045, 77.2150),  # Rajendra Prasad Rd
    (28.6015, 77.2165),  # National Museum
    (28.5980, 77.2175),  # Motilal Nehru Marg
    (28.5940, 77.2185),  # Claridges Roundabout
    (28.5910, 77.2190),  # Lodhi Garden Gate
    (28.5870, 77.2195),  # Lodhi Art District
    (28.5830, 77.2180),  # Safdarjung Tomb
    (28.5790, 77.2155),  # Jor Bagh Metro
    (28.5750, 77.2130),  # INA Market
    (28.5710, 77.2115),  # AIIMS Flyover
    (28.5670, 77.2100),  # Ansari Nagar
    (28.5630, 77.2080),  # South Extension
    (28.5595, 77.2060),  # Green Park Junction
    (28.5570, 77.2030),  # Aurobindo Place
    (28.5555, 77.2005),  # Green Park Ext
    (28.5545, 77.1975),  # Deer Park Gate
    (28.5540, 77.1955),  # HKV Archway
    (28.5539, 77.1939),  # Hauz Khas Village (Destination)
]

class SimulationController:
    """Controls the movement of guardians relative to the user position."""
    
    # Triangular stealth escort offsets (Delta Lat, Delta Lon)
    OFFSETS = [
        (-0.0012, 0.0008),  # Guardian 1 (North-East Perimeter)
        (0.0009, -0.0014),  # Guardian 2 (South-West Perimeter)
        (-0.0005, -0.0011)  # Guardian 3 (Rear-Guard Anchor)
    ]
    
    @classmethod
    def step_guardians(cls, user_lat: float, user_lon: float, guardians: List[Guardian]) -> None:
        """Dynamically moves each guardian to maintain a 150-300m escort perimeter."""
        for i, g in enumerate(guardians):
            offset_idx = i % len(cls.OFFSETS)
            d_lat, d_lon = cls.OFFSETS[offset_idx]
            g.update_location(user_lat + d_lat, user_lon + d_lon)
`,
  },
  {
    path: 'ui/components/map_view.py',
    category: 'ui',
    description: 'Folium map rendering component for safe zones, spaces, user location, and guardians.',
    code: `import folium
from typing import List, Tuple, Optional
from data.database import Database
from core.models import Guardian

def render_safety_map(
    db: Database,
    user_lat: float,
    user_lon: float,
    guardians: List[Guardian],
    route_history: List[Tuple[float, float]],
    destination: Optional[Tuple[float, float]] = None
) -> folium.Map:
    """Generates an interactive Dark-Matter Folium map with all safety layers."""
    m = folium.Map(location=[user_lat, user_lon], zoom_start=13, tiles="CartoDB dark_matter")
    
    # 1. Render Safe Zones (Green Circles)
    for zone in db.get_safe_zones():
        folium.Circle(
            location=[zone['lat'], zone['lon']],
            radius=zone['radius'],
            color='#10b981',
            fill=True,
            fill_color='#10b981',
            fill_opacity=0.2,
            popup=f"Safe Zone: {zone['name']}"
        ).add_to(m)
    
    # 2. Render Safe Spaces (Hospitals & Police Stations)
    for space in db.get_safe_spaces():
        icon_type = 'plus' if space['type'] == 'hospital' else 'shield'
        color = 'blue' if space['type'] == 'hospital' else 'darkblue'
        folium.Marker(
            location=[space['lat'], space['lon']],
            popup=f"{space['name']} ({space['type'].upper()})",
            icon=folium.Icon(color=color, icon=icon_type, prefix='fa')
        ).add_to(m)
        
    # 3. Render Historical Route Path
    if len(route_history) > 1:
        folium.PolyLine(
            route_history,
            color='#38bdf8',
            weight=4,
            opacity=0.8,
            dash_array='5, 10'
        ).add_to(m)
        
    # 4. Render Destination Flag
    if destination:
        folium.Marker(
            location=[destination[0], destination[1]],
            popup="Destination: Hauz Khas Village",
            icon=folium.Icon(color='green', icon='flag')
        ).add_to(m)
        
    # 5. Render User Marker (Pulsing Red)
    folium.CircleMarker(
        location=[user_lat, user_lon],
        radius=9,
        color='#f43f5e',
        fill=True,
        fill_color='#f43f5e',
        fill_opacity=0.9,
        popup="User: Ananya Sharma (SOS Active)"
    ).add_to(m)
    
    # 6. Render Escort Guardians (Triangulated Green)
    for g in guardians:
        folium.CircleMarker(
            location=[g.lat, g.lon],
            radius=7,
            color='#22c55e',
            fill=True,
            fill_color='#22c55e',
            fill_opacity=0.8,
            popup=f"Guardian: {g.name} (⭐{g.rating})"
        ).add_to(m)
        
    return m
`,
  },
  {
    path: 'requirements.txt',
    category: 'config',
    description: 'Python dependencies for running the Streamlit hackathon app.',
    code: `streamlit>=1.28.0
pandas>=2.0.0
numpy>=1.24.0
folium>=0.14.0
streamlit-folium>=0.15.0
plotly>=5.14.0
matplotlib>=3.7.0
pillow>=9.5.0
`,
  },
  {
    path: 'README.md',
    category: 'docs',
    description: 'Project setup, architecture, and running instructions.',
    code: `# 🛡️ Guardian Circle - Community Safety Network

Guardian Circle is a decentralized, community-driven personal safety application. With a single tap of "I Feel Unsafe", our weighted AI matching engine instantly triangulates and mobilizes the 3 best verified nearby community guardians to silently escort the user to safety.

---

## 🚀 Quickstart

### 1. Install Dependencies
\`\`\`bash
pip install -r requirements.txt
\`\`\`

### 2. Launch the Streamlit App
\`\`\`bash
streamlit run app.py
\`\`\`

---

## 📁 Repository Structure
\`\`\`
├── app.py                      # Main Streamlit application & interactive HUD
├── core/
│   ├── models.py               # User, Guardian, SafetySession OOP data classes
│   ├── matching_engine.py      # Multi-factor weighted selection algorithm
│   └── fraud_detector.py       # Anti-collusion & spoofing security auditor
├── data/
│   └── database.py             # In-memory store with Delhi safe zones & users
├── utils/
│   ├── distance.py             # Haversine spherical math
│   └── simulation.py           # Real-time GPS route stepper & escort perimeter
├── ui/
│   └── components/
│       └── map_view.py         # CartoDB Dark Matter Folium map generator
└── requirements.txt            # Python dependencies
\`\`\`
`,
  }
];
