import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import C from '../theme/colors';
import { useItemStore } from '../store/useItemStore';
import exchangeRateService from '../services/exchangeRate';
import Field from '../components/Field';
import Btn from '../components/Btn';

export function SettingsScreen() {
  const logout = useItemStore((state) => state.logout);
  const updateExchangeRateSettings = useItemStore((state) => state.updateExchangeRateSettings);
  const exchangeRate = useItemStore((state) => state.exchangeRate);

  const [isManual, setIsManual] = useState(false);
  const [manualRateInput, setManualRateInput] = useState('1500');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    rate: 1500,
    timestamp: 0,
    isManual: false,
    manualRate: 1500,
  });

  // Load current exchange rate settings on mount
  useEffect(() => {
    const loadConfig = async () => {
      const activeConfig = await exchangeRateService.getConfig();
      setConfig(activeConfig);
      setIsManual(activeConfig.isManual);
      setManualRateInput(String(activeConfig.manualRate));
    };
    loadConfig();
  }, [exchangeRate]);

  const handleSave = async () => {
    const parsedRate = Number(manualRateInput);
    if (isNaN(parsedRate) || parsedRate <= 0) {
      Alert.alert('⚠️', '올바른 환율 숫자를 입력해주세요. (예: 1350)');
      return;
    }

    setLoading(true);
    await updateExchangeRateSettings(parsedRate, isManual);
    const activeConfig = await exchangeRateService.getConfig();
    setConfig(activeConfig);
    setLoading(false);
    Alert.alert('✅', '환율 설정이 저장되었어요.');
  };

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const getFormattedDate = (timestamp) => {
    if (!timestamp) return '기록 없음';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
      date.getMinutes()
    ).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.pageTitle}>⚙️ 설정</Text>

          {/* 환율 세팅 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💱 환율 설정 (USD ➡️ KRW)</Text>
            
            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>현재 적용 환율</Text>
              <Text style={styles.statusValue}>$1 = {exchangeRate.toLocaleString('ko-KR')}원</Text>
              <Text style={styles.statusSub}>
                구분: {config.isManual ? '수동 고정' : '실시간 API 자동 연동'}{'\n'}
                마지막 업데이트: {getFormattedDate(config.timestamp)}
              </Text>
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.switchLabel}>수동 환율 지정</Text>
                <Text style={styles.switchDesc}>활성화 시 직접 입력한 고정 환율이 반영됩니다.</Text>
              </View>
              <Switch
                value={isManual}
                onValueChange={setIsManual}
                trackColor={{ false: C.border, true: C.accent }}
                thumbColor={isManual ? C.surface : C.textSec}
              />
            </View>

            {isManual && (
              <Field
                label="지정 환율 (원)"
                value={manualRateInput}
                onChangeText={setManualRateInput}
                keyboardType="numeric"
                placeholder="1500"
              />
            )}

            <Btn
              label={loading ? '저장 중...' : '환율 설정 적용'}
              onPress={handleSave}
              variant="primary"
              style={styles.saveBtn}
              disabled={loading}
            />
          </View>

          {/* 계정 관리 섹션 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 계정 관리</Text>
            <View style={styles.logoutCard}>
              <Text style={styles.logoutText}>장부 관리 앱에서 안전하게 로그아웃하고 로컬 데이터를 비웁니다.</Text>
              <Btn
                label="로그아웃"
                onPress={handleLogout}
                variant="danger"
                style={styles.logoutBtn}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pageTitle: {
    color: C.textPri,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 24,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: C.textPri,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  statusBox: {
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusLabel: {
    color: C.textSec,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusValue: {
    color: C.accent,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  statusSub: {
    color: C.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 14,
  },
  switchLabel: {
    color: C.textPri,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  switchDesc: {
    color: C.textSec,
    fontSize: 12,
    lineHeight: 16,
  },
  saveBtn: {
    marginTop: 10,
  },
  logoutCard: {
    paddingVertical: 4,
  },
  logoutText: {
    color: C.textSec,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  logoutBtn: {
    paddingVertical: 12,
  },
});

export default SettingsScreen;
