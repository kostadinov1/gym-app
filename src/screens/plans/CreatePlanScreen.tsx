import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../../theme';
import { useStorage } from '../../context/StorageContext';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PinnedFooter } from '../../components/ui/PinnedFooter';
import { PrimaryButton } from '../../components/ui/PrimaryButton';
import {
  buildCalendarTheme, CALENDAR_STYLE,
  buildPeriodMarks, planColor, parseLocalDate, dateKey,
} from '../../utils/calendarTheme';

export default function CreatePlanScreen() {
  const theme = useTheme();
  const db = useStorage();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: existingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => db.getPlans(),
  });

  const previewEndDate = useMemo(() => {
    const duration = parseInt(weeks);
    if (isNaN(duration) || duration < 1) return null;
    const start = parseLocalDate(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration * 7 - 1);
    return dateKey(end);
  }, [startDate, weeks]);

  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    if (existingPlans?.length) {
      Object.assign(marks, buildPeriodMarks(existingPlans, p => planColor(p.id)));
    }
    if (previewEndDate) {
      Object.assign(marks, buildPeriodMarks(
        [{ id: 'preview', start_date: startDate, end_date: previewEndDate }],
        () => theme.colors.primary,
      ));
    }
    return marks;
  }, [existingPlans, startDate, previewEndDate, theme.colors.primary]);

  const mutation = useMutation({
    mutationFn: (data: Parameters<typeof db.createPlan>[0]) => db.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert('Overlap Error', (error as Error).message);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter a plan name.');
      return;
    }
    const duration = parseInt(weeks);
    if (isNaN(duration) || duration < 1 || duration > 52) {
      Alert.alert('Invalid Duration', 'Weeks must be between 1 and 52.');
      return;
    }
    mutation.mutate({
      name: name.trim(),
      description: '',
      start_date: startDate,
      duration_weeks: duration,
    });
  };

  const inputStyle = [
    styles.input,
    { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
  ];

  return (
    <SafeAreaView edges={[]} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="New Plan" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[theme.typography.label, styles.label, { color: theme.colors.textSecondary }]}>
            Plan Name
          </Text>
          <TextInput
            style={inputStyle}
            placeholder="e.g. Summer Cut"
            placeholderTextColor={theme.colors.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={[theme.typography.label, styles.label, { color: theme.colors.textSecondary }]}>
            Duration (Weeks)
          </Text>
          <TextInput
            style={inputStyle}
            value={weeks}
            onChangeText={setWeeks}
            keyboardType="numeric"
          />

          <View style={styles.dateRow}>
            <Text style={[theme.typography.label, styles.label, { color: theme.colors.textSecondary }]}>
              Start Date
            </Text>
            {previewEndDate && (
              <Text style={[theme.typography.caption, { color: theme.colors.textSecondary }]}>
                ends {new Date(previewEndDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
          </View>
          <Calendar
            key={theme.mode}
            markingType="period"
            current={startDate}
            onDayPress={(day: any) => setStartDate(day.dateString)}
            markedDates={markedDates}
            hideExtraDays={false}
            theme={buildCalendarTheme(theme.colors) as any}
            style={[CALENDAR_STYLE, { marginHorizontal: 0 }]}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <PinnedFooter>
        <PrimaryButton
          label="Create Plan"
          onPress={handleCreate}
          loading={mutation.isPending}
        />
      </PinnedFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 24 },
  label: { marginBottom: 8, marginTop: 20 },
  dateRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
