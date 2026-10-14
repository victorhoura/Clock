import { useApp } from '../context/AppContext'

/** Shared Recharts styling so every chart follows the light/dark theme the same way. */
export function useChartTheme() {
  const { theme } = useApp()
  const dark = theme === 'dark'
  const textColor = dark ? '#e2e8f0' : '#1e293b'
  return {
    axisColor: '#94a3b8',
    gridColor: dark ? '#1e293b' : '#eef1f6',
    cursorFill: dark ? 'rgba(148,163,184,0.08)' : 'rgba(99,102,241,0.06)',
    tooltipStyle: {
      borderRadius: 10,
      border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
      background: dark ? '#0d1322' : '#ffffff',
      color: textColor,
      fontSize: 12,
      boxShadow: '0 8px 24px -8px rgba(15,23,42,0.25)',
    },
    // Recharts colors the value line with the series' own color by default
    // (e.g. the bar's indigo), which reads poorly against a dark tooltip.
    tooltipItemStyle: { color: textColor },
    tooltipLabelStyle: { color: textColor, fontWeight: 600, marginBottom: 2 },
  }
}
