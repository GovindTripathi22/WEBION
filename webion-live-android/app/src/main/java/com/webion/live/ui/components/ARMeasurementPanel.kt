package com.webion.live.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.animation.core.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.webion.live.ui.theme.*

@Composable
fun ARMeasurementPanel(modifier: Modifier = Modifier) {
    val isDark = isSystemInDarkTheme()
    val bgColor = if (isDark) ClayDark else ClayWhite
    val borderColor = if (isDark) GlassBorderDark else GlassBorderLight

    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val alphaAnim by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alphaAnim"
    )

    Column(
        modifier = modifier
            .width(220.dp)
            .background(bgColor, RoundedCornerShape(24.dp))
            .border(1.dp, borderColor, RoundedCornerShape(24.dp))
            .padding(20.dp)
    ) {
        Text(
            text = "LIVE AR SCAN",
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Black,
                letterSpacing = 2.sp
            ),
            color = if (isDark) NeonPeach else AccentPeach
        )
        Spacer(modifier = Modifier.height(8.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
           Box(modifier = Modifier.size(6.dp).background(if (isDark) NeonPeach.copy(alpha = alphaAnim) else AccentPeach.copy(alpha = alphaAnim), RoundedCornerShape(3.dp)))
           Spacer(modifier = Modifier.width(6.dp))
           Text(
               text = "Scanning Dimensions...",
               style = MaterialTheme.typography.labelSmall,
               color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
           )
        }
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = "Target: Mannequin A1",
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Bold),
            color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Shoulder: 42.5cm",
            style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Black),
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "Length: 72.0cm",
            style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Black),
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}
