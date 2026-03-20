package com.webion.live.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.webion.live.ui.theme.*

@Composable
fun SellerControlBar(
    onStartStream: () -> Unit,
    onScanDimensions: () -> Unit,
    onPushProduct: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isDark = isSystemInDarkTheme()
    val bgColor = if (isDark) ClayDark else ClayWhite
    val borderColor = if (isDark) GlassBorderDark else GlassBorderLight

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(96.dp)
            .background(bgColor, RoundedCornerShape(48.dp))
            .border(1.dp, borderColor, RoundedCornerShape(48.dp))
            .padding(horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        ClayButton(
            text = "Start",
            onClick = onStartStream,
            modifier = Modifier.weight(1f),
            isPrimary = false
        )
        ClayButton(
            text = "Scan",
            onClick = onScanDimensions,
            modifier = Modifier.weight(1f),
            isPrimary = false
        )
        ClayButton(
            text = "Push Item",
            onClick = onPushProduct,
            modifier = Modifier.weight(1.2f),
            isPrimary = true
        )
    }
}

@Composable
fun ClayButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isPrimary: Boolean = false
) {
    val isDark = isSystemInDarkTheme()
    
    val containerColor = when {
        isPrimary && isDark -> NeonPeach
        isPrimary -> AccentPeach
        isDark -> Color.White.copy(alpha = 0.05f)
        else -> Color.White
    }
    
    val contentColor = when {
        isPrimary -> if (isDark) Obsidian else Color.White
        isDark -> NeonSky
        else -> Obsidian
    }

    Button(
        onClick = onClick,
        modifier = modifier
            .height(56.dp),
        shape = RoundedCornerShape(28.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = containerColor,
            contentColor = contentColor
        ),
        elevation = ButtonDefaults.buttonElevation(defaultElevation = 0.dp)
    ) {
        Text(
            text = text.uppercase(),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.Black,
                letterSpacing = 1.sp
            ),
            maxLines = 1
        )
    }
}
