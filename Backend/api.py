import os 
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Header
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from Chatbot import ChatbotAgent
from Image_Generator import ImageGeneratorAgent
from firebase_admin import credentials, auth, firestore
import firebase_admin
import requests
from typing import Optional, List, Dict
from datetime import datetime
import uuid

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

try:
    chatbot_agent = ChatbotAgent(openai_api_key)
    image_generator_agent = ImageGeneratorAgent(openai_api_key)
    print("Agents initialized successfully")
except Exception as e:
    print(f"Failed to initialize agents: {str(e)}")
    raise

if not firebase_admin._apps:
    cred=credentials.Certificate("tolkien-rag-firebase-adminsdk-fbsvc-fc1481ed77.json")
    firebase_admin.initialize_app(cred)
    print("Firebase initialized successfully")

db = firestore.client()

class SignupRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UpdateSessionRequest(BaseModel):
    messages: List[Dict]

# Auth middleware
async def verify_token(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    
    token = authorization.split(" ")[1]
    try:
        decoded_token = auth.verify_id_token(token)
        print(f"Decoded token: {decoded_token}")
        return decoded_token['uid']
    except Exception as e:
        print(f"Token verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")

def save_message_to_firestore(user_id: str, session_id: str, message_data: Dict):
    """Firestore'a mesaj kaydet"""
    try:
        timestamp = datetime.now().isoformat()
        
        doc_data = {
            'timestamp': timestamp,
            'content': message_data.get('content', ''),
            'image': message_data.get('image', ''),
            'type': message_data.get('type', 'user'),
        }
        
        # Mesajı kaydet
        db.collection('users').document(user_id).collection('sessions').document(session_id).collection('messages').add(doc_data)
        
        # Preview'ı sadece user mesajı için güncelle (bot için dokunma)
        preview_update = {}
        if message_data.get('type') == 'user' and message_data.get('content'):
            preview_update['preview'] = message_data['content'][:100]
        
        # Session'ı güncelle
        session_doc_ref = db.collection('users').document(user_id).collection('sessions').document(session_id)
        session_doc_ref.set({
            'last_message_time': timestamp,
            'updated_at': timestamp,
            **preview_update  # Sadece user için ekle
        }, merge=True)
        
        return True
    except Exception as e:
        print(f"Firestore save error: {str(e)}")
        return False

@app.post("/signup")
def signup(data: SignupRequest):
    try:
        user = auth.create_user(
            email=data.email,
            password=data.password,
            display_name=data.username
        )
        return {"message": "User created successfully", "uid": user.uid}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@app.post("/login")
def login(data: LoginRequest):
    try:
        url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyBChsCVFY6A897fCiVoWke0HXX4xC4MxU8"
        payload = {
            "email": data.email,
            "password": data.password,
            "returnSecureToken": True
        }
        r = requests.post(url, json=payload)
        result = r.json()

        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"]["message"])

        return {
            "message": "Login successful",
            "idToken": result["idToken"],
            "refreshToken": result["refreshToken"],
            "expiresIn": result["expiresIn"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/ask/{query}")
def ask_tolkien(query: str, session_id: Optional[str] = None, user_id: str = Depends(verify_token)):
    try:
        # Eğer session_id verilmemişse yeni bir tane oluştur
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Kullanıcı mesajını kaydet
        save_message_to_firestore(user_id, session_id, {
            'content': query,
            'type': 'user'
        })
        
        # Bot cevabını al
        response = chatbot_agent.run(query)
        image_response = image_generator_agent.run(response)
        
        # Bot mesajını kaydet
        save_message_to_firestore(user_id, session_id, {
            'content': response,
            'image': image_response["image_url"],
            'type': 'bot'
        })
        
        return {
            "text": response, 
            "image": image_response["image_url"],
            "session_id": session_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions")
def get_chat_sessions(user_id: str = Depends(verify_token)):
    """Kullanıcının tüm sohbet oturumlarını getir"""
    try:
        sessions_ref = db.collection('users').document(user_id).collection('sessions')
        sessions = sessions_ref.order_by('updated_at', direction=firestore.Query.DESCENDING).stream()
        
        chat_sessions = []
        
        for session_doc in sessions:
            session_data = session_doc.to_dict()
            session_id = session_doc.id
            
            # Mesaj sayısını al
            messages_ref = sessions_ref.document(session_id).collection('messages')
            messages_count = len(list(messages_ref.stream()))
            
            if messages_count > 0:  # Sadece mesajı olan sessionları göster
                # Preview'ı güvenli şekilde al (None olursa fallback)
                preview = session_data.get('preview')
                if preview is None:
                    preview = 'New Chat'
                
                chat_sessions.append({
                    'session_id': session_id,
                    'preview': preview[:50],
                    'last_message_time': session_data.get('last_message_time', ''),
                    'message_count': messages_count,
                    'created_at': session_data.get('created_at', '')
                })
                
        return {"sessions": chat_sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sessions/new")
def create_new_session(user_id: str = Depends(verify_token)):
    """Yeni sohbet oturumu oluştur"""
    try:
        session_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        # Boş session oluştur
        session_doc_ref = db.collection('users').document(user_id).collection('sessions').document(session_id)
        session_doc_ref.set({
            'created_at': timestamp,
            'updated_at': timestamp,
            'preview': 'New Chat'
        })
        
        return {"session_id": session_id, "message": "New session created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/sessions/{session_id}")
def delete_session(session_id: str, user_id: str = Depends(verify_token)):
    """Sohbet oturumunu sil"""
    try:
        # Önce tüm mesajları sil
        messages_ref = db.collection('users').document(user_id).collection('sessions').document(session_id).collection('messages')
        messages = messages_ref.stream()
        
        batch = db.batch()
        for msg in messages:
            batch.delete(msg.reference)
        
        # Session'ı sil
        session_ref = db.collection('users').document(user_id).collection('sessions').document(session_id)
        batch.delete(session_ref)
        
        batch.commit()
        
        return {"message": "Session deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/sessions/{session_id}/messages")
def get_session_messages(session_id: str, user_id: str = Depends(verify_token)):
    """Belirli bir sohbet oturumunun mesajlarını getir"""
    try:
        messages_ref = db.collection('users').document(user_id).collection('sessions').document(session_id).collection('messages')
        messages = messages_ref.order_by('timestamp', direction=firestore.Query.ASCENDING).stream()
        
        session_messages = []
        for msg_doc in messages:
            msg_data = msg_doc.to_dict()
            session_messages.append({
                'type': msg_data.get('type', 'user'),
                'content': msg_data.get('content', ''),
                'image': msg_data.get('image', ''),
                'timestamp': msg_data.get('timestamp', '')
            })
            
        return {"messages": session_messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/sessions/{session_id}")
def update_session(session_id: str, data: UpdateSessionRequest, user_id: str = Depends(verify_token)):
    """Sohbet oturumunu güncelle"""
    try:
        timestamp = datetime.now().isoformat()
        
        # Session'ı güncelle
        session_doc_ref = db.collection('users').document(user_id).collection('sessions').document(session_id)
        
        # Preview'ı ilk kullanıcı mesajından al
        preview = "New Chat"
        for msg in data.messages:
            if msg.get('type') == 'user' and msg.get('content'):
                preview = msg['content'][:50]
                break
        
        session_doc_ref.set({
            'updated_at': timestamp,
            'preview': preview
        }, merge=True)
        
        return {"message": "Session updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
