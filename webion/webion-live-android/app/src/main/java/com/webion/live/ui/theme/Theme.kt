package com.webion.live.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

// ── Webion Luxury Dark Theme (Primary) ──
private val DarkColorScheme = darkColorScheme(
    primary = LuxuryGold,
    primaryContainer = LuxuryGoldDark,
    secondary = Stone400,
    secondaryContainer = Stone800,
    tertiary = NeonMint,
    tertiaryContainer = Stone900,
    background = Stone950,
    surface = Stone900,
    surfaceVariant = Stone800,
    outline = GlassBorderGold,
    onPrimary = Stone950,
    onPrimaryContainer = LuxuryGoldLight,
    onSecondary = Stone950,
    onSecondaryContainer = Stone200,
    onTertiary = Stone950,
    onBackground = Stone200,
    onSurface = Stone200,
    onSurfaceVariant = Stone400,
    inverseSurface = Stone200,
    inverseOnSurface = Stone950,
    inversePrimary = LuxuryGold,
    error = Color(0xFFEF4444),
    onError = Color.White,
)

// ── Webion Light Theme ──
private val LightColorScheme = lightColorScheme(
    primary = LuxuryGold,
    primaryContainer = LuxuryGoldLight,
    secondary = Stone700,
    secondaryContainer = Stone200,
    tertiary = AccentMint,
    background = Milk,
    surface = Milk,
    surfaceVariant = Stone200,
    outline = GlassBorderGold,
    onPrimary = Color.White,
    onPrimaryContainer = Stone900,
    onSecondary = Color.White,
    onSecondaryContainer = Stone800,
    onTertiary = Color.White,
    onBackground = Stone950,
    onSurface = Stone950,
    onSurfaceVariant = Stone700,
)

@Composable
fun WebionLiveTheme(
    darkTheme: Boolean = true, // Default to dark for premium feel
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !darkTheme
                isAppearanceLightNavigationBars = !darkTheme
            }
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
