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

private val DarkColorScheme = darkColorScheme(
    primary = NeonPeach,
    secondary = NeonSky,
    tertiary = NeonMint,
    background = Obsidian,
    surface = Obsidian,
    onPrimary = Obsidian,
    onSecondary = Obsidian,
    onTertiary = Obsidian,
    onBackground = Milk,
    onSurface = Milk,
)

private val LightColorScheme = lightColorScheme(
    primary = AccentPeach,
    secondary = Sky,
    tertiary = AccentMint,
    background = Milk,
    surface = Milk,
    onPrimary = Color.White,
    onSecondary = Obsidian,
    onTertiary = Obsidian,
    onBackground = Obsidian,
    onSurface = Obsidian,
)

@Composable
fun WebionLiveTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
