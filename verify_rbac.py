import requests
import uuid

BASE_URL = "http://localhost:5000/api"

def register_user(name):
    email = f"{name}_{uuid.uuid4()}@example.com"
    username = f"{name}_{uuid.uuid4().hex[:8]}"
    password = "password123"
    response = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": email,
        "username": username,
        "name": name,
        "password": password
    })
    if response.status_code != 200:
        print(f"Failed to register {name}: {response.text}")
        return None
    return response.json()

def test_rbac():
    print("--- Testing RBAC ---")
    # 1. Register Admin and Member
    admin_data = register_user("AdminUser")
    member_data = register_user("MemberUser")
    
    if not admin_data or not member_data:
        return

    admin_token = admin_data["token"]
    member_token = member_data["token"]
    member_id = member_data["user"]["id"]

    # 2. Create Project (Admin)
    print("Creating Project...")
    project_res = requests.post(f"{BASE_URL}/projects", json={
        "title": "RBAC Test Project",
        "description": "Testing permissions",
        "techStack": ["Python"]
    }, headers={"Authorization": f"Bearer {admin_token}"})
    
    if project_res.status_code != 200:
        print(f"Failed to create project: {project_res.text}")
        return
    
    project = project_res.json()
    project_id = project["id"]
    print(f"Project created: {project_id}")
    
    # Verify creator role
    if project["roles"].get(admin_data["user"]["id"]) != "admin":
        print("FAIL: Creator is not admin")
    else:
        print("PASS: Creator is admin")

    # 3. Join Project (Member)
    print("Joining Project...")
    join_res = requests.post(f"{BASE_URL}/projects/{project_id}/join", headers={"Authorization": f"Bearer {member_token}"})
    if join_res.status_code != 200:
        print(f"Failed to join project: {join_res.text}")
    else:
        print("PASS: Joined project")

    # 4. Try to Add Task (Member) - Should Fail
    print("Member adding task (expect failure)...")
    task_res = requests.post(f"{BASE_URL}/projects/{project_id}/tasks", json={
        "title": "Unauthorized Task"
    }, headers={"Authorization": f"Bearer {member_token}"})
    
    if task_res.status_code == 403:
        print("PASS: Member cannot add task")
    else:
        print(f"FAIL: Member added task or unexpected error: {task_res.status_code}")

    # 5. Promote Member to Co-admin
    print("Promoting Member...")
    promote_res = requests.post(f"{BASE_URL}/projects/{project_id}/promote", json={
        "userId": member_id,
        "role": "co-admin"
    }, headers={"Authorization": f"Bearer {admin_token}"})
    
    if promote_res.status_code == 200:
        print("PASS: Member promoted")
    else:
        print(f"FAIL: Promotion failed: {promote_res.text}")

    # 6. Try to Add Task (Co-admin) - Should Succeed
    print("Co-admin adding task (expect success)...")
    task_res_2 = requests.post(f"{BASE_URL}/projects/{project_id}/tasks", json={
        "title": "Authorized Task"
    }, headers={"Authorization": f"Bearer {member_token}"})
    
    if task_res_2.status_code == 200:
        print("PASS: Co-admin added task")
    else:
        print(f"FAIL: Co-admin failed to add task: {task_res_2.text}")

def test_files_and_messages():
    print("\n--- Testing Files & Messages ---")
    # Setup
    admin_data = register_user("FileAdmin")
    member_data = register_user("FileMember")
    admin_token = admin_data["token"]
    member_token = member_data["token"]
    
    # Create Project
    project_res = requests.post(f"{BASE_URL}/projects", json={
        "title": "File Test Project",
        "description": "Testing files",
        "techStack": ["React"]
    }, headers={"Authorization": f"Bearer {admin_token}"})
    project_id = project_res.json()["id"]
    
    # Join Project
    requests.post(f"{BASE_URL}/projects/{project_id}/join", headers={"Authorization": f"Bearer {member_token}"})

    # 1. Upload File (Member)
    print("Uploading file...")
    files = {'file': ('test.txt', b'Hello World', 'text/plain')}
    upload_res = requests.post(f"{BASE_URL}/projects/{project_id}/files", files=files, headers={"Authorization": f"Bearer {member_token}"})
    
    if upload_res.status_code == 200:
        print("PASS: File uploaded")
        file_data = upload_res.json()
        if file_data["name"] == "test.txt":
            print("PASS: File metadata correct")
    else:
        print(f"FAIL: File upload failed: {upload_res.text}")

    # 2. Send Message
    print("Sending message...")
    msg_res = requests.post(f"{BASE_URL}/messages", json={
        "receiverId": admin_data["user"]["id"],
        "content": "Hello Admin!"
    }, headers={"Authorization": f"Bearer {member_token}"})
    
    if msg_res.status_code == 200:
        print("PASS: Message sent")
    else:
        print(f"FAIL: Message sending failed: {msg_res.text}")

if __name__ == "__main__":
    try:
        test_rbac()
        test_files_and_messages()
    except Exception as e:
        print(f"An error occurred: {e}")
