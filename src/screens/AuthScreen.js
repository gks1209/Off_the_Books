import React, { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import C from '../theme/colors';
import { useItemStore } from '../store/useItemStore';
import Field from '../components/Field';
import Btn from '../components/Btn';

export function AuthScreen() {
  const login = useItemStore((state) => state.login);
  const register = useItemStore((state) => state.register);

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('⚠️', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (!isLogin) {
      const trimmedConfirmPassword = confirmPassword.trim();
      if (!trimmedConfirmPassword) {
        Alert.alert('⚠️', '비밀번호 확인을 입력해주세요.');
        return;
      }
      if (trimmedPassword !== trimmedConfirmPassword) {
        Alert.alert('⚠️', '비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    setLoading(true);
    let result;

    if (isLogin) {
      result = await login(trimmedEmail, trimmedPassword);
    } else {
      result = await register(trimmedEmail, trimmedPassword);
    }

    setLoading(false);

    if (result && !result.success) {
      Alert.alert('인증 실패', result.error || '이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setConfirmPassword('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brandEmoji}>📖</Text>
            <Text style={styles.brandTitle}>Off the Books</Text>
            <Text style={styles.brandSubtitle}>빈티지숍 장부 & 재고 관리</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{isLogin ? '로그인' : '회원가입'}</Text>

            <Field
              label="이메일 주소"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Field
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력해주세요"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            {!isLogin && (
              <Field
                label="비밀번호 확인"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="비밀번호를 다시 한번 입력해주세요"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}

            {loading ? (
              <ActivityIndicator size="large" color={C.accent} style={{ marginVertical: 15 }} />
            ) : (
              <Btn
                label={isLogin ? '로그인하기' : '회원가입하기'}
                onPress={handleAuth}
                variant="primary"
                style={styles.submitBtn}
              />
            )}

            <TouchableOpacity
              style={styles.toggleBtn}
              onPress={toggleMode}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleBtnText}>
                {isLogin
                  ? '아직 계정이 없으신가요? 회원가입하기'
                  : '이미 계정이 있으신가요? 로그인하기'}
              </Text>
            </TouchableOpacity>
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
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brandEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  brandTitle: {
    color: C.textPri,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: C.textSec,
    fontSize: 14,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: C.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    padding: 24,
  },
  formTitle: {
    color: C.textPri,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: 10,
    paddingVertical: 15,
  },
  toggleBtn: {
    marginTop: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnText: {
    color: C.textSec,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default AuthScreen;
