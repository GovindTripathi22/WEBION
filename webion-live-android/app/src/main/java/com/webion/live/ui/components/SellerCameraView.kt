package com.webion.live.ui.components

import android.view.SurfaceView
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.webion.live.ui.theme.BorderWhite

@Composable
fun SellerCameraView(
    surfaceView: SurfaceView?,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .border(1.dp, BorderWhite, RectangleShape),
        contentAlignment = Alignment.Center
    ) {
        if (surfaceView != null) {
            AndroidView(
                factory = { ctx ->
                    FrameLayout(ctx).apply {
                        addView(surfaceView)
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
        } else {
            Text(
                text = "INITIALIZING CAMERA...",
                color = Color.White.copy(alpha = 0.3f),
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}
