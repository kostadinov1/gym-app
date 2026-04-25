import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, Copy } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

import { FAB } from '../components/common/FAB';
import { useTheme } from '../theme';
import { useStorage } from '../context/StorageContext';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { Badge } from '../components/ui/Badge';

const MUSCLE_GROUPS = ['arms', 'back', 'calves', 'chest', 'core', 'full_body', 'glutes', 'hamstrings', 'legs', 'quadriceps', 'shoulders'];
const EXERCISE_TYPES = ['compound', 'isolation', 'cardio', 'functional', 'isometric', 'plyometric'];
const EQUIPMENT_TYPES = ['barbell', 'dumbbell', 'bodyweight', 'cable', 'machine', 'assisted_machine', 'kettlebell', 'ez_bar'];

const toLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function ChipSelector({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.chipRow}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.colors.primary : theme.colors.background,
                borderColor: active ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.chipLabel, { color: active ? '#fff' : theme.colors.textSecondary }]}>
              {toLabel(opt)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function ExerciseListScreen() {
  const theme = useTheme();
  const db = useStorage();
  const queryClient = useQueryClient();

  const [isModalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'custom' | 'system'>('all');
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('chest');
  const [exerciseType, setExerciseType] = useState('compound');
  const [equipmentType, setEquipmentType] = useState('barbell');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchText]);

  const normalizedSearch = debouncedSearch.trim();
  const backendQuery = normalizedSearch.length >= 2 ? normalizedSearch : undefined;

  const { data, isLoading } = useQuery({
    queryKey: ['exercises', backendQuery, libraryFilter],
    queryFn: () =>
      db.getExercisesFiltered({
        q: backendQuery,
        is_system: libraryFilter === 'all' ? undefined : libraryFilter === 'system',
      }),
    placeholderData: keepPreviousData,
  });

  const filteredData = useMemo(() => data || [], [data]);

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setName('');
    setMuscleGroup('chest');
    setExerciseType('compound');
    setEquipmentType('barbell');
  };

  const refetchExercises = () => queryClient.invalidateQueries({ queryKey: ['exercises'] });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) => db.updateExercise(payload.id, payload.data),
    onSuccess: () => {
      closeModal();
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Exercise updated successfully', position: 'top' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: (err as Error).message, position: 'top' });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof db.createExercise>[0]) => db.createExercise(data),
    onSuccess: () => {
      closeModal();
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Created', text2: 'New exercise added to your library', position: 'top' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Creation Failed', text2: (err as Error).message, position: 'top' });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (id: string) => {
      setCopyingId(id);
      return db.copyExercise(id);
    },
    onSuccess: () => {
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Copied', text2: 'Template copied to your custom library', position: 'top' });
    },
    onSettled: () => {
      setCopyingId(null);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Copy Failed', text2: (err as Error).message, position: 'top' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.deleteExercise(id),
    onSuccess: () => {
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Deleted', text2: 'Exercise removed successfully', position: 'top' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Cannot Delete Exercise', text2: (err as Error).message, position: 'top' });
    },
  });

  const handleEditPress = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
    setMuscleGroup(item.primary_muscle_group || 'chest');
    setExerciseType(item.exercise_type || 'compound');
    setEquipmentType(item.equipment_type || 'barbell');
    setModalVisible(true);
  };

  const handleDelete = (id: string, exName: string) => {
    Alert.alert('Delete Exercise', `Are you sure you want to delete "${exName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        data: {
          name: name.trim(),
          primary_muscle_group: muscleGroup,
          exercise_type: exerciseType,
          equipment_type: equipmentType,
        },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        primary_muscle_group: muscleGroup,
        exercise_type: exerciseType,
        movement_pattern: '',
        equipment_type: equipmentType,
        default_increment: 0,
        unit: 'kg',
      });
    }
  };

  if (isLoading && !data) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaView edges={[]} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader title="Exercise Library" />

      <View style={styles.searchWrapper}>
        <SearchInput
          value={searchText}
          onChangeText={setSearchText}
          onClear={() => setSearchText('')}
          placeholder="Search by name, muscle, type…"
        />
      </View>

      <View style={styles.segmentRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'custom', label: 'Custom' },
          { key: 'system', label: 'System' },
        ].map((item) => {
          const active = libraryFilter === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setLibraryFilter(item.key as 'all' | 'custom' | 'system')}
              style={[
                styles.segmentBtn,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: active ? theme.colors.primary : theme.colors.card,
                },
              ]}
            >
              <Text style={{ color: active ? 'white' : theme.colors.textSecondary, fontWeight: '600' }}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
                {item.is_custom && <Badge label="CUSTOM" variant="primary" />}
              </View>
              <Text style={[styles.metaLine, { color: theme.colors.textSecondary }]}>
                {[item.primary_muscle_group, item.exercise_type, item.equipment_type]
                  .filter(Boolean)
                  .map(toLabel)
                  .join(' · ')}
              </Text>
            </View>

            {item.is_custom ? (
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <TouchableOpacity onPress={() => handleEditPress(item)}>
                  <Pencil size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                  <Trash2 size={22} color={theme.colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => copyMutation.mutate(item.id)}
                disabled={copyMutation.isPending && copyingId === item.id}
              >
                {copyMutation.isPending && copyingId === item.id ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Copy size={22} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <FAB
        onPress={() => {
          setEditingId(null);
          setName('');
          setMuscleGroup('chest');
          setExerciseType('compound');
          setEquipmentType('barbell');
          setModalVisible(true);
        }}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalOverlay} onPress={closeModal}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.modalHeader, { color: theme.colors.text }]}>
                  {editingId ? 'Edit Exercise' : 'New Exercise'}
                </Text>

                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
                  placeholder="Name (e.g. Squat)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoFocus={!editingId}
                />

                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Muscle Group</Text>
                  <ChipSelector options={MUSCLE_GROUPS} value={muscleGroup} onChange={setMuscleGroup} />

                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Type</Text>
                  <ChipSelector options={EXERCISE_TYPES} value={exerciseType} onChange={setExerciseType} />

                  <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Equipment</Text>
                  <ChipSelector options={EQUIPMENT_TYPES} value={equipmentType} onChange={setEquipmentType} />
                </ScrollView>

                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={closeModal}>
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 16 }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleSave}>
                    <Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 16 }}>
                      {editingId ? 'Update' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  searchWrapper: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12, paddingHorizontal: 16 },
  segmentBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  metaLine: { fontSize: 12, marginTop: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { borderRadius: 12, padding: 24, maxHeight: '85%' },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  chipLabel: { fontSize: 13, fontWeight: '500' },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
