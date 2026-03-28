import os
import re

api_dir = 'c:/HACKATHON_PROJECTS/DYP/flowstate-os/backend/app/api/v1'

for filename in os.listdir(api_dir):
    if not filename.endswith('.py'):
        continue
    filepath = os.path.join(api_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # ensure import uuid
    if 'import uuid' not in content:
        content = 'import uuid\n' + content
    
    # fix session_id == session_id
    content = re.sub(r'(\w+)\.id == session_id', r'\1.id == uuid.UUID(session_id)', content)
    content = re.sub(r'(\w+)\.session_id == session_id', r'\1.session_id == uuid.UUID(session_id)', content)
    
    # fix item_id string params in specific routes
    content = re.sub(r'(\w+)\.id == item_id', r'\1.id == uuid.UUID(item_id)', content)
    content = re.sub(r'(\w+)\.id == note_id', r'\1.id == uuid.UUID(note_id)', content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
print("done patching UUIDs in api/v1")
