package com.webion.live.ui.screens

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.webion.live.ui.components.ARMeasurementPanel
import com.webion.live.ui.components.BuyerMiniView
import com.webion.live.ui.components.SellerCameraView
import com.webion.live.ui.components.SellerControlBar
import com.webion.live.ui.theme.WebionLiveTheme

@Composable
fun LiveStoreScreen() {
    Box(
        modifier = Modifier
            .fillMaxSize()
    ) {
        // 1. Seller Camera Feed (Background)
        SellerCameraView()

        // 2. Buyer Mini View (Picture-in-Picture)
        BuyerMiniView(
            modifier = Modifier
                .align(Alignment.TopEnd)
                .statusBarsPadding()
                .padding(top = 16.dp, end = 16.dp)
        )

        // 3. AR Measurement Panel (Side Overlay)
        ARMeasurementPanel(
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 16.dp)
        )

        // 4. Seller Control Bar (Bottom Overlay)
        SellerControlBar(
            onStartStream = { /* Handle Agora Start */ },
            onScanDimensions = { /* Handle ARCore Scan */ },
            onPushProduct = { /* Handle Web Signal */ },
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 32.dp, start = 16.dp, end = 16.dp)
        )
    }
}

@Preview(showBackground = true, showSystemUi = true)
@Composable
fun LiveStoreScreenPreview() {
    WebionLiveTheme {
        LiveStoreScreen()
    }
}
