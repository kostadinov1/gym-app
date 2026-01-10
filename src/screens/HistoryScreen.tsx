import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../theme';
import { getHistory } from '../api/history';

export default function HistoryScreen() {
  const theme = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // 1. Calculate Date Range (Simplification for V1)
  const startDate = '2025-01-01T00:00:00Z'; 
  const endDate = '2025-12-31T23:59:59Z';

  // 2. Fetch Data
  const { data, isLoading } = useQuery({
    queryKey: ['history'], 
    queryFn: () => getHistory(startDate, endDate),
  });

  // 3. Transform Data for Calendar
  const markedDates = useMemo(() => {
    if (!data) return {};
    const marks: any = {};
    
    data.forEach(session => {
      const dateKey = session.date.split('T')[0];
      marks[dateKey] = {
        marked: true,
        dotColor: theme.colors.primary // Use theme color for dots
      };
    });

    // Add selected indicator
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: theme.colors.primary,
      disableTouchEvent: true
    };
    
    return marks;
  }, [data, selectedDate, theme]); // Re-calculate when theme changes

  // 4. Filter list for selected day
  const dailySessions = useMemo(() => {
    if (!data) return [];
    return data.filter(s => s.date.startsWith(selectedDate));
  }, [data, selectedDate]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text }]}>History</Text>

      <Calendar
        // FIX 1: Force re-render when theme changes
        key={theme.mode} 
        
        current={selectedDate}
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        
        // FIX 2: Stop the size jumping (Always show 6 rows)
        hideExtraDays={false} 
        
        // Theme Configuration
        theme={{
          calendarBackground: theme.colors.card,
          textSectionTitleColor: theme.colors.textSecondary,
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: theme.colors.primary,
          dayTextColor: theme.colors.text,
          textDisabledColor: theme.colors.border, // For the "extra days"
          dotColor: theme.colors.primary,
          selectedDotColor: '#ffffff',
          arrowColor: theme.colors.primary,
          monthTextColor: theme.colors.text,
          indicatorColor: theme.colors.primary,
        }}
        
        // Optional: Style the container for shadows/borders
        style={{
            borderRadius: 12,
            marginHorizontal: 16,
            elevation: 2,
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
            overflow: 'hidden' // Ensures background color clips corners
        }}
      />

      <View style={styles.listContainer}>
        <Text style={[styles.subHeader, { color: theme.colors.textSecondary }]}>
          Workouts on {selectedDate}
        </Text>
        
        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : (
          <FlatList
            data={dailySessions}
            keyExtractor={item => item.id}
            ListEmptyComponent={
              <Text style={{ color: theme.colors.textSecondary, marginTop: 20 }}>No workouts logged.</Text>
            }
            renderItem={({ item }) => (
              <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
                  {item.routine_name}
                </Text>
                <Text style={{ color: theme.colors.textSecondary }}>
                   {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   {' • '}
                   {item.status}
                </Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 28, fontWeight: 'bold', margin: 16 },
  listContainer: { flex: 1, padding: 16 },
  subHeader: { fontSize: 16, marginBottom: 12, fontWeight: '600' },
  card: { padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 }
});