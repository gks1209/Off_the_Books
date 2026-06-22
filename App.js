// ============================================================
//  OFF THE BOOKS — 빈티지샵 장부 & 재고 관리 앱
//  단일 파일 (App.js) — Expo + AsyncStorage
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';

const { width } = Dimensions.get('window');

// ──────────────────────────────────────────────
//  백엔드 API 설정
// ──────────────────────────────────────────────
//  - iOS 시뮬레이터: 'http://localhost:5000'
//  - Android 에뮬레이터: 'http://10.0.2.2:5000'
//  - 실기기 테스트: 본인 컴퓨터의 로컬 IP (예: 'http://192.168.0.X:5000')
const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';


// ──────────────────────────────────────────────
//  색상 토큰
// ──────────────────────────────────────────────
const C = {
  bg: '#0F0E17',
  surface: '#1A1924',
  card: '#222131',
  border: '#2E2D40',
  accent: '#A78BFA',
  accentDim: '#7C5CCC',
  gold: '#F4BE7C',
  green: '#6EE7B7',
  red: '#F87171',
  blue: '#38BDF8',
  textPri: '#F0EEF9',
  textSec: '#9390AC',
  textMuted: '#5A5870',
  white: '#FFFFFF',
};

// ──────────────────────────────────────────────
//  AsyncStorage 키
// ──────────────────────────────────────────────
const STORAGE_KEY = '@off_the_books_items_v2';

// ──────────────────────────────────────────────
//  유틸
// ──────────────────────────────────────────────
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// currency: 'KRW' | 'USD'
const fmt = (n, currency = 'KRW') => {
  const num = Number(n) || 0;
  if (currency === 'USD') {
    return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return num.toLocaleString('ko-KR') + '원';
};

// 숫자 문자열에서 콤마를 제거하고 순수 숫자만 반환
const stripCommas = (v) => v.replace(/,/g, '');

// KRW 입력값을 콤마 포맷으로 변환 (입력 중)
const fmtInput = (raw, currency) => {
  const digits = stripCommas(raw).replace(/[^0-9.]/g, '');
  if (!digits) return '';
  if (currency === 'USD') return digits;
  const num = parseInt(digits, 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('ko-KR');
};

// ──────────────────────────────────────────────
//  환율 (가정 고정값)
// ──────────────────────────────────────────────
const USD_TO_KRW = 1500; // 1 USD = 1,500 KRW (고정 가정값)

// 금액을 KRW로 환산 (이미 KRW면 그대로)
const toKRW = (amount, currency = 'KRW') => {
  const n = Number(amount) || 0;
  return currency === 'USD' ? Math.round(n * USD_TO_KRW) : n;
};

// 아이템의 총 원가를 KRW 기준으로 계산
const calcCostKRW = (item) => {
  if (item.totalCost !== undefined && item.totalCost !== null) {
    return Number(item.totalCost);
  }
  return toKRW(item.buyPrice, item.buyCurrency || 'KRW') +
    (Number(item.costWash) || 0) +
    (Number(item.costRepair) || 0) +
    (Number(item.costShip) || 0) +
    (Number(item.costDuty) || 0);
};

const todayStr = () => {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const isSameMonth = (dateStr) => {
  if (!dateStr) return false;
  const now = new Date();
  const d = new Date(dateStr);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
};

const CATEGORIES = ['상의', '하의', '아우터', '가방', '신발', '악세서리', '기타'];

// ──────────────────────────────────────────────
//  공용 컴포넌트
// ──────────────────────────────────────────────
const Label = ({ children }) => <Text style={s.label}>{children}</Text>;

const Field = ({ label, value, onChangeText, placeholder, keyboardType, multiline }) => (
  <View style={s.fieldWrap}>
    {label ? <Label>{label}</Label> : null}
    <TextInput
      style={[s.input, multiline && { height: 80, textAlignVertical: 'top' }]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || ''}
      placeholderTextColor={C.textMuted}
      keyboardType={keyboardType || 'default'}
      multiline={multiline}
    />
  </View>
);

const Btn = ({ label, onPress, variant = 'primary', style: extra }) => {
  const bg =
    variant === 'primary' ? C.accent :
      variant === 'gold' ? C.gold :
        variant === 'green' ? C.green :
          variant === 'danger' ? C.red :
            C.surface;
  const textColor =
    variant === 'ghost' ? C.textSec : C.bg;
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg }, extra]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[s.btnText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const CategoryPicker = ({ value, onChange }) => (
  <View style={s.fieldWrap}>
    <Label>카테고리</Label>
    <View style={s.chipRow}>
      {CATEGORIES.map((c) => (
        <TouchableOpacity
          key={c}
          style={[s.chip, value === c && s.chipActive]}
          onPress={() => onChange(c)}
        >
          <Text style={[s.chipText, value === c && s.chipTextActive]}>{c}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ──────────────────────────────────────────────
//  판매처 / 구매처 옵션
// ──────────────────────────────────────────────
const SELL_VIA_OPTIONS = ['번개장터', '후르츠패밀리'];
const BUY_FROM_OPTIONS = ['번개장터', '후르츠패밀리', 'ebay', '메루카리', 'Grailed'];

// ──────────────────────────────────────────────
//  드롭다운 픽커 컴포넌트
// ──────────────────────────────────────────────
const DropPicker = ({ label, value, onChange, options, placeholder }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.fieldWrap}>
      {label ? <Label>{label}</Label> : null}
      <TouchableOpacity
        style={s.dropBtn}
        onPress={() => setOpen((p) => !p)}
        activeOpacity={0.8}
      >
        <Text style={value ? s.dropBtnText : s.dropBtnPlaceholder}>
          {value || placeholder || '선택하세요'}
        </Text>
        <Text style={s.dropArrow}>{open ? '▴' : '▾'}</Text>
      </TouchableOpacity>
      {open && (
        <View style={s.dropList}>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[s.dropItem, value === opt && s.dropItemActive]}
              onPress={() => { onChange(opt); setOpen(false); }}
            >
              <Text style={[s.dropItemText, value === opt && s.dropItemTextActive]}>{opt}</Text>
              {value === opt && <Text style={{ color: C.accent, fontSize: 14 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────
//  가격 입력 필드 (KRW / USD 토글 + 콤마 포맷)
// ──────────────────────────────────────────────
const PriceField = ({ label, rawValue, currency, onChangeRaw, onChangeCurrency, required }) => {
  // 표시용: 이미 fmtInput으로 포맷된 문자열을 보여줌
  const handleChange = (text) => {
    const clean = stripCommas(text).replace(/[^0-9.]/g, '');
    onChangeRaw(clean);
  };

  const displayValue = rawValue ? fmtInput(rawValue, currency) : '';
  const prefix = currency === 'USD' ? '$ ' : '';

  return (
    <View style={s.fieldWrap}>
      {label ? <Label>{label}{required ? ' *' : ''}</Label> : null}
      <View style={s.priceRow}>
        {/* KRW / USD 토글 */}
        <TouchableOpacity
          style={[s.currencyToggle, currency === 'KRW' && s.currencyToggleActive]}
          onPress={() => onChangeCurrency('KRW')}
        >
          <Text style={[s.currencyToggleText, currency === 'KRW' && s.currencyToggleTextActive]}>₩</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.currencyToggle, currency === 'USD' && s.currencyToggleActiveUSD]}
          onPress={() => onChangeCurrency('USD')}
        >
          <Text style={[s.currencyToggleText, currency === 'USD' && s.currencyToggleTextActive]}>$</Text>
        </TouchableOpacity>
        {/* 입력창 */}
        <View style={s.priceInputWrap}>
          {prefix ? <Text style={s.pricePrefix}>{prefix}</Text> : null}
          <TextInput
            style={s.priceInput}
            value={displayValue}
            onChangeText={handleChange}
            placeholder="0"
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
          />
          {currency === 'KRW' && displayValue ? (
            <Text style={s.priceSuffix}>원</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};

// ──────────────────────────────────────────────
//  화면 1: 대시보드
// ──────────────────────────────────────────────
function DashboardScreen({ items }) {
  const stats = useMemo(() => {
    const soldThisMonth = items.filter(
      (i) => i.status === 'sold' && isSameMonth(i.soldDate)
    );
    // 매출: 판매가를 KRW로 환산 합계
    const totalRevenue = soldThisMonth.reduce(
      (a, i) => a + toKRW(i.soldPrice, i.soldCurrency || 'KRW'), 0
    );
    // 원가: 매입가(USD→KRW 환산) + 추가비용(KRW)
    const totalCost = soldThisMonth.reduce((a, i) => a + calcCostKRW(i), 0);
    const netProfit = totalRevenue - totalCost;

    const unsold = items.filter((i) => i.status === 'selling');
    // 재고 총 가치: 매입가(환산) + 추가비용
    const inventoryValue = unsold.reduce((a, i) => a + calcCostKRW(i), 0);
    return { totalRevenue, netProfit, inventoryValue, unsoldCount: unsold.length, soldCount: soldThisMonth.length };
  }, [items]);

  const now = new Date();
  const monthLabel = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;

  const StatCard = ({ emoji, label, value, color }) => (
    <View style={[s.statCard, { borderColor: color + '55' }]}>
      <Text style={s.statEmoji}>{emoji}</Text>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, { color }]}>{fmt(value)}</Text>
    </View>
  );

  const recentSold = items
    .filter((i) => i.status === 'sold')
    .sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate))
    .slice(0, 5);

  return (
    <SafeAreaView style={s.safeArea}>
      <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* 헤더 */}
        <View style={s.dashHeader}>
          <Text style={s.dashBrand}>📖 Off the Books</Text>
          <Text style={s.dashMonth}>{monthLabel} 리포트</Text>
        </View>

        {/* 통계 카드 3개 */}
        <StatCard emoji="💰" label="이번 달 총 매출" value={stats.totalRevenue} color={C.gold} />
        <StatCard emoji="📈" label="이번 달 순이익" value={stats.netProfit} color={C.green} />
        <StatCard emoji="📦" label="현재 재고 총 가치" value={stats.inventoryValue} color={C.accent} />

        {/* 요약 뱃지 */}
        <View style={s.badgeRow}>
          <View style={s.badge}>
            <Text style={s.badgeNum}>{stats.unsoldCount}</Text>
            <Text style={s.badgeLabel}>판매중</Text>
          </View>
          <View style={[s.badge, { borderColor: C.green + '55' }]}>
            <Text style={[s.badgeNum, { color: C.green }]}>{stats.soldCount}</Text>
            <Text style={s.badgeLabel}>이달 판매완료</Text>
          </View>
        </View>

        {/* 최근 판매 */}
        {recentSold.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>🕐 최근 판매</Text>
            {recentSold.map((item) => (
              <View key={item.id} style={s.recentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.recentName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.recentSub}>{item.soldDate} · {item.soldVia}</Text>
                </View>
                <Text style={[s.recentPrice, { color: C.gold }]}>{fmt(item.soldPrice)}</Text>
              </View>
            ))}
          </View>
        )}

        {items.length === 0 && (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>🏷️</Text>
            <Text style={s.emptyText}>아직 등록된 상품이 없어요.</Text>
            <Text style={s.emptyHint}>하단 ＋ 버튼으로 상품을 등록해보세요!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
//  화면 2: 구매/등록
// ──────────────────────────────────────────────
function AddItemScreen({ onAdd }) {
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
    await onAdd(newItem);
    setForm(blank);
    Alert.alert('✅', `"${form.name}" 등록 완료!`);
  };

  // 매입가를 KRW로 환산한 후 추가비용과 합산
  const buyPriceKRW = toKRW(form.buyPrice, form.buyCurrency);
  const extraCostKRW = (Number(form.costWash) || 0) +
    (Number(form.costRepair) || 0) +
    (Number(form.costShip) || 0) +
    (Number(form.costDuty) || 0);
  const totalCostKRW = buyPriceKRW + extraCostKRW;
  const buyPriceNum = Number(form.buyPrice) || 0;
  const isUSD = form.buyCurrency === 'USD';

  return (
    <SafeAreaView style={s.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView style={s.screen} contentContainerStyle={{ paddingBottom: 60 }}>
          <Text style={s.pageTitle}>🛍️ 상품 등록</Text>

          <View style={s.section}>
            <Text style={s.sectionTitle}>기본 정보</Text>
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
            {/* USD 선택 시 환율 안내 멘트 */}
            {isUSD && buyPriceNum > 0 && (
              <View style={s.exchangeNotice}>
                <Text style={s.exchangeNoticeText}>
                  💱 ${buyPriceNum.toLocaleString('en-US')} → {fmt(buyPriceKRW)} 시세 적용
                </Text>
                <Text style={s.exchangeNoticeHint}>가정 환율: $1 = {USD_TO_KRW.toLocaleString('ko-KR')}원</Text>
              </View>
            )}
            <CategoryPicker value={form.category} onChange={(v) => set('category', v)} />
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>추가 비용 (KRW)</Text>
            <Field label="세탁비 (원)" value={fmtInput(form.costWash, 'KRW')} onChangeText={(v) => set('costWash', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            <Field label="수선비 (원)" value={fmtInput(form.costRepair, 'KRW')} onChangeText={(v) => set('costRepair', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            <Field label="택배비 (원)" value={fmtInput(form.costShip, 'KRW')} onChangeText={(v) => set('costShip', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            {(form.buyFrom === 'ebay' || form.buyFrom === 'Grailed' || form.buyFrom === '메루카리') && (
              <Field label="관세 (원)" value={fmtInput(form.costDuty || '', 'KRW')} onChangeText={(v) => set('costDuty', stripCommas(v))} keyboardType="numeric" placeholder="0" />
            )}
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>구매 배송 및 판매자 정보</Text>
            <Field label="판매자 이름" value={form.sellerName} onChangeText={(v) => set('sellerName', v)} placeholder="예: 김철수" />
            <Field label="판매자 연락처" value={form.sellerPhone} onChangeText={(v) => set('sellerPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
            <Field label="매입 운송장 번호" value={form.sellerTrackingNum} onChangeText={(v) => set('sellerTrackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />
            <View style={s.fieldWrap}>
              <Label>수령 상태</Label>
              <View style={s.chipRow}>
                <TouchableOpacity
                  style={[s.chip, !form.isReceived && s.chipActive]}
                  onPress={() => set('isReceived', false)}
                >
                  <Text style={[s.chipText, !form.isReceived && s.chipTextActive]}>⏳ 수령 대기</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.chip, form.isReceived && s.chipActive]}
                  onPress={() => set('isReceived', true)}
                >
                  <Text style={[s.chipText, form.isReceived && s.chipTextActive]}>📦 수령 완료</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* 총 원가 미리보기 */}
          <View style={s.costPreview}>
            <View>
              <Text style={s.costPreviewLabel}>매입가{isUSD ? ' (KRW 환산)' : ''}</Text>
              <Text style={[s.costPreviewLabel, { marginTop: 2 }]}>추가비용</Text>
              <Text style={[s.costPreviewLabel, { marginTop: 2, color: C.gold, fontWeight: '700' }]}>총 원가 (KRW)</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.costPreviewValue}>{fmt(buyPriceKRW)}</Text>
              <Text style={[s.costPreviewValue, { fontSize: 14, color: C.textSec }]}>+ {fmt(extraCostKRW)}</Text>
              <Text style={[s.costPreviewValue, { color: C.gold }]}>{fmt(totalCostKRW)}</Text>
            </View>
          </View>

          <Btn label="✅ 상품 등록하기" onPress={handleSubmit} variant="primary" style={{ marginTop: 8 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
//  화면 3: 재고 목록 (판매중)
// ──────────────────────────────────────────────
function InventoryScreen({ items, onUpdate, onDelete }) {
  const [saleTarget, setSaleTarget] = useState(null);  // 판매 모달
  const [editTarget, setEditTarget] = useState(null);  // 수정 모달
  const [confirm, setConfirm] = useState(null);        // 인앱 확인
  const [expanded, setExpanded] = useState(null);      // 확장 카드 id

  const [saleForm, setSaleForm] = useState({
    soldDate: todayStr(), soldVia: '', soldPrice: '', soldCurrency: 'KRW',
    deliveryName: '', deliveryAddr: '', deliveryPhone: '', trackingNum: '',
  });
  const [editForm, setEditForm] = useState({});

  const selling = useMemo(() =>
    items.filter((i) => i.status === 'selling')
      .sort((a, b) => new Date(b.buyDate) - new Date(a.buyDate)),
    [items]
  );

  const cost = (item) => calcCostKRW(item);

  // ── 판매 모달
  const openSale = (item) => {
    setSaleTarget(item);
    setSaleForm({
      soldDate: todayStr(), soldVia: '', soldPrice: '', soldCurrency: 'KRW',
      deliveryName: '', deliveryAddr: '', deliveryPhone: '', trackingNum: ''
    });
  };
  const setF = (k, v) => setSaleForm((p) => ({ ...p, [k]: v }));

  const handleSold = async () => {
    if (!saleForm.soldPrice) { setConfirm({ title: '⚠️', message: '판매가를 입력해주세요.', okLabel: '확인', okColor: C.accent, onOk: () => setConfirm(null) }); return; }
    const updated = { ...saleTarget, status: 'sold', ...saleForm };
    await onUpdate(updated);
    setSaleTarget(null);
  };

  // ── 수정 모달
  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      name: item.name, buyDate: item.buyDate, buyFrom: item.buyFrom || '',
      buyPrice: item.buyPrice, buyCurrency: item.buyCurrency || 'KRW',
      category: item.category || '',
      costWash: item.costWash || '', costRepair: item.costRepair || '', costShip: item.costShip || '',
      costDuty: item.costDuty || '',
      sellerName: item.sellerName || '',
      sellerPhone: item.sellerPhone || '',
      sellerTrackingNum: item.sellerTrackingNum || '',
      isReceived: !!item.isReceived,
    });
  };
  const setEF = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  const handleEditSave = async () => {
    if (!editForm.name.trim()) { setConfirm({ title: '⚠️', message: '상품명을 입력해주세요.', okLabel: '확인', okColor: C.accent, onOk: () => setConfirm(null) }); return; }
    const buyPriceKRW = toKRW(editForm.buyPrice, editForm.buyCurrency);
    const extraCostKRW = (Number(editForm.costWash) || 0) +
      (Number(editForm.costRepair) || 0) +
      (Number(editForm.costShip) || 0) +
      (Number(editForm.costDuty) || 0);
    const totalCostKRW = buyPriceKRW + extraCostKRW;

    await onUpdate({ ...editTarget, ...editForm, totalCost: totalCostKRW });
    setEditTarget(null);
  };

  const handleToggleReceived = async (item) => {
    const updated = { ...item, isReceived: !item.isReceived };
    await onUpdate(updated);
  };

  // ── 삭제
  const handleDelete = (item) => {
    setConfirm({
      title: '삭제 확인',
      message: `"​${item.name}"을(를) \n삭제할까요?`,
      okLabel: '🗑 삭제', okColor: C.red,
      onOk: () => { onDelete(item.id); setExpanded(null); setConfirm(null); },
    });
  };

  const renderItem = ({ item }) => {
    const isOpen = expanded === item.id;
    const buyCurr = item.buyCurrency || 'KRW';
    return (
      <View style={s.itemCard}>
        {/* 터치 요약 영역 */}
        <TouchableOpacity onPress={() => setExpanded(isOpen ? null : item.id)} activeOpacity={0.85}>
          <View style={s.itemCardTop}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <View style={s.categoryBadge}>
                <Text style={s.categoryBadgeText}>{item.category || '기타'}</Text>
              </View>
              <View style={[s.categoryBadge, { borderColor: item.isReceived ? C.blue + '60' : C.gold + '60', backgroundColor: item.isReceived ? C.blue + '15' : C.gold + '15' }]}>
                <Text style={[s.categoryBadgeText, { color: item.isReceived ? C.blue : C.gold }]}>
                  {item.isReceived ? '📦 수령 완료' : '⏳ 수령 대기'}
                </Text>
              </View>
            </View>
            <Text style={s.itemCardDate}>{item.buyDate}</Text>
          </View>
          <Text style={s.itemCardName} numberOfLines={1}>{item.name}</Text>
          <View style={s.itemCardBottom}>
            <View>
              <Text style={s.itemCardSub}>구매처: {item.buyFrom || '-'}</Text>
              <Text style={s.itemCardSub}>매입: {fmt(item.buyPrice, buyCurr)} | 토탈원가: {fmt(cost(item))}</Text>
            </View>
            <Text style={[s.chip, { paddingVertical: 4, borderColor: C.accent + '60' }]}>
              <Text style={{ color: C.accent, fontSize: 11 }}>상세 보기 ▾</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* 확장 영역 */}
        {isOpen && (
          <View style={s.expandedBox}>
            <Text style={s.expandedTitle}>🛍️ 구매 & 판매자 정보</Text>
            <InfoRow label="판매자 이름" value={item.sellerName} />
            <InfoRow label="판매자 연락처" value={item.sellerPhone} />
            <InfoRow label="매입 운송장" value={item.sellerTrackingNum} />
            <InfoRow label="수령 여부" value={item.isReceived ? '📦 수령 완료' : '⏳ 수령 대기'} valueColor={item.isReceived ? C.blue : C.gold} />
            {Number(item.costDuty) > 0 ? (
              <InfoRow label="관세" value={fmt(item.costDuty)} />
            ) : null}

            <View style={s.soldActionRow}>
              <TouchableOpacity
                style={[s.soldActionBtn, { borderColor: item.isReceived ? C.gold + '80' : C.blue + '80', backgroundColor: item.isReceived ? C.gold + '15' : C.blue + '15', flex: 1.5 }]}
                onPress={() => handleToggleReceived(item)}
                activeOpacity={0.7}
              >
                <Text style={[s.soldActionBtnText, { color: item.isReceived ? C.gold : C.blue }]}>
                  {item.isReceived ? '⏳ 수령 대기로 변경' : '📦 수령 완료 처리'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.soldActionBtn, { borderColor: C.green + '80', backgroundColor: C.green + '15', flex: 1.5 }]}
                onPress={() => openSale(item)}
                activeOpacity={0.7}
              >
                <Text style={[s.soldActionBtnText, { color: C.green }]}>💰 판매 완료 처리</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.soldActionBtn, { borderColor: C.accent + '80', backgroundColor: C.accent + '15', flex: 1 }]}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <Text style={[s.soldActionBtnText, { color: C.accent }]}>✏️ 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.soldActionBtn, { borderColor: C.red + '80', backgroundColor: C.red + '15', flex: 1 }]}
                onPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <Text style={[s.soldActionBtnText, { color: C.red }]}>🗑 삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.screen}>
        <Text style={s.pageTitle}>📦 재고 목록 ({selling.length}개)</Text>
        {selling.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>🎉</Text>
            <Text style={s.emptyText}>재고가 모두 소진되었거나 없습니다.</Text>
          </View>
        ) : (
          <FlatList
            data={selling}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      {/* 판매 완료 처리 모달 */}
      <Modal visible={!!saleTarget} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                <Text style={s.modalTitle}>✅ 판매 완료 처리</Text>
                {saleTarget && (
                  <View style={s.modalItemSummary}>
                    <Text style={s.modalItemName}>{saleTarget.name}</Text>
                    <Text style={s.modalItemCost}>총 원가 (KRW): {fmt(cost(saleTarget))}</Text>
                    {(saleTarget.buyCurrency || 'KRW') === 'USD' && (
                      <Text style={[s.modalItemCost, { color: C.textMuted, fontSize: 12, marginTop: 2 }]}>
                        💱 매입가 ${saleTarget.buyPrice} × {USD_TO_KRW.toLocaleString('ko-KR')}원 환산 적용
                      </Text>
                    )}
                  </View>
                )}

                <Text style={s.sectionTitle}>판매 정보</Text>
                <Field label="판매 날짜" value={saleForm.soldDate} onChangeText={(v) => setF('soldDate', v)} placeholder="YYYY-MM-DD" />
                <DropPicker
                  label="판매처"
                  value={saleForm.soldVia}
                  onChange={(v) => setF('soldVia', v)}
                  options={SELL_VIA_OPTIONS}
                  placeholder="판매처 선택"
                />
                <PriceField
                  label="판매가"
                  rawValue={saleForm.soldPrice}
                  currency={saleForm.soldCurrency}
                  onChangeRaw={(v) => setF('soldPrice', v)}
                  onChangeCurrency={(c) => setF('soldCurrency', c)}
                  required
                />

                {/* 수익 미리보기 (같은 통화일 때만 표시) */}
                {saleTarget && saleForm.soldPrice && saleForm.soldCurrency === (saleTarget.buyCurrency || 'KRW') ? (
                  <View style={s.profitPreview}>
                    <Text style={s.profitLabel}>예상 수익</Text>
                    <Text style={[s.profitValue, {
                      color: (Number(saleForm.soldPrice) - cost(saleTarget)) >= 0 ? C.green : C.red
                    }]}>
                      {fmt(Number(saleForm.soldPrice) - cost(saleTarget), saleForm.soldCurrency)}
                    </Text>
                  </View>
                ) : null}

                <Text style={[s.sectionTitle, { marginTop: 16 }]}>배송 정보</Text>
                <Field label="받는 사람" value={saleForm.deliveryName} onChangeText={(v) => setF('deliveryName', v)} placeholder="홍길동" />
                <Field label="주소" value={saleForm.deliveryAddr} onChangeText={(v) => setF('deliveryAddr', v)} placeholder="서울시 강남구..." multiline />
                <Field label="연락처" value={saleForm.deliveryPhone} onChangeText={(v) => setF('deliveryPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
                <Field label="운송장 번호" value={saleForm.trackingNum} onChangeText={(v) => setF('trackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />

                <View style={s.modalBtnRow}>
                  <Btn label="취소" onPress={() => setSaleTarget(null)} variant="ghost" style={{ flex: 1, marginRight: 8 }} />
                  <Btn label="✅ 판매 완료" onPress={handleSold} variant="green" style={{ flex: 2 }} />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* 수정 모달 */}
      <Modal visible={!!editTarget} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                <Text style={s.modalTitle}>✏️ 상품 정보 수정</Text>
                {editTarget && (
                  <View style={s.modalItemSummary}>
                    <Text style={s.modalItemName}>{editTarget.name}</Text>
                    <Text style={s.modalItemCost}>총 원가: {fmt(cost(editTarget))}</Text>
                  </View>
                )}

                <Text style={s.sectionTitle}>기본 정보</Text>
                <Field label="구매 날짜" value={editForm.buyDate} onChangeText={(v) => setEF('buyDate', v)} placeholder="YYYY-MM-DD" />
                <Field label="상품명 *" value={editForm.name} onChangeText={(v) => setEF('name', v)} placeholder="예: 리바이스 501 청바지" />
                <DropPicker
                  label="구매처"
                  value={editForm.buyFrom}
                  onChange={(v) => setEF('buyFrom', v)}
                  options={BUY_FROM_OPTIONS}
                  placeholder="구매처 선택"
                />
                <PriceField
                  label="매입가"
                  rawValue={editForm.buyPrice}
                  currency={editForm.buyCurrency || 'KRW'}
                  onChangeRaw={(v) => setEF('buyPrice', v)}
                  onChangeCurrency={(c) => setEF('buyCurrency', c)}
                  required
                />
                <CategoryPicker value={editForm.category} onChange={(v) => setEF('category', v)} />

                <Text style={s.sectionTitle}>추가 비용 (KRW)</Text>
                <Field label="세탁비 (원)" value={fmtInput(editForm.costWash || '', 'KRW')} onChangeText={(v) => setEF('costWash', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                <Field label="수선비 (원)" value={fmtInput(editForm.costRepair || '', 'KRW')} onChangeText={(v) => setEF('costRepair', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                <Field label="택배비 (원)" value={fmtInput(editForm.costShip || '', 'KRW')} onChangeText={(v) => setEF('costShip', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                {(editForm.buyFrom === 'ebay' || editForm.buyFrom === 'Grailed') && (
                  <Field label="관세 (원)" value={fmtInput(editForm.costDuty || '', 'KRW')} onChangeText={(v) => setEF('costDuty', stripCommas(v))} keyboardType="numeric" placeholder="0" />
                )}

                <Text style={[s.sectionTitle, { marginTop: 16 }]}>구매 배송 및 판매자 정보</Text>
                <Field label="판매자 이름" value={editForm.sellerName} onChangeText={(v) => setEF('sellerName', v)} placeholder="예: 김철수" />
                <Field label="판매자 연락처" value={editForm.sellerPhone} onChangeText={(v) => setEF('sellerPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
                <Field label="매입 운송장 번호" value={editForm.sellerTrackingNum} onChangeText={(v) => setEF('sellerTrackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />
                <View style={s.fieldWrap}>
                  <Label>수령 상태</Label>
                  <View style={s.chipRow}>
                    <TouchableOpacity
                      style={[s.chip, !editForm.isReceived && s.chipActive]}
                      onPress={() => setEF('isReceived', false)}
                    >
                      <Text style={[s.chipText, !editForm.isReceived && s.chipTextActive]}>⏳ 수령 대기</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.chip, editForm.isReceived && s.chipActive]}
                      onPress={() => setEF('isReceived', true)}
                    >
                      <Text style={[s.chipText, editForm.isReceived && s.chipTextActive]}>📦 수령 완료</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.modalBtnRow}>
                  <Btn label="취소" onPress={() => setEditTarget(null)} variant="ghost" style={{ flex: 1, marginRight: 8 }} />
                  <Btn label="💾 저장" onPress={handleEditSave} variant="primary" style={{ flex: 2 }} />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>

      {/* 인앱 확인 모달 */}
      <Modal visible={!!confirm} animationType="fade" transparent>
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>{confirm?.title}</Text>
            <Text style={s.confirmMsg}>{confirm?.message}</Text>
            <View style={s.confirmBtnRow}>
              <TouchableOpacity
                style={[s.confirmBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={() => setConfirm(null)}
              >
                <Text style={[s.confirmBtnText, { color: C.textSec }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: confirm?.okColor + '20', borderColor: confirm?.okColor + '80' }]}
                onPress={confirm?.onOk}
              >
                <Text style={[s.confirmBtnText, { color: confirm?.okColor }]}>{confirm?.okLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
//  화면 4: 판매 완료
// ──────────────────────────────────────────────
function SoldScreen({ items, onUpdate, onDelete }) {
  const sold = useMemo(() =>
    items.filter((i) => i.status === 'sold')
      .sort((a, b) => new Date(b.soldDate) - new Date(a.soldDate)),
    [items]
  );

  const [expanded, setExpanded] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  // 인앱 확인 모달 (Alert.alert 대체 — 웹/네이티브 호환)
  const [confirm, setConfirm] = useState(null); // { title, message, onOk }

  const cost = (item) => calcCostKRW(item);
  const profit = (item) => toKRW(item.soldPrice, item.soldCurrency || 'KRW') - cost(item);

  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      soldDate: item.soldDate || '',
      soldVia: item.soldVia || '',
      soldPrice: item.soldPrice || '',
      soldCurrency: item.soldCurrency || 'KRW',
      deliveryName: item.deliveryName || '',
      deliveryAddr: item.deliveryAddr || '',
      deliveryPhone: item.deliveryPhone || '',
      trackingNum: item.trackingNum || '',
      sellerName: item.sellerName || '',
      sellerPhone: item.sellerPhone || '',
      sellerTrackingNum: item.sellerTrackingNum || '',
      isReceived: !!item.isReceived,
      costDuty: item.costDuty || '',
    });
  };

  const setEF = (key, val) => setEditForm((p) => ({ ...p, [key]: val }));

  // ── 수정 저장
  const handleEditSave = async () => {
    if (!editForm.soldPrice) { Alert.alert('⚠️', '판매가를 입력해주세요.'); return; }
    const updated = { ...editTarget, ...editForm };
    await onUpdate(updated);
    setEditTarget(null);
    setExpanded(null);
    Alert.alert('✅', '수정이 완료됐어요!');
  };

  // ── 판매중으로 되돌리기
  const handleRevert = (item) => {
    setConfirm({
      title: '판매중으로 되돌리기',
      message: `"​${item.name}"을(를) 판매중 상태로 \n되돌릴까요? 판매/배송 \n정보가 초기화됩니다.`,
      okLabel: '↩️ 되돌리기',
      okColor: C.gold,
      onOk: async () => {
        const reverted = {
          ...item,
          status: 'selling',
          soldDate: '', soldVia: '', soldPrice: '', soldCurrency: 'KRW',
          deliveryName: '', deliveryAddr: '', deliveryPhone: '', trackingNum: '',
        };
        await onUpdate(reverted);
        setExpanded(null);
        setConfirm(null);
      },
    });
  };

  // ── 삭제
  const handleDelete = (item) => {
    setConfirm({
      title: '삭제 확인',
      message: `"​${item.name}"을(를) \n영구 삭제할까요? \n되돌릴 수 없어요.`,
      okLabel: '🗑 삭제',
      okColor: C.red,
      onOk: () => {
        onDelete(item.id);
        setExpanded(null);
        setConfirm(null);
      },
    });
  };

  const renderItem = ({ item }) => {
    const isOpen = expanded === item.id;
    const p = profit(item);
    const soldCurr = item.soldCurrency || 'KRW';
    const buyCurr = item.buyCurrency || 'KRW';
    return (
      // ★ 외부 wrapper는 View — 버튼 이벤트가 부모 TouchableOpacity로 전파되지 않게 분리
      <View style={s.itemCard}>
        {/* 터치 가능한 요약 영역 */}
        <TouchableOpacity
          onPress={() => setExpanded(isOpen ? null : item.id)}
          activeOpacity={0.85}
        >
          <View style={s.itemCardTop}>
            <View style={[s.categoryBadge, { backgroundColor: C.green + '20', borderColor: C.green + '60' }]}>
              <Text style={[s.categoryBadgeText, { color: C.green }]}>{item.category || '기타'}</Text>
            </View>
            <Text style={s.itemCardDate}>{item.soldDate}</Text>
          </View>
          <Text style={s.itemCardName} numberOfLines={1}>{item.name}</Text>
          <View style={s.itemCardBottom}>
            <View>
              <Text style={s.itemCardSub}>판매처: {item.soldVia || '-'}</Text>
              <Text style={s.itemCardSub}>판매가: {fmt(item.soldPrice, soldCurr)}</Text>
            </View>
            <Text style={[s.profitChip, { color: p >= 0 ? C.green : C.red, borderColor: p >= 0 ? C.green + '50' : C.red + '50' }]}>
              {p >= 0 ? '▲' : '▼'} {fmt(Math.abs(p), soldCurr)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 확장 영역 — TouchableOpacity 밖에 위치 */}
        {isOpen && (
          <View style={s.expandedBox}>
            <Text style={s.expandedTitle}>📬 배송 정보</Text>
            <InfoRow label="받는 사람" value={item.deliveryName} />
            <InfoRow label="주소" value={item.deliveryAddr} />
            <InfoRow label="연락처" value={item.deliveryPhone} />
            <InfoRow label="운송장" value={item.trackingNum} />
            <Text style={[s.expandedTitle, { marginTop: 12 }]}>🛍️ 구매 & 판매자 정보</Text>
            <InfoRow label="판매자 이름" value={item.sellerName} />
            <InfoRow label="판매자 연락처" value={item.sellerPhone} />
            <InfoRow label="매입 운송장" value={item.sellerTrackingNum} />
            <InfoRow label="수령 여부" value={item.isReceived ? '📦 수령 완료' : '⏳ 수령 대기'} valueColor={item.isReceived ? C.blue : C.gold} />
            {Number(item.costDuty) > 0 ? (
              <InfoRow label="관세" value={fmt(item.costDuty)} />
            ) : null}
            <Text style={[s.expandedTitle, { marginTop: 12 }]}>💸 수익 분석</Text>
            <InfoRow label="총 원가" value={fmt(cost(item), buyCurr)} />
            <InfoRow label="판매가" value={fmt(item.soldPrice, soldCurr)} />
            <InfoRow label="순수익" value={fmt(p, soldCurr)} valueColor={p >= 0 ? C.green : C.red} />

            {/* ★ 액션 버튼 — View 안에서 독립적으로 동작 */}
            <View style={s.soldActionRow}>
              <TouchableOpacity
                style={[s.soldActionBtn, { borderColor: C.accent + '80', backgroundColor: C.accent + '15' }]}
                onPress={() => openEdit(item)}
                activeOpacity={0.7}
              >
                <Text style={[s.soldActionBtnText, { color: C.accent }]}>✏️ 수정</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.soldActionBtn, { borderColor: C.gold + '80', backgroundColor: C.gold + '15' }]}
                onPress={() => handleRevert(item)}
                activeOpacity={0.7}
              >
                <Text style={[s.soldActionBtnText, { color: C.gold }]}>↩️ 되돌리기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.soldActionBtn, { borderColor: C.red + '80', backgroundColor: C.red + '15' }]}
                onPress={() => handleDelete(item)}
                activeOpacity={0.7}
              >
                <Text style={[s.soldActionBtnText, { color: C.red }]}>🗑 삭제</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={s.safeArea}>
      <View style={s.screen}>
        <Text style={s.pageTitle}>🏷️ 판매 완료 ({sold.length}개)</Text>
        {sold.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyEmoji}>📭</Text>
            <Text style={s.emptyText}>아직 판매 완료된 상품이 없어요.</Text>
          </View>
        ) : (
          <FlatList
            data={sold}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        )}
      </View>

      {/* 인앱 확인 모달 */}
      <Modal visible={!!confirm} animationType="fade" transparent>
        <View style={s.confirmOverlay}>
          <View style={s.confirmBox}>
            <Text style={s.confirmTitle}>{confirm?.title}</Text>
            <Text style={s.confirmMsg}>{confirm?.message}</Text>
            <View style={s.confirmBtnRow}>
              <TouchableOpacity
                style={[s.confirmBtn, { borderColor: C.border, backgroundColor: C.surface }]}
                onPress={() => setConfirm(null)}
              >
                <Text style={[s.confirmBtnText, { color: C.textSec }]}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, { backgroundColor: confirm?.okColor + '20', borderColor: confirm?.okColor + '80' }]}
                onPress={confirm?.onOk}
              >
                <Text style={[s.confirmBtnText, { color: confirm?.okColor }]}>{confirm?.okLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 수정 모달 */}
      <Modal visible={!!editTarget} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                <Text style={s.modalTitle}>✏️ 판매 정보 수정</Text>
                {editTarget && (
                  <View style={s.modalItemSummary}>
                    <Text style={s.modalItemName}>{editTarget.name}</Text>
                    <Text style={s.modalItemCost}>총 원가: {fmt(cost(editTarget))}</Text>
                  </View>
                )}

                <Text style={s.sectionTitle}>판매 정보</Text>
                <Field label="판매 날짜" value={editForm.soldDate} onChangeText={(v) => setEF('soldDate', v)} placeholder="YYYY-MM-DD" />
                <DropPicker
                  label="판매처"
                  value={editForm.soldVia}
                  onChange={(v) => setEF('soldVia', v)}
                  options={SELL_VIA_OPTIONS}
                  placeholder="판매처 선택"
                />
                <PriceField
                  label="판매가"
                  rawValue={editForm.soldPrice}
                  currency={editForm.soldCurrency || 'KRW'}
                  onChangeRaw={(v) => setEF('soldPrice', v)}
                  onChangeCurrency={(c) => setEF('soldCurrency', c)}
                  required
                />

                {/* 수정 후 수익 미리보기 */}
                {editTarget && editForm.soldPrice ? (
                  <View style={s.profitPreview}>
                    <Text style={s.profitLabel}>수정 후 순수익</Text>
                    <Text style={[s.profitValue, {
                      color: (Number(editForm.soldPrice) - cost(editTarget)) >= 0 ? C.green : C.red
                    }]}>
                      {fmt(Number(editForm.soldPrice) - cost(editTarget), editForm.soldCurrency || 'KRW')}
                    </Text>
                  </View>
                ) : null}

                <Text style={[s.sectionTitle, { marginTop: 16 }]}>배송 정보</Text>
                <Field label="받는 사람" value={editForm.deliveryName} onChangeText={(v) => setEF('deliveryName', v)} placeholder="홍길동" />
                <Field label="주소" value={editForm.deliveryAddr} onChangeText={(v) => setEF('deliveryAddr', v)} placeholder="서울시 강남구..." multiline />
                <Field label="연락처" value={editForm.deliveryPhone} onChangeText={(v) => setEF('deliveryPhone', v)} keyboardType="phone-pad" placeholder="010-0000-0000" />
                <Field label="운송장 번호" value={editForm.trackingNum} onChangeText={(v) => setEF('trackingNum', v)} keyboardType="numeric" placeholder="1234567890123" />

                <View style={s.modalBtnRow}>
                  <Btn label="취소" onPress={() => setEditTarget(null)} variant="ghost" style={{ flex: 1, marginRight: 8 }} />
                  <Btn label="💾 저장" onPress={handleEditSave} variant="primary" style={{ flex: 2 }} />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const InfoRow = ({ label, value, valueColor }) => (
  <View style={s.infoRow}>
    <Text style={s.infoLabel}>{label}</Text>
    <Text style={[s.infoValue, valueColor && { color: valueColor }]} numberOfLines={2}>
      {value || '-'}
    </Text>
  </View>
);

// ──────────────────────────────────────────────
//  하단 탭 바
// ──────────────────────────────────────────────
const TABS = [
  { key: 'dashboard', label: '대시보드', emoji: '📊' },
  { key: 'add', label: '등록', emoji: '➕' },
  { key: 'inventory', label: '재고', emoji: '📦' },
  { key: 'sold', label: '판매완료', emoji: '🏷️' },
];

function TabBar({ active, onSelect }) {
  return (
    <View style={s.tabBar}>
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={s.tabItem}
            onPress={() => onSelect(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabEmoji, isActive && s.tabEmojiActive]}>{t.emoji}</Text>
            <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{t.label}</Text>
            {isActive && <View style={s.tabDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ──────────────────────────────────────────────
//  App 루트
// ──────────────────────────────────────────────
export default function App() {
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [ready, setReady] = useState(false);

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

  // 로드
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/items`);
        if (!response.ok) throw new Error('API server returned error');
        const data = await response.json();
        if (Array.isArray(data)) {
          setItems(data);
        }
      } catch (e) {
        console.warn('백엔드 데이터 로드 실패, 로컬 저장소 시도합니다...', e);
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const hydrated = parsed.map(item => ({
                id: item.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: item.name || '',
                category: item.category || '기타',
                status: item.status || 'selling',
                buyPrice: item.buyPrice || '',
                buyCurrency: item.buyCurrency || 'KRW',
                soldPrice: item.soldPrice || '',
                soldCurrency: item.soldCurrency || 'KRW',
                isReceived: item.isReceived !== undefined ? item.isReceived : true,
                ...item
              }));
              setItems(hydrated);
            }
          }
        } catch (localErr) {
          console.warn('로컬 로드 실패', localErr);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // 저장 (items 변경 시 로컬 백업)
  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)).catch(console.warn);
  }, [items, ready]);

  const addItem = useCallback(async (item) => {
    try {
      const response = await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error('Failed to add item to backend');
      const savedItem = await response.json();
      setItems((prev) => [savedItem, ...prev]);
    } catch (e) {
      console.warn('백엔드 추가 실패, 로컬 상태만 우선 반영합니다.', e);
      setItems((prev) => [item, ...prev]);
    }
    setActiveTab('inventory');
  }, [setActiveTab]);

  const updateItem = useCallback(async (updated) => {
    try {
      const response = await fetch(`${API_URL}/api/items/${updated.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!response.ok) throw new Error('Failed to update item on backend');
      const savedItem = await response.json();
      setItems((prev) => prev.map((i) => (i.id === savedItem.id ? savedItem : i)));
    } catch (e) {
      console.warn('백엔드 업데이트 실패, 로컬 상태만 우선 반영합니다.', e);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    }
  }, []);

  const deleteItem = useCallback(async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/items/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete item on backend');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.warn('백엔드 삭제 실패, 로컬 상태만 우선 반영합니다.', e);
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }, []);


  if (!ready) {
    return (
      <View style={s.loadingScreen}>
        <Text style={s.loadingText}>📖 Off the Books</Text>
        <Text style={s.loadingSub}>불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' && <DashboardScreen items={items} />}
        {activeTab === 'add' && <AddItemScreen onAdd={addItem} />}
        {activeTab === 'inventory' && <InventoryScreen items={items} onUpdate={updateItem} onDelete={deleteItem} />}
        {activeTab === 'sold' && <SoldScreen items={items} onUpdate={updateItem} onDelete={deleteItem} />}
      </View>
      <TabBar active={activeTab} onSelect={setActiveTab} />
    </View>
  );
}

// ──────────────────────────────────────────────
//  스타일시트
// ──────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safeArea: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  // 로딩
  loadingScreen: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: C.accent, fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  loadingSub: { color: C.textMuted, fontSize: 14, marginTop: 8 },

  // 대시보드
  dashHeader: { paddingVertical: 20, alignItems: 'center' },
  dashBrand: { color: C.textPri, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  dashMonth: { color: C.textSec, fontSize: 13, marginTop: 4 },

  statCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  statEmoji: { fontSize: 28, marginBottom: 6 },
  statLabel: { color: C.textSec, fontSize: 13, marginBottom: 4 },
  statValue: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },

  badgeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  badge: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.accent + '55',
    paddingVertical: 14,
    alignItems: 'center',
  },
  badgeNum: { color: C.accent, fontSize: 28, fontWeight: '800' },
  badgeLabel: { color: C.textSec, fontSize: 12, marginTop: 2 },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  recentName: { color: C.textPri, fontSize: 14, fontWeight: '600' },
  recentSub: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  recentPrice: { fontSize: 15, fontWeight: '700' },

  // 섹션
  section: { marginBottom: 20 },
  sectionTitle: { color: C.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },

  // 폼
  pageTitle: { color: C.textPri, fontSize: 22, fontWeight: '800', marginTop: 16, marginBottom: 20 },
  label: { color: C.textSec, fontSize: 12, fontWeight: '600', marginBottom: 4, letterSpacing: 0.5 },
  fieldWrap: { marginBottom: 14 },
  input: {
    backgroundColor: C.surface,
    color: C.textPri,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },

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

  // PriceField — KRW/USD 토글 + 콤마 입력
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  currencyToggle: {
    width: 36, height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyToggleActive: { backgroundColor: C.accentDim, borderColor: C.accent },
  currencyToggleActiveUSD: { backgroundColor: '#166534', borderColor: '#4ade80' },
  currencyToggleText: { color: C.textMuted, fontSize: 14, fontWeight: '700' },
  currencyToggleTextActive: { color: C.white },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 42,
  },
  pricePrefix: { color: C.textSec, fontSize: 15, marginRight: 2 },
  priceInput: { flex: 1, color: C.textPri, fontSize: 15 },
  priceSuffix: { color: C.textMuted, fontSize: 13, marginLeft: 2 },

  // USD 환율 안내 배너
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

  // 버튼
  btn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnText: { fontSize: 15, fontWeight: '700' },

  // 아이템 카드
  itemCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 10,
  },
  itemCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  categoryBadge: {
    backgroundColor: C.accent + '20',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: C.accent + '60',
  },
  categoryBadgeText: { color: C.accent, fontSize: 11, fontWeight: '700' },
  itemCardDate: { color: C.textMuted, fontSize: 12 },
  itemCardName: { color: C.textPri, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  itemCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  itemCardSub: { color: C.textSec, fontSize: 12 },

  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },

  profitChip: {
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  // 확장 박스
  expandedBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  expandedTitle: { color: C.accent, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { color: C.textMuted, fontSize: 12, flex: 1 },
  infoValue: { color: C.textPri, fontSize: 12, flex: 2, textAlign: 'right' },

  // 수익 미리보기 (모달 내부)
  profitPreview: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  profitLabel: { color: C.textSec, fontSize: 13 },
  profitValue: { fontSize: 18, fontWeight: '800' },

  // 모달
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: { color: C.textPri, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  modalItemSummary: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalItemName: { color: C.textPri, fontSize: 15, fontWeight: '700' },
  modalItemCost: { color: C.gold, fontSize: 13, marginTop: 2 },
  modalBtnRow: { flexDirection: 'row', marginTop: 16 },

  // 빈 상태
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText: { color: C.textSec, fontSize: 16, fontWeight: '600' },
  emptyHint: { color: C.textMuted, fontSize: 13, marginTop: 6 },

  // 판매 완료 액션 버튼
  soldActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  soldActionBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  soldActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // 인앱 확인 모달
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  confirmBox: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: C.border,
  },
  confirmTitle: { color: C.textPri, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  confirmMsg: { color: C.textSec, fontSize: 14, lineHeight: 22, marginBottom: 20 },
  confirmBtnRow: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700' },

  // 드롭다운 픽커
  dropBtn: {
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropBtnText: {
    color: C.textPri,
    fontSize: 15,
  },
  dropBtnPlaceholder: {
    color: C.textMuted,
    fontSize: 15,
  },
  dropArrow: {
    color: C.textSec,
    fontSize: 14,
  },
  dropList: {
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 6,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border + '33',
  },
  dropItemActive: {
    backgroundColor: C.surface,
  },
  dropItemText: {
    color: C.textPri,
    fontSize: 14,
  },
  dropItemTextActive: {
    color: C.accent,
    fontWeight: '700',
  },

  // 탭 바
  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 10,
  },
  tabItem: { flex: 1, alignItems: 'center', position: 'relative' },
  tabEmoji: { fontSize: 20, opacity: 0.5 },
  tabEmojiActive: { opacity: 1 },
  tabLabel: { color: C.textMuted, fontSize: 11, marginTop: 3 },
  tabLabelActive: { color: C.accent, fontWeight: '700' },
  tabDot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: C.accent,
    position: 'absolute',
    bottom: -2,
  },
});
