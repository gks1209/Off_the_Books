// ============================================================
//  OFF THE BOOKS — 빈티지숍 장부 & 재고 관리 앱
//  Refactored Entrypoint (App.js)
// ============================================================

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StatusBar,
  StyleSheet,
  Alert,
} from 'react-native';
import * as Updates from 'expo-updates';
import { NavigationContainer } from '@react-navigation/native';

import C from './src/theme/colors';
import { useItemStore } from './src/store/useItemStore';
import RootNavigator from './src/navigation/navigation';

// ──────────────────────────────────────────────
//  App 루트
// ──────────────────────────────────────────────
export default function App() {
  const ready = useItemStore((state) => state.ready);
  const loadItems = useItemStore((state) => state.loadItems);

  // EAS Update 실시간 업데이트 감지 및 즉시 적용 제안
  const { isUpdatePending } = Updates.useUpdates();

  useEffect(() => {
    if (isUpdatePending) {
      Alert.alert(
        '✨ 업데이트 완료',
        '새로운 버전의 앱이 다운로드되었습니다. 지금 재시작하여 적용하시겠습니까?',
        [
          { text: '나중에', style: 'cancel' },
          {
            text: '지금 적용',
            style: 'default',
            onPress: () => Updates.reloadAsync()
          }
        ]
      );
    }
  }, [isUpdatePending]);

  // 첫 마운트 시 데이터 로드
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  if (!ready) {
    return (
      <View style={s.loadingScreen}>
        <Text style={s.loadingText}>📖 Off the Books</Text>
        <Text style={s.loadingSub}>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <RootNavigator />
    </NavigationContainer>
  );
}

// ──────────────────────────────────────────────
//  공통 스타일시트
// ──────────────────────────────────────────────
const s = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.accent, fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  loadingSub: { color: C.textMuted, fontSize: 14, marginTop: 8 },
});
