/**
 * NetShort Frida Hook Script
 * 
 * This script hooks the NetShort app's encryption/decryption layer
 * to extract plaintext request/response data.
 * 
 * Usage:
 *   frida -U -l frida-hook-netshort.js -f com.netshort.abroad
 * 
 * It sends decrypted data to a local server running on the host machine.
 * Start the NetShort API server first, then run this script.
 */

const API_SERVER = "http://YOUR_HOST_IP:3000"; // Change to your machine's IP

Java.perform(function () {
    console.log("\n=== NetShort Decryption Hook ===\n");

    // ============================================================
    // HOOK 1: OkHttp Interceptor - Capture decrypted request/response
    // ============================================================
    try {
        // NetShort uses OkHttp. Hook the Response.Builder to capture response bodies
        var ResponseBody = Java.use("okhttp3.ResponseBody");
        var BufferKt = Java.use("okio.BufferKt");
        var Buffer = Java.use("okio.Buffer");

        // Hook the JSON response body creation used by the API interceptor
        // The app decrypts the response body BEFORE passing it to Retrofit/Gson
        // We need to find the interceptor class that does the decryption

        // Based on capture-request.js analysis: com.startshorts.androidplayer.manager.api.base.o$a
        var ApiInterceptor = null;
        var interceptorClassNames = [
            "com.startshorts.androidplayer.manager.api.base.o",
            "com.startshorts.androidplayer.manager.api.base.n",
            "com.startshorts.androidplayer.manager.api.base.p",
            "com.startshorts.androidplayer.manager.api.base.m"
        ];

        for (var i = 0; i < interceptorClassNames.length; i++) {
            try {
                var cls = Java.use(interceptorClassNames[i]);
                // Check if it implements okhttp3.Interceptor
                if (cls.intercept) {
                    ApiInterceptor = cls;
                    console.log("[✓] Found API Interceptor: " + interceptorClassNames[i]);
                    break;
                }
            } catch (e) {
                // Not the right class, continue
            }
        }

        if (ApiInterceptor) {
            ApiInterceptor.intercept.implementation = function (chain) {
                var request = chain.request();
                var url = request.url().toString();
                var method = request.method();

                console.log("\n========================================");
                console.log("URL: " + url);
                console.log("Method: " + method);

                // Capture request body (pre-encryption or post-decryption)
                var reqBody = request.body();
                if (reqBody) {
                    try {
                        var buffer = Java.use("okio.Buffer").$new();
                        reqBody.writeTo(buffer);
                        var reqBodyStr = buffer.readUtf8();
                        console.log("Request Body: " + reqBodyStr.substring(0, 500));
                    } catch (e) {
                        console.log("Request Body: [unable to read]");
                    }
                }

                // Call original interceptor
                var response = this.intercept(chain);

                // Capture response body (post-decryption)
                var resBody = response.body();
                if (resBody) {
                    try {
                        var contentType = resBody.contentType();
                        var bodyBytes = resBody.bytes();
                        var bodyStr = Java.use("java.lang.String").$new(bodyBytes, "UTF-8");

                        console.log("Response Status: " + response.code());
                        console.log("Response Body (" + bodyBytes.length + " bytes): " + bodyStr.substring(0, 1000));

                        // Send to our local API server for caching
                        sendToServer(url, method, bodyStr);

                        // Rebuild response with same body (since bytes() consumes it)
                        var newBody = ResponseBody.create(contentType, bodyBytes);
                        response = response.newBuilder().body(newBody).build();
                    } catch (e) {
                        console.log("Response Body: [error reading: " + e + "]");
                    }
                }

                console.log("========================================\n");
                return response;
            };
        }
    } catch (e) {
        console.log("[!] Interceptor hook failed: " + e);
    }

    // ============================================================
    // HOOK 2: Direct ttEncrypt hook (backup approach)
    // ============================================================
    try {
        // Hook the JNI method that wraps ttEncrypt
        // The net class calls native ttEncrypt and handles encrypt-key header
        var encryptorClasses = [
            "com.startshorts.androidplayer.manager.api.base.EncryptHelper",
            "com.startshorts.androidplayer.manager.api.base.e",
            "com.startshorts.androidplayer.manager.api.base.d",
            "com.startshorts.androidplayer.manager.api.base.c"
        ];

        for (var i = 0; i < encryptorClasses.length; i++) {
            try {
                var encCls = Java.use(encryptorClasses[i]);
                var methods = encCls.class.getDeclaredMethods();

                for (var m = 0; m < methods.length; m++) {
                    var methodName = methods[m].getName();
                    var paramCount = methods[m].getParameterTypes().length;

                    // Look for methods that take String and return String (encrypt/decrypt patterns)
                    if (paramCount >= 1 && paramCount <= 3) {
                        console.log("[*] Found candidate encrypt method: " + encryptorClasses[i] + "." + methodName + " (params: " + paramCount + ")");
                    }
                }
            } catch (e) {
                // Class not found, skip
            }
        }
    } catch (e) {
        console.log("[!] Encryptor hook failed: " + e);
    }

    // ============================================================
    // HOOK 3: Gson serialization (capture clean JSON)
    // ============================================================
    try {
        var Gson = Java.use("com.google.gson.Gson");
        Gson.toJson.overload("java.lang.Object").implementation = function (obj) {
            var json = this.toJson(obj);
            if (json.length > 50 && json.length < 10000) {
                var className = obj.getClass().getName();
                if (className.includes("startshorts") || className.includes("netshort")) {
                    console.log("\n[Gson] Serializing " + className);
                    console.log("[Gson] JSON: " + json.substring(0, 500));
                }
            }
            return json;
        };
        console.log("[✓] Hooked Gson.toJson");
    } catch (e) {
        console.log("[!] Gson hook failed: " + e);
    }

    // ============================================================
    // HOOK 4: Retrofit Response handler
    // ============================================================
    try {
        var GsonConverterFactory = Java.use("retrofit2.converter.gson.GsonResponseBodyConverter");
        GsonConverterFactory.convert.implementation = function (body) {
            try {
                var bodyStr = body.string();
                console.log("\n[Retrofit] Response Body: " + bodyStr.substring(0, 1000));
                // Recreate body for actual parsing
                var ResponseBody = Java.use("okhttp3.ResponseBody");
                var MediaType = Java.use("okhttp3.MediaType");
                var newBody = ResponseBody.create(MediaType.parse("application/json"), bodyStr);
                return this.convert(newBody);
            } catch (e) {
                return this.convert(body);
            }
        };
        console.log("[✓] Hooked Retrofit GsonResponseBodyConverter");
    } catch (e) {
        console.log("[!] Retrofit hook failed: " + e);
    }

    console.log("\n[*] All hooks installed. Interact with the app to capture data.\n");

    // Helper: send captured data to our API server
    function sendToServer(url, method, responseBody) {
        try {
            var URL = Java.use("java.net.URL");
            var HttpURLConnection = Java.use("java.net.HttpURLConnection");
            var OutputStreamWriter = Java.use("java.io.OutputStreamWriter");

            var serverUrl = new URL(API_SERVER + "/api/_capture");
            var conn = serverUrl.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            var payload = JSON.stringify({
                originalUrl: url,
                method: method,
                responseBody: responseBody,
                timestamp: Date.now()
            });

            var writer = new OutputStreamWriter(conn.getOutputStream());
            writer.write(payload);
            writer.flush();
            writer.close();

            conn.getResponseCode(); // Trigger the request
        } catch (e) {
            // Silently fail - server might not be running
        }
    }
});
