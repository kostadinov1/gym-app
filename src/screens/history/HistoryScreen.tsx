import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { TrendingUp, Calendar as CalendarIcon } from 'lucide-react-native';

import { useTheme } from '../../theme';
import { useStorage } from '../../context/StorageContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { IconButton } from '../../components/ui/IconButton';
import { SectionTitle } from '../../components/ui/SectionTitle';

export default function HistoryScreen() {
  const theme = useTheme();
  const db = useStorage();
  const navigation = useNavigation<any>();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const currentYear = new Date().getFullYear();
  const startDate = `${currentYear - 1}-01-01T00:00:00Z`;
  const endDate = `${currentYear + 1}-12-31T23:59:59Z`;

  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => db.getHistory(startDate, endDate),
  });

  const markedDates = useMemo(() => {
    if (!data) return {};
    const marks: any = {};
    data.forEach(session => {
      const dateKey = session.date.split('T')[0];
      marks[dateKey] = { marked: true, dotColor: theme.colors.primary };
    });
    marks[selectedDate] = {
      ...marks[selectedDate],
      selected: true,
      selectedColor: theme.colors.primary,
      disableTouchEvent: true,
    };
    return marks;
  }, [data, selectedDate, theme]);

  const dailySessions = useMemo(() => {
    if (!data) return [];
    return data.filter(s => s.date.startsWith(selectedDate));
  }, [data, selectedDate]);

  return (
    <SafeAreaView edges={[]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        title="History"
        rightElement={
          <IconButton
            icon={TrendingUp}
            onPress={() => navigation.navigate('Analytics')}
            color={theme.colors.primary}
            style={{
              backgroundColor: theme.colors.primary + '20',
              padding: 8,
              borderRadius: 10,
            }}
          />
        }
      />

      <Calendar
        key={theme.mode}
        current={selectedDate}
        onDayPress={(day: any) => setSelectedDate(day.dateString)}
        markedDates={markedDates}
        hideExtraDays={false}
        theme={{
          calendarBackground: theme.colors.card,
          textSectionTitleColor: theme.colors.textSecondary,
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: '#ffffff',
          todayTextColor: theme.colors.primary,
          dayTextColor: theme.colors.text,
          textDisabledColor: theme.colors.border,
          dotColor: theme.colors.primary,
          selectedDotColor: '#ffffff',
          arrowColor: theme.colors.primary,
          monthTextColor: theme.colors.text,
          indicatorColor: theme.colors.primary,
          textDayFontSize: 13,
          textMonthFontSize: 13,
          textDayHeaderFontSize: 11,
          'stylesheet.calendar.main': {
            week: { marginTop: 2, marginBottom: 2, flexDirection: 'row', justifyContent: 'space-around' },
          },
        } as any}
        style={{
          borderRadius: 12,
          marginHorizontal: 16,
          overflow: 'hidden',
        }}
      />

      <View style={styles.listContainer}>
        <SectionTitle title={`Workouts on ${selectedDate}`} style={{ marginBottom: 12 }} />

        {isLoading ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : dailySessions.length === 0 ? (
          <View style={styles.emptyDay}>
            <CalendarIcon size={28} color={theme.colors.border} strokeWidth={1.5} />
            <Text style={[theme.typography.body, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              No workouts logged
            </Text>
          </View>
        ) : (
          <FlatList
            data={dailySessions}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => navigation.navigate('HistoryDetails', { sessionId: item.id })}
                style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[theme.typography.title, { color: theme.colors.text, marginBottom: 2 }]}>
                    {item.routine_name}
                  </Text>
                  <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                    {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' · '}
                    {item.status}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyDay: { alignItems: 'center', paddingTop: 32 },
});
