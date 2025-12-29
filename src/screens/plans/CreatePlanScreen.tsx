import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../theme';
import { createPlan } from '../../api/plans';

export default function CreatePlanScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState('4');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const mutation = useMutation({
    mutationFn: createPlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      navigation.goBack();
    },
    onError: (error) => {
      Alert.alert("Overlap Error", (error as Error).message);
    }
  });

  const handleCreate = () => {
    if (!name) {
      Alert.alert("Required", "Please enter a plan name.");
      return;
    }
    const duration = parseInt(weeks);
    if (isNaN(duration) || duration < 1 || duration > 52) {
      Alert.alert("Invalid Duration", "Weeks must be between 1 and 52.");
      return;
    }

    mutation.mutate({
      name,
      description: '',
      start_date: new Date(startDate).toISOString(),
      duration_weeks: duration
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: theme.colors.primary }}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.header, { color: theme.colors.text }]}>New Workout Plan</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* NAME INPUT */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Plan Name</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          placeholder="e.g. Summer Cut"
          placeholderTextColor={theme.colors.textSecondary}
          value={name}
          onChangeText={setName}
        />

        {/* DURATION INPUT */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Duration (Weeks)</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.card }]}
          value={weeks}
          onChangeText={setWeeks}
          keyboardType="numeric"
        />

        {/* START DATE CALENDAR */}
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Start Date</Text>
        <Calendar
          current={startDate}
          onDayPress={(day: any) => setStartDate(day.dateString)}
          markedDates={{
            [startDate]: { selected: true, selectedColor: theme.colors.primary }
          }}
          theme={{
            calendarBackground: theme.colors.card,
            dayTextColor: theme.colors.text,
            monthTextColor: theme.colors.text,
            arrowColor: theme.colors.primary,
          }}
          style={{ borderRadius: 12, marginBottom: 24 }}
        />

        {/* CREATE BUTTON */}
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreate}
          disabled={mutation.isPending}
        >
          <Text style={styles.buttonText}>
            {mutation.isPending ? "Validating..." : "Create Plan"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  header: { fontSize: 24, fontWeight: 'bold' },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
  createButton: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
});