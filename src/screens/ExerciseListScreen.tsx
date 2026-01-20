import React, { useState, useMemo } from 'react';
import {
  StyleSheet, View, Text, FlatList, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
// ---  Added updateExercise to imports ---
import { getExercises, createExercise, deleteExercise, updateExercise } from '../api/exercises';
import { FAB } from '../components/common/FAB';
import Toast from 'react-native-toast-message'; 
import { Ionicons } from '@expo/vector-icons';

export default function ExerciseListScreen() {
  const theme = useTheme();
  const [isModalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  // ---  State to track which ID we are editing (null = Create Mode) ---
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');

  // 1. Fetch Exercises
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exercises'],
    queryFn: getExercises,
  });

  // 2. Search Logic
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (!searchText) return data;
    return data.filter(ex =>
      ex.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [data, searchText]);

  // ---  Helper to close modal and reset form ---
  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null); 
    setName('');
  };




  // ---  Update Mutation ---
  const updateMutation = useMutation({
    mutationFn: (data: { id: string, payload: any }) => updateExercise(data.id, data.payload),
    onSuccess: () => {
      closeModal();
      refetch();
      // --- ADD TOAST ---
      Toast.show({
        type: 'success',
        text1: 'Updated',
        text2: 'Exercise name updated successfully'
      });
    },
    onError: (err) => {
        // --- ADD ERROR TOAST ---
        Toast.show({ type: 'error', text1: 'Update Failed', text2: (err as Error).message });
    }
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: createExercise,
    onSuccess: () => {
      closeModal();
      refetch();
      // --- ADD TOAST ---
      Toast.show({
        type: 'success',
        text1: 'Created',
        text2: 'New exercise added to library'
      });
    },
    onError: (err) => {
        Toast.show({ type: 'error', text1: 'Creation Failed', text2: (err as Error).message });
    }
  });
  
  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deleteExercise,
    onSuccess: () => {
      refetch();
      // --- ADD THIS SUCCESS TOAST ---
      Toast.show({
        type: 'success',
        text1: 'Deleted',
        text2: 'Exercise removed successfully'
      });
    },
    onError: (err) => {
        // --- REPLACE ALERT WITH TOAST ---
        Toast.show({
            type: 'error',
            text1: 'Cannot Delete Exercise',
            text2: 'It is currently used in a Plan or History.'
        });
    }
  });

  // ---  Handle "Edit" Press ---
  const handleEditPress = (item: any) => {
    setEditingId(item.id);               
    setName(item.name);                  
    setModalVisible(true);               
  };

  const handleDelete = (id: string, exName: string) => {
    Alert.alert(
      "Delete Exercise",
      `Are you sure you want to delete "${exName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMutation.mutate(id) }
      ]
    );
  };

  // ---  Handle Save (Decides between Create or Update) ---
const handleSave = () => {
    if (!name) return;

    if (editingId) {
      // 1. UPDATE MODE
      updateMutation.mutate({
        id: editingId,
        payload: {
          name,
          default_increment: 0
        }
      });
    } else {
      // 2. CREATE MODE (This was missing!)
      createMutation.mutate({
        name,
        default_increment: 0,
        unit: 'kg'
      });
    }
  };

  if (isLoading) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.header, { color: theme.colors.text }]}>Exercise Library</Text>

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.inputBackground }]}>
        <Text style={{ fontSize: 18, marginRight: 8 }}>🔍</Text>
        <TextInput
          style={{ flex: 1, color: theme.colors.text, fontSize: 16 }}
          placeholder="Search exercises..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Text style={{ color: theme.colors.textSecondary }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{item.name}</Text>
                {item.is_custom && (
                  <View style={{ backgroundColor: theme.colors.primary, borderRadius: 4, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>CUSTOM</Text>
                  </View>
                )}
              </View>

            </View>

            {/* ACTION BUTTONS (Only for Custom) */}
          {item.is_custom && (
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <TouchableOpacity onPress={() => handleEditPress(item)}>
                <Ionicons name="create-outline" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}>
                <Ionicons name="trash-outline" size={22} color={theme.colors.error} />
              </TouchableOpacity>
            </View>
          )}
          </View>
        )}
      />

      {/* FAB - Opens Create Mode */}
      <FAB onPress={() => {
        setEditingId(null);
        setName('');
        setModalVisible(true);
      }} />

      {/* Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal} // ---  Use helper
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            {/* ---  Dynamic Header Title --- */}
            <Text style={[styles.modalHeader, { color: theme.colors.text }]}>
              {editingId ? "Edit Exercise" : "Exercise"}
            </Text>

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
                  {/* ---  Dynamic Button Label --- */}
                  {editingId ? "Update" : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { fontSize: 13, marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: { color: 'white', fontSize: 32, marginTop: -4 },
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
    marginTop: 8
  },
});