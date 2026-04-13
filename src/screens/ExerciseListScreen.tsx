import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  const normalizedSearch = debouncedSearch.trim();
  const backendQuery = normalizedSearch.length >= 2 ? normalizedSearch : undefined;

  const { data, isLoading, isFetching } = useQuery({
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
  };

  const refetchExercises = () => queryClient.invalidateQueries({ queryKey: ['exercises'] });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; data: any }) => db.updateExercise(payload.id, payload.data),
    onSuccess: () => {
      closeModal();
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Exercise updated successfully' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Update Failed', text2: (err as Error).message });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof db.createExercise>[0]) => db.createExercise(data),
    onSuccess: () => {
      closeModal();
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Created', text2: 'New exercise added to your library' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Creation Failed', text2: (err as Error).message });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (id: string) => {
      setCopyingId(id);
      return db.copyExercise(id);
    },
    onSuccess: () => {
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Copied', text2: 'Template copied to your custom library' });
    },
    onSettled: () => {
      setCopyingId(null);
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Copy Failed', text2: (err as Error).message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => db.deleteExercise(id),
    onSuccess: () => {
      refetchExercises();
      Toast.show({ type: 'success', text1: 'Deleted', text2: 'Exercise removed successfully' });
    },
    onError: (err) => {
      Toast.show({ type: 'error', text1: 'Cannot Delete Exercise', text2: (err as Error).message });
    },
  });

  const handleEditPress = (item: any) => {
    setEditingId(item.id);
    setName(item.name);
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
      updateMutation.mutate({ id: editingId, data: { name: name.trim() } });
    } else {
      createMutation.mutate({
        name: name.trim(),
        default_increment: 0,
        unit: 'kg',
      });
    }
  };

  if (isLoading && !data) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}> 
      <Text style={[styles.header, { color: theme.colors.text }]}>Exercise Library</Text>

      <View style={[styles.searchContainer, { backgroundColor: theme.colors.inputBackground }]}> 
        <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}
          placeholder="Search by name, tags, aliases, type, muscle..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {isFetching && <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginRight: 8 }} />}
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={{ color: theme.colors.textSecondary }}>✕</Text>
          </TouchableOpacity>
        )}
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
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}> 
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
                {item.is_custom ? (
                  <View style={{ backgroundColor: theme.colors.primary, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>CUSTOM</Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: theme.colors.success, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>SYSTEM</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.metaLine, { color: theme.colors.textSecondary }]}>
                {item.primary_muscle_group} • {item.exercise_type} • {item.equipment_type}
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
          setModalVisible(true);
        }}
      />

      <Modal visible={isModalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}> 
            <Text style={[styles.modalHeader, { color: theme.colors.text }]}>{editingId ? 'Edit Exercise' : 'Exercise'}</Text>

            <TextInput
              style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
              placeholder="Name (e.g. Squat)"
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={setName}
            />

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
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingHorizontal: 16 },
  header: { fontSize: 28, fontWeight: 'bold', marginVertical: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
  metaLine: { fontSize: 12, marginTop: 4, textTransform: 'capitalize' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { borderRadius: 12, padding: 24 },
  modalHeader: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    marginTop: 8,
  },
});
