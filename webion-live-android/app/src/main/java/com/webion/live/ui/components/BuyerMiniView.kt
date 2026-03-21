package com.webion.live.ui.components

import android.view.SurfaceView
import android.widget.FrameLayout
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.webion.live.ui.theme.*

@Composable
fun BuyerMiniView(
    surfaceView: SurfaceView?,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val bgColor = if (isDark) ClayDark else ClayWhite
    val borderColor = if (isDark) GlassBorderDark else GlassBorderLight

    Box(
        modifier = modifier
            .size(130.dp, 180.dp)
            .clip(RoundedCornerShape(24.dp))
            .background(bgColor, RoundedCornerShape(24.dp))
            .border(1.dp, borderColor, RoundedCornerShape(24.dp)),
        contentAlignment = Alignment.Center
    ) {
        if (surfaceView != null) {
            AndroidView(
                factory = { ctx ->
                    FrameLayout(ctx).apply {
                        addView(surfaceView)
                    }
                },
                modifier = Modifier
                    .size(130.dp, 180.dp)
                    .clip(RoundedCornerShape(24.dp))
            )
        } else {
            Text(
                text = "BUYER FEED",
                color = if (isDark) NeonSky.copy(alpha = 0.5f) else Obsidian.copy(alpha = 0.3f),
                style = MaterialTheme.typography.labelSmall
            )
        }
    }
}
