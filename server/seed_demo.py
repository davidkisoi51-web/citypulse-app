from app import create_app
from extensions import db
from models import User
from datetime import datetime, timedelta, timezone
import random
import traceback

app = create_app()

def safe_create_user(email, password, is_verified, verification_code=None, reset_code=None):
    """Creates user without using username - works with any User model"""
    user = User()
    user.email = email
    
    if hasattr(User, 'name'):
        user.name = email.split('@')[0].title()
    if hasattr(User, 'full_name'):
        user.full_name = email.split('@')[0].title()
    if hasattr(User, 'username'):
        user.username = email.split('@')[0]

    # Verification status 
    if hasattr(user, 'is_verified'):
        user.is_verified = is_verified
    if hasattr(user, 'is_active'):
        user.is_active = True
    if hasattr(user, 'email_verified'):
        user.email_verified = is_verified

    # Codes
    if verification_code and hasattr(user, 'verification_code'):
        user.verification_code = verification_code
    if hasattr(user, 'verification_expires'):
        user.verification_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    if reset_code and hasattr(user, 'reset_code'):
        user.reset_code = reset_code
    if hasattr(user, 'reset_code_expires'):
        user.reset_code_expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Password
    try:
        user.set_password(password)
    except:
        try:
            user.password = password
        except:
            from werkzeug.security import generate_password_hash
            user.password_hash = generate_password_hash(password)

    return user

with app.app_context():
    try:
        print("Seeding demo accounts...")
        
        for e in ["demo@citypulse.com","sandbox@citypulse.com","forgot@citypulse.com","gire@gmail.com"]:
            u = User.query.filter_by(email=e).first()
            if u:
                db.session.delete(u)
        db.session.commit()

        code_verify = str(random.randint(10000, 99999))
        code_reset = str(random.randint(10000, 99999))

        demo = safe_create_user("demo@citypulse.com", "Demo123!", True)
        sandbox = safe_create_user("sandbox@citypulse.com", "Sandbox123!", False, verification_code=code_verify)
        forgot = safe_create_user("forgot@citypulse.com", "Forgot123!", True, reset_code=code_reset)

        db.session.add_all([demo, sandbox, forgot])
        db.session.commit()

        print("\n" + "="*60)
        print("SUCCESS - DEMO ACCOUNTS SEEDED")
        print("="*60)
        print(f"1. LOGIN: demo@citypulse.com / Demo123! (verified)")
        print(f"2. VERIFY: sandbox@citypulse.com / Sandbox123!")
        print(f"   Code: {code_verify}  <-- use on /verify")
        print(f"3. FORGOT: forgot@citypulse.com / Forgot123!")
        print(f"   Reset Code: {code_reset}  <-- use on /reset-password")
        print("="*60 + "\n")

    except Exception as e:
        print(f"\nFAILED: {e}")
        traceback.print_exc()