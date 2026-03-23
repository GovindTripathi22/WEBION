package com.webion.live.ui.screens

import android.util.Log
import android.view.SurfaceView
import android.widget.FrameLayout
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.webion.live.ui.components.ARMeasurementPanel
import com.webion.live.ui.components.BuyerMiniView
import com.webion.live.ui.components.SellerCameraView
import com.webion.live.ui.components.SellerControlBar
import com.webion.live.ui.theme.WebionLiveTheme
import io.agora.rtc2.ChannelMediaOptions
import io.agora.rtc2.Constants
import io.agora.rtc2.IRtcEngineEventHandler
import io.agora.rtc2.RtcEngine
import io.agora.rtc2.RtcEngineConfig
import io.agora.rtc2.video.VideoCanvas
import io.socket.client.IO
import io.socket.client.Socket
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

// ─── Constants ───────────────────────────────────────────────────────────────
private const val TAG = "LiveStoreScreen"
private const val SERVER_URL = "http://172.26.2.35:5000"
private const val AGORA_APP_ID = "ef9c84c99ed2411aac7751c40a9fd720"
private const val CHANNEL_NAME = "webion-live"

@Composable
fun LiveStoreScreen() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    // ── Agora state ──────────────────────────────────────────────────────────
    var agoraEngine by remember { mutableStateOf<RtcEngine?>(null) }
    var localSurfaceView by remember { mutableStateOf<SurfaceView?>(null) }
    var remoteSurfaceView by remember { mutableStateOf<SurfaceView?>(null) }

    // ── Socket.io state ──────────────────────────────────────────────────────
    var socket by remember { mutableStateOf<Socket?>(null) }
    var arDimensions by remember { mutableStateOf<String?>(null) }

    // ─── Initialize Socket.io ────────────────────────────────────────────────
    DisposableEffect(Unit) {
        val opts = IO.Options.builder()
            .setTransports(arrayOf("websocket"))
            .build()
        val mSocket = try { IO.socket(SERVER_URL, opts) } catch (e: Exception) { null }

        mSocket?.on(Socket.EVENT_CONNECT) {
            Log.d(TAG, "Socket connected: ${mSocket.id()}")
        }
        mSocket?.on("receive_ar_dimensions") { args ->
            if (args.isNotEmpty()) {
                val data = args[0] as? JSONObject
                val width = data?.optDouble("mannequinWidth", 0.0) ?: 0.0
                arDimensions = "Width: ${width}cm"
                Log.d(TAG, "AR Dimensions received: $arDimensions")
            }
        }
        mSocket?.on("receive_negotiation_alert") {
            scope.launch {
                snackbarHostState.showSnackbar("🔔 Buyer wants to negotiate!")
            }
        }
        mSocket?.connect()
        socket = mSocket

        onDispose {
            mSocket?.disconnect()
            mSocket?.off()
            Log.d(TAG, "Socket disconnected")
        }
    }

    // ─── Initialize Agora RTC Engine ─────────────────────────────────────────
    DisposableEffect(Unit) {
        val eventHandler = object : IRtcEngineEventHandler() {
            override fun onJoinChannelSuccess(channel: String?, uid: Int, elapsed: Int) {
                Log.d(TAG, "Joined channel: $channel with UID: $uid")
            }

            override fun onUserJoined(uid: Int, elapsed: Int) {
                Log.d(TAG, "Remote user joined: $uid")
                // Create a SurfaceView for the remote user (the buyer from web)
                val surfaceView = SurfaceView(context)
                remoteSurfaceView = surfaceView
                agoraEngine?.setupRemoteVideo(
                    VideoCanvas(surfaceView, VideoCanvas.RENDER_MODE_FIT, uid)
                )
            }

            override fun onUserOffline(uid: Int, reason: Int) {
                Log.d(TAG, "Remote user left: $uid")
                remoteSurfaceView = null
            }

            override fun onError(err: Int) {
                Log.e(TAG, "Agora error: $err")
            }
        }

        try {
            val config = RtcEngineConfig().apply {
                mContext = context
                mAppId = AGORA_APP_ID
                mEventHandler = eventHandler
            }
            val engine = RtcEngine.create(config)
            engine.enableVideo()
            engine.startPreview()

            // Setup local video (seller's back camera)
            val localView = SurfaceView(context)
            localSurfaceView = localView
            engine.setupLocalVideo(
                VideoCanvas(localView, VideoCanvas.RENDER_MODE_HIDDEN, 0)
            )

            agoraEngine = engine

            // Fetch token and join channel in background
            scope.launch {
                try {
                    val token = fetchAgoraToken(CHANNEL_NAME)
                    if (token != null) {
                        val options = ChannelMediaOptions().apply {
                            clientRoleType = Constants.CLIENT_ROLE_BROADCASTER
                            channelProfile = Constants.CHANNEL_PROFILE_LIVE_BROADCASTING
                        }
                        engine.joinChannel(token, CHANNEL_NAME, 0, options)
                        Log.d(TAG, "Joining channel with token...")
                    } else {
                        Log.e(TAG, "Failed to fetch Agora token")
                        snackbarHostState.showSnackbar("Failed to fetch video token")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error joining channel", e)
                    snackbarHostState.showSnackbar("Error: ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing Agora", e)
        }

        onDispose {
            agoraEngine?.stopPreview()
            agoraEngine?.leaveChannel()
            RtcEngine.destroy()
            agoraEngine = null
            localSurfaceView = null
            remoteSurfaceView = null
            Log.d(TAG, "Agora engine destroyed")
        }
    }

    // ─── UI Layout ───────────────────────────────────────────────────────────
    Scaffold(
        snackbarHost = { SnackbarHost(hostState = snackbarHostState) }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            // 1. Seller Camera Feed (Background — full screen, back camera)
            SellerCameraView(surfaceView = localSurfaceView)

            // 2. Buyer Mini View (Picture-in-Picture — remote web user)
            BuyerMiniView(
                surfaceView = remoteSurfaceView,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .statusBarsPadding()
                    .padding(top = 16.dp, end = 16.dp)
            )

            // 3. AR Measurement Panel (Side Overlay)
            ARMeasurementPanel(
                dimensions = arDimensions,
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = 16.dp)
            )

            // 4. Seller Control Bar (Bottom Overlay)
            SellerControlBar(
                onStartStream = {
                    // Stream is auto-started on launch; this can toggle
                    scope.launch {
                        snackbarHostState.showSnackbar("Stream is live!")
                    }
                },
                onScanDimensions = {
                    // Emit simulated AR dimensions via Socket.io
                    val data = JSONObject().apply {
                        put("mannequinWidth", 42.5)
                        put("mannequinLength", 72.0)
                        put("shoulderWidth", 42.5)
                    }
                    socket?.emit("send_ar_dimensions", data)
                    scope.launch {
                        snackbarHostState.showSnackbar("AR dimensions sent!")
                    }
                    Log.d(TAG, "Emitted send_ar_dimensions: $data")
                },
                onPushProduct = {
                    scope.launch {
                        snackbarHostState.showSnackbar("Product pushed to buyer!")
                    }
                },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 32.dp, start = 16.dp, end = 16.dp)
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
fun LiveStoreScreenPreview() {
    WebionLiveTheme {
        LiveStoreScreen()
    }
}

// ─── Network: Fetch Agora Token ──────────────────────────────────────────────
private suspend fun fetchAgoraToken(channelName: String): String? {
    return withContext(Dispatchers.IO) {
        try {
            val url = URL("$SERVER_URL/api/agora/token?channelName=$channelName")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 5000
            connection.readTimeout = 5000

            if (connection.responseCode == 200) {
                val response = connection.inputStream.bufferedReader().readText()
                val json = JSONObject(response)
                json.optString("token", null)
            } else {
                Log.e(TAG, "Token fetch failed: ${connection.responseCode}")
                null
            }
        } catch (e: Exception) {
            Log.e(TAG, "Token fetch exception", e)
            null
        }
    }
}
