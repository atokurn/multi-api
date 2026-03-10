/**
 * ============================================================
 * DramaNova (com.udrama.ruiqilin) — Full API Intercept v2
 * ============================================================
 *
 * Fixed: OkHttp hooks use obfuscated class names
 * Fixed: Reduced token logging noise
 * Added: DramaInfoVo video detection
 *
 * Usage:
 *   frida -U -f com.udrama.ruiqilin -l dramanova-intercept.js
 */

var capturedRequests = [];
var lastDetailResponse = null;
var tokenLogged = false; // Only log token once

function timestamp() {
    return new Date().toISOString().replace('T', ' ').split('.')[0];
}

function readRequestBody(request) {
    try {
        var body = request.body();
        if (body === null) return null;
        var Buffer = Java.use("okio.Buffer");
        var buffer = Buffer.$new();
        body.writeTo(buffer);
        return buffer.readUtf8();
    } catch (e) {
        return "[Error: " + e + "]";
    }
}

Java.perform(function () {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║   🎬 DramaNova Intercept v2 — Active             ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    // ─────────────────────────────
    // 1. SSL PINNING BYPASS
    // ─────────────────────────────
    try {
        var TrustManagerFactory = Java.use("javax.net.ssl.TrustManagerFactory");
        TrustManagerFactory.getTrustManagers.implementation = function () {
            var TrustManager = Java.use("javax.net.ssl.X509TrustManager");
            var EmptyTM = Java.registerClass({
                name: "com.frida.EmptyTM",
                implements: [TrustManager],
                methods: {
                    checkClientTrusted: function (chain, authType) { },
                    checkServerTrusted: function (chain, authType) { },
                    getAcceptedIssuers: function () { return []; }
                }
            });
            return [EmptyTM.$new()];
        };
        console.log("[✓] SSL bypass active");
    } catch (e) { console.log("[!] SSL bypass failed: " + e.message); }

    try {
        var SSLContext = Java.use("javax.net.ssl.SSLContext");
        SSLContext.init.overload("[Ljavax.net.ssl.KeyManager;", "[Ljavax.net.ssl.TrustManager;", "java.security.SecureRandom").implementation = function (km, tm, sr) {
            var TrustManager = Java.use("javax.net.ssl.X509TrustManager");
            var EmptyTM2 = Java.registerClass({
                name: "com.frida.EmptyTM2",
                implements: [TrustManager],
                methods: {
                    checkClientTrusted: function (chain, authType) { },
                    checkServerTrusted: function (chain, authType) { },
                    getAcceptedIssuers: function () { return []; }
                }
            });
            this.init(km, [EmptyTM2.$new()], sr);
        };
    } catch (e) { }

    // ─────────────────────────────
    // 2. HOOK EncryptUtil (AES/RSA)
    // ─────────────────────────────
    try {
        var EncryptUtil = Java.use("com.udrama.ruiqilin.remote.helper.EncryptUtil");

        EncryptUtil.generateAesKey.implementation = function () {
            var key = this.generateAesKey();
            console.log("\n[🔑 AES KEY] " + key);
            return key;
        };

        EncryptUtil.encryptWithRsa.implementation = function (plaintext) {
            console.log("[🔐 RSA] Encrypting AES key");
            return this.encryptWithRsa(plaintext);
        };

        EncryptUtil.encryptWithAes.implementation = function (plaintext, key) {
            console.log("\n[📤 ENCRYPT BODY]\n" + plaintext);
            return this.encryptWithAes(plaintext, key);
        };

        EncryptUtil.decryptWithAes.implementation = function (ciphertext, key) {
            var result = this.decryptWithAes(ciphertext, key);
            console.log("\n[📥 DECRYPT RESPONSE]\n" + result.substring(0, 2000));

            if (result.indexOf('"videos"') !== -1 || result.indexOf('"videoUrl"') !== -1) {
                console.log("\n🎬🎬🎬 VIDEO DATA DETECTED! 🎬🎬🎬");
                lastDetailResponse = result;
            }
            return result;
        };

        console.log("[✓] EncryptUtil hooks active");
    } catch (e) { console.log("[!] EncryptUtil failed: " + e); }

    // ─────────────────────────────
    // 3. HOOK OkHttp (obfuscated classes)
    // ─────────────────────────────

    // The app uses ProGuard/R8 obfuscated OkHttp classes.
    // From decompiled code:
    //   xk3 = OkHttpClient
    //   w54 = Request
    //   qb2 = Interceptor
    //   k74 = Response
    //   tx1 = Headers
    // We need to find the correct interceptor chain class.

    // Strategy: Hook at the HttpURLConnection / URL level as fallback
    var okHttpHooked = false;

    // Try multiple possible OkHttp interceptor chain class names
    var possibleChainClasses = [
        "okhttp3.internal.http.RealInterceptorChain",
        "okhttp3.internal.http.BridgeInterceptor",
        // Obfuscated from decompiled code
        "qb2",  // Interceptor interface
    ];

    // Try to hook the obfuscated Interceptor (qb2) intercept method
    try {
        // Hook at the application-level interceptor defined in HttpClient
        // The interceptor is the anonymous class in HttpClient.ClientHolder
        // It's added via .a(new qb2() { intercept(...) })
        // Let's hook the URL class to see all connections
        var URL = Java.use("java.net.URL");
        URL.openConnection.overload().implementation = function () {
            var url = this.toString();
            if (url.indexOf("playsverse.com") !== -1) {
                console.log("\n[🌐 URL] " + url);
            }
            return this.openConnection();
        };
        console.log("[✓] URL.openConnection hooked");
    } catch (e) {
        console.log("[!] URL hook failed: " + e.message);
    }

    // Hook HttpURLConnection
    try {
        var HttpURLConnection = Java.use("java.net.HttpURLConnection");
        HttpURLConnection.getResponseCode.implementation = function () {
            var code = this.getResponseCode();
            var url = this.getURL().toString();
            if (url.indexOf("playsverse.com") !== -1) {
                console.log("[↩ HTTP " + code + "] " + url);
            }
            return code;
        };
        console.log("[✓] HttpURLConnection hooked");
    } catch (e) {
        console.log("[!] HttpURLConnection hook failed: " + e.message);
    }

    // Try to hook the actual OkHttp Request builder to see URLs
    // From decompiled: w54.a is Request.Builder, w54 is Request
    try {
        // Try hooking w54 (obfuscated Request class)
        var classes = Java.enumerateLoadedClassesSync();
        var okHttpRequestClass = null;

        // Look for the execute/enqueue methods on Call implementations
        for (var i = 0; i < classes.length; i++) {
            var cls = classes[i];
            if (cls.indexOf("retrofit2.OkHttpCall") !== -1) {
                okHttpRequestClass = cls;
                break;
            }
        }

        if (okHttpRequestClass) {
            console.log("[*] Found: " + okHttpRequestClass);
        }
    } catch (e) {
        console.log("[!] Class search: " + e.message);
    }

    // Hook Retrofit2 Call execution — most reliable approach
    try {
        var OkHttpCall = Java.use("retrofit2.OkHttpCall");
        OkHttpCall.execute.implementation = function () {
            var request = this.request();
            var url = request.url().toString();
            var method = request.method();

            if (url.indexOf("playsverse.com") !== -1) {
                console.log("\n╔══════════════════════════════════════════════════╗");
                console.log("║ " + method + " " + url);

                // Headers
                var headers = request.headers();
                var headerObj = {};
                for (var i = 0; i < headers.size(); i++) {
                    headerObj[headers.name(i)] = headers.value(i);
                    console.log("║ " + headers.name(i) + ": " + headers.value(i));
                }

                // Request body
                var bodyStr = readRequestBody(request);
                if (bodyStr) {
                    console.log("╠── Body ──────────────────────────────────────────");
                    console.log("║ " + bodyStr.substring(0, 300));
                }
                console.log("╚══════════════════════════════════════════════════╝");

                var response = this.execute();
                var respBody = response.body();
                console.log("[↩ RESPONSE " + response.code() + "] " + url);

                capturedRequests.push({
                    ts: timestamp(),
                    method: method,
                    url: url,
                    headers: headerObj,
                    body: bodyStr
                });

                return response;
            }

            return this.execute();
        };
        console.log("[✓] Retrofit2 OkHttpCall.execute hooked");
        okHttpHooked = true;
    } catch (e) {
        console.log("[!] Retrofit2 hook failed: " + e.message);
    }

    // Hook Retrofit2 enqueue (async calls) — wrapped in try-catch
    // because this.request() may not be available yet in enqueue context
    try {
        var OkHttpCall2 = Java.use("retrofit2.OkHttpCall");
        OkHttpCall2.enqueue.implementation = function (callback) {
            try {
                var request = this.request();
                if (request) {
                    var url = request.url().toString();
                    var method = request.method();

                    if (url.indexOf("playsverse.com") !== -1) {
                        console.log("\n╔══════════════════════════════════════════════════╗");
                        console.log("║ [ASYNC] " + method + " " + url);

                        try {
                            var headers = request.headers();
                            for (var i = 0; i < headers.size(); i++) {
                                console.log("║ " + headers.name(i) + ": " + headers.value(i));
                            }
                        } catch (he) { }

                        try {
                            var bodyStr = readRequestBody(request);
                            if (bodyStr) {
                                console.log("╠── Body ─────────────────────────────────────");
                                console.log("║ " + bodyStr.substring(0, 300));
                            }
                        } catch (be) { }

                        console.log("╚══════════════════════════════════════════════════╝");

                        capturedRequests.push({
                            ts: timestamp(),
                            method: method,
                            url: url,
                            async: true
                        });
                    }
                }
            } catch (innerErr) {
                // this.request() failed — not available yet, that's OK
                console.log("[ASYNC] enqueue called (request not yet built)");
            }

            this.enqueue(callback);
        };
        console.log("[✓] Retrofit2 OkHttpCall.enqueue hooked");
    } catch (e) {
        console.log("[!] Retrofit2 enqueue hook failed: " + e.message);
    }

    // ─────────────────────────────
    // 4. HOOK LoginHelper (reduced noise)
    // ─────────────────────────────
    try {
        var LoginHelper = Java.use("com.udrama.ruiqilin.remote.login.LoginHelper");

        LoginHelper.setToken.implementation = function (token) {
            if (!tokenLogged && token && token.length > 0) {
                console.log("\n[🎫 TOKEN SET] " + token.substring(0, 60) + "...");
                tokenLogged = true;
            }
            this.setToken(token);
        };

        // Don't hook getToken to reduce noise!
        console.log("[✓] LoginHelper hooked (quiet mode)");
    } catch (e) { console.log("[!] LoginHelper failed: " + e); }

    // ─────────────────────────────
    // 5. HOOK GuestHelper (reduced)
    // ─────────────────────────────
    try {
        var GuestHelper = Java.use("com.udrama.ruiqilin.remote.guest.GuestHelper");
        GuestHelper.generateGuestUsername.implementation = function () {
            var name = this.generateGuestUsername();
            console.log("[👤 GUEST] " + name);
            return name;
        };
        console.log("[✓] GuestHelper hooked");
    } catch (e) { }

    // ─────────────────────────────
    // 6. HOOK Gson (filtered)
    // ─────────────────────────────
    try {
        var Gson = Java.use("com.google.gson.Gson");
        Gson.toJson.overload("java.lang.Object").implementation = function (obj) {
            var json = this.toJson(obj);
            var cls = obj ? obj.getClass().getName() : "null";

            // Only log drama-related objects, not ads
            if (cls.indexOf("DramaInfoVo") !== -1 || cls.indexOf("DramaLoginVo") !== -1) {
                console.log("\n[📋 GSON " + cls.split('.').pop() + "]");
                console.log(json.substring(0, 1000));

                // Detect video data
                if (json.indexOf('"videoUrl"') !== -1 || json.indexOf('"videos"') !== -1) {
                    console.log("\n🎬🎬🎬 VIDEO DATA IN GSON! 🎬🎬🎬");
                    lastDetailResponse = json;
                }
            }
            // Log DramaNewListVo only first occurrence
            else if (cls.indexOf("DramaNewListVo") !== -1) {
                if (json.indexOf('"videoSource"') !== -1) {
                    // Extract just dramaId, title, and videoSource
                    try {
                        var parsed = JSON.parse(json);
                        console.log("[📋 Drama] " + parsed.title + " | videoSource=" + parsed.videoSource + " | provider=" + parsed.sourceProvider);
                    } catch (e) {
                        console.log("[📋 DramaNewListVo] " + json.substring(0, 200));
                    }
                }
            }
            // Skip AdsStrategyVo and other noise
            return json;
        };
        console.log("[✓] Gson hooked (filtered)");
    } catch (e) { console.log("[!] Gson failed: " + e); }

    // ─────────────────────────────
    // 7. HOOK DramaService calls for detail
    // ─────────────────────────────
    try {
        var DramaService = Java.use("com.udrama.ruiqilin.remote.service.DramaListService");
        // Hook all methods to find the drama detail call
        var methods = DramaService.class.getDeclaredMethods();
        console.log("[*] DramaListService methods: " + methods.length);
        for (var i = 0; i < methods.length; i++) {
            console.log("[*]   " + methods[i].getName() + "(" + methods[i].getParameterTypes().length + " params)");
        }
    } catch (e) {
        console.log("[!] DramaListService: " + e.message);
    }

    // Try to hook DramaInfoVo deserialization
    try {
        var DramaInfoVo = Java.use("com.udrama.ruiqilin.remote.model.vo.DramaInfoVo");
        DramaInfoVo.getVideos.implementation = function () {
            var videos = this.getVideos();
            var title = this.getTitle();
            console.log("\n🎬 getVideos() called for: " + title);
            if (videos !== null) {
                console.log("🎬 Video count: " + videos.size());
                // Print first few video URLs
                var iter = videos.iterator();
                var count = 0;
                while (iter.hasNext() && count < 5) {
                    var video = iter.next();
                    var videoUrl = video.getVideoUrl();
                    var ep = video.getEpisodeOrder();
                    if (videoUrl) {
                        console.log("  Ep " + ep + ": " + videoUrl.substring(0, 80) + "...");
                    } else {
                        console.log("  Ep " + ep + ": NO URL | tcFileId=" + video.getTcplayerFileId());
                    }
                    count++;
                }
            } else {
                console.log("🎬 Videos is NULL!");
            }
            return videos;
        };
        console.log("[✓] DramaInfoVo.getVideos hooked");
    } catch (e) {
        console.log("[!] DramaInfoVo hook failed: " + e.message);
    }

    // Hook individual VideosVo.getVideoUrl
    try {
        var VideosVo = Java.use("com.udrama.ruiqilin.remote.model.vo.DramaInfoVo$VideosVo");
        VideosVo.getVideoUrl.implementation = function () {
            var url = this.getVideoUrl();
            var ep = this.getEpisodeOrder();
            if (url) {
                console.log("[🎥 VIDEO] Ep " + ep + ": " + url);
            }
            return url;
        };
        console.log("[✓] VideosVo.getVideoUrl hooked");
    } catch (e) {
        console.log("[!] VideosVo hook failed: " + e.message);
    }

    // ═══════════════════════════════════════
    // RPC EXPORTS
    // ═══════════════════════════════════════
    rpc.exports = {
        getCaptured: function () {
            return JSON.stringify(capturedRequests, null, 2);
        },
        clearCaptured: function () {
            capturedRequests = [];
            return "Cleared";
        },
        getLastDetail: function () {
            return lastDetailResponse || "No video data captured yet";
        }
    };

    console.log("\n[✓] All hooks ready! Noise reduced.");
    console.log("[*] Buka app → Klik detail drama → Lihat output 🎬");
    console.log("[*] Use rpc.exports.getLastDetail() for video data.\n");
});
