import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import C from '../theme/colors';
import {
  fmt,
  fmtInput,
  stripCommas,
  toKRW,
  todayStr,
  genId,
  USD_TO_KRW
} from '../utils/format';
import { useItemStore } from '../store/useItemStore';
import Label from '../components/Label';
import Field from '../components/Field';
import Btn from '../components/Btn';
import CategoryPicker from '../components/CategoryPicker';
import DropPicker from '../components/DropPicker';
import PriceField from '../components/PriceField';

const BUY_FROM_OPTIONS = ['번개장터', '후르츠패밀리', 'ebay', '메루카리', 'Grailed'];

export function AddItemScreen() {
  const addItem = useItemStore((state) => state.addItem);

  const blank = {
    buyDate: todayStr(),
    name: '',
    buyFrom: '',
    buyPrice: '',
    buyCurrency: 'KRW',
    category: '',
    costWash: '',
    costRepair: '',
    costShip: '',
    costDuty: '',
    sellerName: '',
    sellerPhone: '',
    sellerTrackingNum: '',
    isReceived: false,
  };
  const [form, setForm] = useState(blank);
  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { Alert.alert('⚠️', '상품명을 입력해주세요.'); return; }
    if (!form.buyPrice) { Alert.alert('⚠️', '매입가를 입력해주세요.'); return; }

    const buyPriceKRW = toKRW(form.buyPrice, form.buyCurrency);
    const extraCostKRW = (Number(form.costWash) || 0) +
      (Number(form.costRepair) || 0) +
      (Number(form.costShip) || 0) +
      (Number(form.costDuty) || 0);
    const totalCostKRW = buyPriceKRW + extraCostKRW;

    const newItem = {
      id: genId(),
      ...form,
      totalCost: totalCostKRW,
      status: 'selling',
      soldDate: '', soldVia: '', soldPrice: '', soldCurrency: 'KRW',
      deliveryName: '', deliveryAddr: '', deliveryPhone: '', trackingNum: '',
    };
    await addItem(newItem);
    setForm(blank);
    Alert.alert('✅', `"${form.name}" 등록 완료!`);
  };

  const buyPriceKRW = toKRW(form.buyPrice, form.buyCurrency);
  const extraCostKRW = (Number(form.costWash) || 0) +
    (Number(form.costRepair) || 0) +
    (Number(form.costShip) || 0) +
    (Number(form.costDuty) || 0);
  const totalCostKRW = buyPriceKRW + extraCostKRW;
  const buyPriceNum = Number(form.buyPrice) || 0;
  const isUSD = form.buyCurrency === 'USD';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 60 }}>
          <Text style={styles.pageTitle}>🛍️ 상품 등록</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>기본 정보</Text>
            <Field label="구매 날짜" value={form.buyDate} onChangeText={(v) => set('buyDate', v)} placeholder="YYYY-MM-DD" />
            <Field label="상품명 *" value={form.name} onChangeText={(v) => set('name', v)} placeholder="예: 리바이스 501 청바지" />
            <DropPicker
              label="구매처"
              value={form.buyFrom}
              onChange={(v) => set('buyFrom', v)}
              options={BUY_FROM_OPTIONS}
              placeholder="구매처 선택"
            />
            <PriceField
              label="매입가"
              rawValue={form.buyPrice}
              currency={form.buyCurrency}
              onChangeRaw={(v) => set('buyPrice', v)}
              onChangeCurrency={(c) => set('buyCurrency', c)}
              required
            />
            {isUSD && buyPriceNum > 0 && (
              <View style={styles.exchangeNotice}>
                <Text style={styles.exchangeNoticeText}>
                  💱 ${buyPriceNum.toLocaleString('en-US')} → {fmt(buyPriceKRW)} 시세 적용
                </Text>
                <Text style={styles.exchangeNoticeHint}>가정 환율: $1 = {USD_TO_KRW.toLocaleString('ko-KR')}원</Text>
              </View>
            )}
            <CategoryPicker value={form.category} onChange={(v) => set('category', v)} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>추가 비용 (KRW)</Text>
            <Field label="세탁비 (원)" value={fmtInput(form.costWash, 'KRW')} onChangeText={(v) => set('costWash', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            <Field label="수선비 (원)" value={fmtInput(form.costRepair, 'KRW')} onChangeText={(v) => set('costRepair', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            <Field label="택배비 (원)" value={fmtInput(form.costShip, 'KRW')} onChangeText={(v) => set('costShip', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            {(form.buyFrom === 'ebay' || form.buyFrom === 'Grailed' || form.buyFrom === '메루카리') && (
              <Field label="관세 (원)" value={fmtInput(form.costDuty || '', 'KRW')} onChangeText={(v) => set('costDuty', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>구매 배송 및 판매자 정보</Text>
            <Field label="판매자 이름" value={form.sellerName} onChangeText={(v) => set('sellerName', v)} placeholder="예: 김철수" />
            <Field label="판매자 연락처" value={form.sellerPhone} onChangeText={(v) => set('sellerPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
            <Field label="매입 운송장 번호" value={form.sellerTrackingNum} onChangeText={(v) => set('sellerTrackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />
            <View style={styles.fieldWrap}>
              <Label>수령 상태</Label>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !form.isReceived && styles.chipActive]}
                  onPress={() => set('isReceived', false)}
                >
                  <Text style={[styles.chipText, !form.isReceived && styles.chipTextActive]}>⏳ 수령 대기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, form.isReceived && styles.chipActive]}
                  onPress={() => set('isReceived', true)}
                >
                  <Text style={[styles.chipText, form.isReceived && styles.chipTextActive]}>📦 수령 완료</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.costPreview}>
            <View>
              <Text style={styles.costPreviewLabel}>매입가{isUSD ? ' (KRW 환산)' : ''}</Text>
              <Text style={[styles.costPreviewLabel, { marginTop: 2 }]}>추가비용</Text>
              <Text style={[styles.costPreviewLabel, { marginTop: 2, color: C.gold, fontWeight: '700' }]}>총 원가 (KRW)</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.costPreviewValue}>{fmt(buyPriceKRW)}</Text>
              <Text style={[styles.costPreviewValue, { fontSize: 14, color: C.textSec }]}>+ {fmt(extraCostKRW)}</Text>
              <Text style={[styles.costPreviewValue, { color: C.gold }]}>{fmt(totalCostKRW)}</Text>
            </View>
          </View>

          <Btn label="✅ 상품 등록하기" onPress={handleSubmit} variant="primary" style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  pageTitle: { color: C.textPri, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { color: C.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  fieldWrap: { marginBottom: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  chipActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  chipText: { color: C.textSec, fontSize: 13 },
  chipTextActive: { color: C.white, fontWeight: '700' },
  exchangeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#166534' + '30',
    borderWidth: 1,
    borderColor: '#4ade80' + '60',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: -6,
    marginBottom: 8,
  },
  exchangeNoticeText: { color: '#4ade80', fontSize: 13, fontWeight: '700' },
  exchangeNoticeHint: { color: C.textMuted, fontSize: 11 },
  costPreview: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  costPreviewLabel: { color: C.textSec, fontSize: 13 },
  costPreviewValue: { color: C.gold, fontSize: 20, fontWeight: '800' },
});

export default AddItemScreen;
