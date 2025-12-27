// Single source of truth for design
export const theme = {
  colors: {
    primary: '#007AFF', // Classic Blue
    background: '#f2f2f7', // iOS Light Gray
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#666666',
    error: '#ff3b30',
    border: '#e5e5ea',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
  },
  borderRadius: {
    s: 4,
    m: 8,
    l: 12,
  },
  text: {
    header: {
      fontSize: 24,
      fontWeight: '700' as const,
    },
    title: {
      fontSize: 17,
      fontWeight: '600' as const,
    },
    body: {
      fontSize: 15,
      fontWeight: '400' as const,
    },
  },
};