package com.webion.live.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.webion.live.ui.theme.*

@Composable
fun BuyerMiniView(modifier: Modifier = Modifier) {
    val isDark = isSystemInDarkTheme()
    val bgColor = if (isDark) ClayDark else ClayWhite
    val borderColor = if (isDark) GlassBorderDark else GlassBorderLight

    Box(
        modifier = modifier
            .size(130.dp, 180.dp)
            .background(bgColor, RoundedCornerShape(24.dp))
            .border(1.dp, borderColor, RoundedCornerShape(24.dp)),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "BUYER FEED",
            color = if (isDark) NeonSky.copy(alpha = 0.5f) else Obsidian.copy(alpha = 0.3f),
            style = androidx.compose.material3.MaterialTheme.typography.labelSmall
        )
    }
}
