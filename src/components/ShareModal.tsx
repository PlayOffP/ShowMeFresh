import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Send, User } from 'lucide-react-native';
import { useAppContext } from '@/context/AppContext';
import { Show } from '../../hooks/useShows';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShareModalProps {
  show: Show | null;
  visible: boolean;
  onClose: () => void;
}

export function ShareModal({ show, visible, onClose }: ShareModalProps) {
  const { friends, shareShowWithFriend } = useAppContext();
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const handleShare = async () => {
    if (show && selectedFriend) {
      setIsSharing(true);
      try {
        await shareShowWithFriend(show.id, selectedFriend.id, message.trim() || undefined);
        Alert.alert(
          'Shared Successfully!', 
          `"${show.title}" has been shared with ${selectedFriend.username || selectedFriend.displayName}!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedFriend(null);
                setMessage('');
                onClose();
              }
            }
          ]
        );
      } catch (error) {
        console.error('Error sharing show:', error);
        Alert.alert(
          'Share Failed', 
          'Failed to share show. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setIsSharing(false);
      }
    }
  };

  const handleFriendSelect = (friend: any) => {
    setSelectedFriend(friend);
  };

  const handleClose = () => {
    setSelectedFriend(null);
    setMessage('');
    onClose();
  };

  if (!show) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.backdrop}>
        <View style={[
          styles.modal,
          isLandscape && styles.modalLandscape
        ]}>
          <LinearGradient
            colors={['#1A1A1A', '#2A2A2A']}
            style={styles.gradient}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Share with Friends</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Show Info */}
            <View style={styles.showInfo}>
              <Text style={styles.showTitle}>{show.title}</Text>
              <Text style={styles.showMeta}>
                {show.year} • {show.rating} • {show.duration}
              </Text>
            </View>

            {/* Friends List */}
            <View style={styles.friendsSection}>
              <Text style={styles.sectionTitle}>Select a friend</Text>
              <ScrollView 
                style={styles.friendsList}
                showsVerticalScrollIndicator={false}
              >
                {friends.length === 0 ? (
                  <View style={styles.emptyState}>
                    <User size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.emptyText}>No friends yet</Text>
                    <Text style={styles.emptySubtext}>
                      Add friends to share shows with them
                    </Text>
                  </View>
                ) : (
                  friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={[
                        styles.friendItem,
                        selectedFriend?.id === friend.id && styles.selectedFriend
                      ]}
                      onPress={() => handleFriendSelect(friend)}
                    >
                      <View style={styles.friendAvatar}>
                        <User size={20} color="#fff" />
                      </View>
                      <View style={styles.friendInfo}>
                        <Text style={styles.friendName}>
                          @{friend.username || friend.displayName}
                        </Text>
                        <Text style={styles.friendStatus}>
                          {friend.email}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Message Input */}
            {selectedFriend && (
              <View style={styles.messageSection}>
                <Text style={styles.sectionTitle}>
                  Add a message (optional)
                </Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder="Tell them why they should watch this..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={200}
                />
                <Text style={styles.charCount}>
                  {message.length}/200
                </Text>
              </View>
            )}

            {/* Share Button */}
            <TouchableOpacity
              style={[
                styles.shareButton,
                (!selectedFriend || isSharing) && styles.shareButtonDisabled
              ]}
              onPress={handleShare}
              disabled={!selectedFriend || isSharing}
            >
              {isSharing ? (
                <Text style={styles.shareButtonText}>Sharing...</Text>
              ) : (
                <>
                  <Send size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>
                    Share with {selectedFriend?.username || selectedFriend?.displayName || 'Friend'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalLandscape: {
    width: '70%',
    maxWidth: 600,
    maxHeight: '90%',
  },
  gradient: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    padding: 4,
  },
  showInfo: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  showTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Inter-Bold',
  },
  showMeta: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  friendsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold',
  },
  friendsList: {
    maxHeight: 200,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  selectedFriend: {
    backgroundColor: 'rgba(255,0,80,0.2)',
    borderWidth: 1,
    borderColor: '#FF0050',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'Inter-SemiBold',
  },
  friendStatus: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  messageSection: {
    marginBottom: 20,
  },
  messageInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    fontFamily: 'Inter-Regular',
  },
  charCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0050',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  shareButtonDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter-Bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
}); 