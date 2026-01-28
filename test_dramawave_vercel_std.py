import urllib.request
import urllib.error
import json
import sys

BASE_URL = "https://dramabox-api-test.vercel.app/api/dramawave"
HEADERS = {"User-Agent": "Mozilla/5.0"}

def test_endpoint(name, url, method="GET", data=None):
    print(f"Testing {name} ({method} {url})...")
    try:
        req = urllib.request.Request(url, headers=HEADERS, method=method)
        if data:
            json_data = json.dumps(data).encode('utf-8')
            req.add_header('Content-Type', 'application/json')
            req.data = json_data
            
        with urllib.request.urlopen(req, timeout=15) as response:
            status_code = response.getcode()
            print(f"  Status: {status_code}")
            
            if status_code == 200:
                try:
                    content = response.read().decode('utf-8')
                    resp_data = json.loads(content)
                    success = resp_data.get("success", False)
                    items = resp_data.get("data", [])
                    
                    if isinstance(items, dict) and "items" in items:
                        items = items["items"]
                    elif isinstance(items, dict):
                        items = [items] 
                    
                    count = len(items) if isinstance(items, list) else (1 if items else 0)
                    print(f"  Success: {success}")
                    print(f"  Data Count: {count}")
                    return resp_data
                except Exception as e:
                    print(f"  Failed to parse JSON: {e}")
                    return None
            else:
                print(f"  Error Status: {status_code}")
                return None
    except urllib.error.HTTPError as e:
        print(f"  HTTP Error: {e.code} - {e.reason}")
        return None
    except Exception as e:
        print(f"  Exception: {str(e)}")
        return None

# 1. Test ForYou (to get IDs)
print("\n--- 1. Testing Discovery ---")
foryou_data = test_endpoint("For You", f"{BASE_URL}/foryou")
series_id = None
episode_id = None

if foryou_data and foryou_data.get("data"):
    items = foryou_data["data"]
    if items:
        first_item = items[0]
        # Use key or id
        series_id = first_item.get("key") or first_item.get("id")
        print(f"  Got Series ID: {series_id}")
        
        if first_item.get("currentEpisode"):
            episode_id = first_item["currentEpisode"].get("id")
            print(f"  Got Episode ID: {episode_id}")

# 2. Test Home
test_endpoint("Home", f"{BASE_URL}/home")

# 3. Test Trending
test_endpoint("Trending", f"{BASE_URL}/trending")

# 4. Test Ranking
test_endpoint("Ranking", f"{BASE_URL}/ranking")

# 5. Test Search
print("\n--- 2. Testing Search ---")
test_endpoint("Search 'boss'", f"{BASE_URL}/search?q=boss")

# 6. Test Detail
print("\n--- 3. Testing Detail ---")
if series_id:
    test_endpoint("Detail", f"{BASE_URL}/detail/{series_id}")
else:
    print("  Skipping Detail (No Series ID found)")

# 7. Test Stream
print("\n--- 4. Testing Stream ---")
if episode_id:
    stream_data = test_endpoint("Stream", f"{BASE_URL}/stream/{episode_id}")
    if stream_data and stream_data.get("data"):
        print(f"  Stream URL: {stream_data['data'].get('videoUrl', 'N/A')[:60]}...")
else:
    print("  Skipping Stream (No Episode ID found)")

# 8. Test Login
print("\n--- 5. Testing Auth ---")
test_endpoint("Login", f"{BASE_URL}/login", method="POST")

