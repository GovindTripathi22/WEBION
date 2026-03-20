package com.webion.live.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.RectangleShape
import androidx.compose.ui.unit.dp
import com.webion.live.ui.theme.BorderWhite

@Composable
fun SellerCameraView(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(Color.Black)
            .border(1.dp, BorderWhite, RectangleShape),
        contentAlignment = Alignment.Center
    ) {
        // Placeholder for Camera Preview (CameraX or ARCore)
        Text(
            text = "LOCAL CAMERA FEED (MANNEQUIN)",
            color = Color.White.copy(alpha = 0.3f),
            style = androidx.compose.material3.MaterialTheme.typography.labelSmall
        )
    }
}
